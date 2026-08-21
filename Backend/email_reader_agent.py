"""Read-only Gmail inbox agent using the connected user's Google OAuth token."""
import base64
import email
import os
from email.header import decode_header
from email.message import Message
from typing import Any, Dict, List

from google import genai
from google.genai import types
from googleapiclient.discovery import build

from google_oauth import get_credentials

try:
    from logger import logger
except ImportError:  # pragma: no cover
    import logging
    logger = logging.getLogger(__name__)


class EmailReaderAgent:
    @staticmethod
    def _decode(value: str | None) -> str:
        if not value:
            return ""
        output = []
        for part, encoding in decode_header(value):
            if isinstance(part, bytes):
                output.append(part.decode(encoding or "utf-8", errors="replace"))
            else:
                output.append(str(part))
        return "".join(output).strip()

    @staticmethod
    def _body_from_payload(payload: dict) -> str:
        parts = payload.get("parts") or []
        if parts:
            texts = []
            for part in parts:
                mime = part.get("mimeType", "")
                if mime == "text/plain":
                    data = (part.get("body") or {}).get("data")
                    if data:
                        texts.append(base64.urlsafe_b64decode(data.encode()).decode("utf-8", errors="replace"))
                elif mime.startswith("multipart/"):
                    nested = EmailReaderAgent._body_from_payload(part)
                    if nested:
                        texts.append(nested)
            if texts:
                return "\n".join(texts).strip()
        data = (payload.get("body") or {}).get("data")
        if data:
            return base64.urlsafe_b64decode(data.encode()).decode("utf-8", errors="replace").strip()
        return ""

    def list_emails(self, user_email: str, limit: int = 10, unread_only: bool = False) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit), 50))
        try:
            service = build("gmail", "v1", credentials=get_credentials(user_email, "gmail"), cache_discovery=False)
            query = "is:unread" if unread_only else None
            result = service.users().messages().list(userId="me", maxResults=limit, q=query).execute()
            messages = []
            for item in result.get("messages", []):
                full = service.users().messages().get(userId="me", id=item["id"], format="full").execute()
                headers = {h.get("name", "").lower(): self._decode(h.get("value")) for h in full.get("payload", {}).get("headers", [])}
                messages.append({
                    "id": item["id"],
                    "from": headers.get("from", ""), "to": headers.get("to", ""),
                    "subject": headers.get("subject", ""), "date": headers.get("date", ""),
                    "body": self._body_from_payload(full.get("payload", {}))[:12000],
                })
            return messages
        except Exception as exc:
            logger.exception("Gmail inbox read failed")
            raise RuntimeError(f"Could not read Gmail: {exc}") from exc

    def answer_question(self, user_email: str, question: str, limit: int = 10) -> Dict[str, Any]:
        question = (question or "").strip()
        if not question:
            raise ValueError("Email question is required.")
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        messages = self.list_emails(user_email, limit=limit)
        if not messages:
            return {"answer": "I could not find any emails in the inbox.", "emails": []}
        context = "\n\n---\n\n".join(
            f"EMAIL {i}\nFrom: {m['from']}\nTo: {m['to']}\nDate: {m['date']}\nSubject: {m['subject']}\nBody:\n{m['body']}"
            for i, m in enumerate(messages, 1)
        )
        prompt = (
            "Answer the user's question using only the email records below. "
            "Never invent email facts. If the records do not contain the answer, say so. "
            "Keep the answer professional and concise.\n\n"
            f"USER QUESTION:\n{question}\n\nEMAIL RECORDS:\n{context}"
        )
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=os.getenv("EMAIL_READER_MODEL", "gemini-3.5-flash-lite"),
                contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            )
            answer = (response.text or "").strip()
            if not answer:
                raise RuntimeError("The AI returned an empty email answer.")
            return {"answer": answer, "emails": messages}
        except Exception as exc:
            logger.exception("Email question answering failed")
            raise RuntimeError(f"Could not analyze emails: {exc}") from exc
