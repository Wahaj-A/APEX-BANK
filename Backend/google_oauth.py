"""Per-user Google OAuth storage for Gmail and Google Calendar.

Apex login identity remains separate from Google identity. Each Apex user can
connect their own Gmail and/or Calendar account. OAuth refresh tokens are
stored encrypted in the existing SQLite database instead of in a shared
credentials/token file.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from bank_logic import get_connection

# `create_authorization_url()` below passes include_granted_scopes="true" so
# Google does incremental auth (a user who already connected Gmail doesn't
# have to re-approve those scopes when connecting Calendar, and vice versa).
# The side effect: Google's token response then legitimately contains the
# UNION of scopes across both providers, not just the ones this particular
# request asked for. oauthlib treats any requested-vs-granted scope mismatch
# as fatal by default and raises ("Scope has changed from ... to ..."), even
# though a superset of granted scopes is the intended, desired outcome here -
# not a security problem. This has to be set before fetch_token() runs.
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

try:
    from logger import logger
except ImportError:  # pragma: no cover
    import logging
    logger = logging.getLogger(__name__)


PROVIDER_SCOPES = {
    "gmail": [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
    ],
    "calendar": [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar",
    ],
}


def _validate_provider(provider: str) -> str:
    provider = (provider or "").strip().lower()
    if provider not in PROVIDER_SCOPES:
        raise ValueError("Unsupported Google service. Use gmail or calendar.")
    return provider


def _client_config() -> dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if client_id and client_secret:
        return {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            }
        }

    raw = os.getenv("GOOGLE_CLIENT_SECRETS_JSON")
    if raw:
        try:
            value = json.loads(raw)
            if "installed" in value and "web" not in value:
                value["web"] = value.pop("installed")
            return value
        except json.JSONDecodeError as exc:
            raise RuntimeError("GOOGLE_CLIENT_SECRETS_JSON is not valid JSON.") from exc

    base = Path(__file__).resolve().parent
    path = Path(os.getenv("GOOGLE_CLIENT_SECRETS_FILE", str(base / "credentials.json")))
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    raise RuntimeError(
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and "
        "GOOGLE_CLIENT_SECRET (recommended), or provide credentials.json locally."
    )


def _redirect_uri() -> str:
    value = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if not value:
        raise RuntimeError(
            "GOOGLE_REDIRECT_URI is not configured. Example: "
            "http://127.0.0.1:8000/api/google/callback"
        )
    return value


def _fernet() -> Fernet:
    secret = os.getenv("GOOGLE_TOKEN_ENCRYPTION_KEY", "").strip()
    if secret:
        try:
            return Fernet(secret.encode())
        except Exception as exc:
            raise RuntimeError("GOOGLE_TOKEN_ENCRYPTION_KEY is not a valid Fernet key.") from exc

    # Stable local fallback derived from the Google client secret. For production,
    # set GOOGLE_TOKEN_ENCRYPTION_KEY explicitly and keep it secret.
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    if not client_secret:
        try:
            config = _client_config()
            client_secret = config.get("web", config.get("installed", {})).get("client_secret", "")
        except Exception:
            client_secret = ""
    if not client_secret:
        raise RuntimeError("Set GOOGLE_TOKEN_ENCRYPTION_KEY for encrypted Google token storage.")

    digest = hashlib.sha256(("apex-google-token:" + client_secret).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise RuntimeError("Stored Google connection could not be decrypted. Check the encryption key.") from exc


def create_authorization_url(user_email: str, provider: str) -> str:
    provider = _validate_provider(provider)
    user_email = (user_email or "").strip()
    if not user_email:
        raise ValueError("Apex user email is required.")

    conn = get_connection()
    user = conn.execute(
        "SELECT user_id, email FROM users WHERE LOWER(email) = LOWER(?)",
        (user_email,),
    ).fetchone()
    if not user:
        conn.close()
        raise ValueError("Apex user account was not found.")

    state = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).timestamp()

    # PKCE: Google enforces a code_verifier / code_challenge handshake for
    # this OAuth client (it was issued as a Desktop/installed-app client -
    # see GOOGLE_OAUTH_SETUP.md). The verifier has to survive from this
    # request all the way to the callback request below, which is a
    # separate HTTP request (and a separate Flow object) entirely, so it
    # can't just live on the Flow instance - it's persisted here next to
    # the OAuth state and re-attached to the callback's Flow instance in
    # finish_authorization().
    code_verifier = secrets.token_urlsafe(64)[:128]

    conn.execute(
        "DELETE FROM google_oauth_states WHERE created_at < ?",
        (now - 600,),
    )
    conn.execute(
        """
        INSERT INTO google_oauth_states
            (state, user_id, user_email, provider, created_at, code_verifier)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (state, user["user_id"], user["email"], provider, str(now), code_verifier),
    )
    conn.commit()
    conn.close()

    flow = Flow.from_client_config(
        _client_config(),
        scopes=PROVIDER_SCOPES[provider],
    )
    flow.redirect_uri = _redirect_uri()
    flow.code_verifier = code_verifier
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return authorization_url


def finish_authorization(code: str, state: str) -> dict[str, str]:
    if not code or not state:
        raise ValueError("Google OAuth callback is missing code or state.")

    conn = get_connection()
    row = conn.execute(
        """
        SELECT user_id, user_email, provider, code_verifier
        FROM google_oauth_states
        WHERE state = ?
        """,
        (state,),
    ).fetchone()

    # OAuth state is single-use.
    conn.execute("DELETE FROM google_oauth_states WHERE state = ?", (state,))
    conn.commit()
    conn.close()

    if not row:
        raise ValueError("Google OAuth state is invalid or expired. Please try again.")

    user_id = row["user_id"]
    user_email = row["user_email"]
    provider = _validate_provider(row["provider"])
    code_verifier = row["code_verifier"]

    if user_id is None:
        raise ValueError("OAuth session is not associated with a valid Apex user.")

    # Confirm that the user still exists before saving the Google connection.
    conn = get_connection()
    user = conn.execute(
        "SELECT user_id, email FROM users WHERE user_id = ? AND LOWER(email) = LOWER(?)",
        (user_id, user_email),
    ).fetchone()
    conn.close()
    if not user:
        raise ValueError("The Apex user associated with this OAuth session no longer exists.")

    flow = Flow.from_client_config(
        _client_config(),
        scopes=PROVIDER_SCOPES[provider],
    )
    flow.redirect_uri = _redirect_uri()
    # Re-attach the same PKCE verifier that was used to build the
    # authorization URL in create_authorization_url() - this is a brand
    # new Flow instance (a separate HTTP request), so without this Google
    # rejects the token exchange with "invalid_grant: Missing code verifier".
    if code_verifier:
        flow.code_verifier = code_verifier
    flow.fetch_token(code=code)
    credentials = flow.credentials

    if not credentials.valid and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

    userinfo = (
        build("oauth2", "v2", credentials=credentials, cache_discovery=False)
        .userinfo()
        .get()
        .execute()
    )
    google_email = (userinfo.get("email") or "").strip().lower()
    if not google_email:
        raise RuntimeError("Google did not return the connected account email.")

    encrypted = _encrypt(credentials.to_json())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.execute(
        """
        INSERT INTO google_connections
            (user_email, provider, google_email, token_encrypted, scopes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_email, provider) DO UPDATE SET
            google_email=excluded.google_email,
            token_encrypted=excluded.token_encrypted,
            scopes=excluded.scopes,
            updated_at=excluded.updated_at
        """,
        (
            user["email"],
            provider,
            google_email,
            encrypted,
            json.dumps(credentials.scopes or PROVIDER_SCOPES[provider]),
            now,
        ),
    )
    conn.commit()
    conn.close()

    logger.info("GOOGLE %s connected for Apex user %s", provider.upper(), user_id)
    return {
        "provider": provider,
        "user_id": str(user_id),
        "user_email": user["email"],
        "google_email": google_email,
    }

def get_connection_status(user_email: str, provider: str) -> dict[str, Any]:
    provider = _validate_provider(provider)
    conn = get_connection()
    row = conn.execute(
        "SELECT google_email, updated_at FROM google_connections WHERE LOWER(user_email) = LOWER(?) AND provider = ?",
        ((user_email or "").strip(), provider),
    ).fetchone()
    conn.close()
    return {
        "connected": bool(row),
        "provider": provider,
        "google_email": row["google_email"] if row else None,
        "updated_at": row["updated_at"] if row else None,
    }


def disconnect(user_email: str, provider: str) -> None:
    provider = _validate_provider(provider)
    conn = get_connection()
    conn.execute(
        "DELETE FROM google_connections WHERE LOWER(user_email) = LOWER(?) AND provider = ?",
        ((user_email or "").strip(), provider),
    )
    conn.commit()
    conn.close()
    logger.info("GOOGLE %s disconnected for Apex user", provider.upper())


def get_credentials(user_email: str, provider: str) -> Credentials:
    provider = _validate_provider(provider)
    conn = get_connection()
    row = conn.execute(
        "SELECT token_encrypted FROM google_connections WHERE LOWER(user_email) = LOWER(?) AND provider = ?",
        ((user_email or "").strip(), provider),
    ).fetchone()
    conn.close()

    if not row:
        raise RuntimeError(
            f"No Google {provider} account is connected. Click Connect Google first."
        )

    info = json.loads(_decrypt(row["token_encrypted"]))
    credentials = Credentials.from_authorized_user_info(info, PROVIDER_SCOPES[provider])
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        refreshed = _encrypt(credentials.to_json())
        conn = get_connection()
        conn.execute(
            "UPDATE google_connections SET token_encrypted = ?, scopes = ?, updated_at = ? WHERE LOWER(user_email) = LOWER(?) AND provider = ?",
            (refreshed, json.dumps(credentials.scopes or PROVIDER_SCOPES[provider]), datetime.now(timezone.utc).isoformat(),
             (user_email or "").strip(), provider),
        )
        conn.commit()
        conn.close()
    return credentials