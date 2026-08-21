# Google OAuth setup for Apex Capital Bank

## What changed

The Apex login email/password remains the application's login. Gmail and Google Calendar are now connected separately through Google OAuth. Each connection is stored against the Apex user's email in SQLite, so users no longer share the developer's Gmail address or app password.

## Google Cloud Console

1. Create/select a Google Cloud project.
2. Enable **Gmail API** and **Google Calendar API**.
3. Configure the OAuth consent screen.
4. Create an OAuth 2.0 Client ID of type **Web application**.
5. Add these authorized redirect URIs:
   - `http://127.0.0.1:8000/api/google/callback` for local testing.
   - Your deployed backend callback URL for production, e.g. `https://YOUR-DOMAIN/api/google/callback`.
6. Put the client ID and secret in `Backend/.env` using the variables in `.env.example`.

## Run locally

Backend:

```powershell
cd Backend
uvicorn main:app --reload
```

Frontend:

```powershell
cd Frontend
npm run dev
```

Open the frontend, log in to Apex, open **Email Agent** or **Email Reader**, and click **Connect Google**. For Calendar, open **Calendar Agent** and connect Google Calendar.

## Important

Do not commit `credentials.json`, `token.json`, `.env`, or OAuth tokens. The new implementation encrypts refresh tokens before saving them in SQLite.

For a Vercel deployment, SQLite is not a durable multi-user database. Use a persistent PostgreSQL/Neon database for production Google connection records; the same OAuth design can use that database without changing the user flow.
