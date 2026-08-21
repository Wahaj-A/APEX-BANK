# AI Calendar Agent — Added Without Removing Existing Calendar Features

This project keeps the existing Google Calendar functionality and adds a natural-language Calendar Agent on top of it.

## Existing functionality preserved

- Google OAuth connection/disconnection for Calendar.
- Per-user encrypted Google credentials in `google_connections`.
- `GET /api/calendar/events` for upcoming events.
- `POST /api/calendar/events` for direct/manual event creation.
- Existing manual Calendar form in the frontend.
- Existing banking, weather, crypto, email, web-search, image, and email-reader agents.

## New functionality

- `POST /api/calendar/ask`.
- Gemini-powered natural-language Calendar Agent.
- Reads upcoming Calendar events when the prompt asks for them.
- Creates Calendar events when the prompt is clear and actionable.
- Understands relative dates such as today/tomorrow using the server's current date/time.
- Defaults to `Asia/Karachi`.
- Uses the logged-in user's existing Google Calendar connection.
- Checks upcoming events before AI-created events and refuses an overlapping booking instead of silently double-booking.
- Keeps a conversational history in the Calendar UI.

## Example prompts

```text
Schedule a project meeting with Ahmed tomorrow at 3 PM for one hour.
```

```text
What meetings do I have coming up?
```

```text
Create a meeting called Client Review on Monday at 11 AM for 45 minutes at the HBL office.
```

If the date/time is genuinely missing or ambiguous, the agent asks for clarification instead of inventing it.

## Files changed

### Backend/calendar_agent.py

The original `upcoming_events()` and `create_event()` methods remain. AI tool functions and `ask()` were added around them.

### Backend/main.py

The existing Calendar endpoints remain. A new endpoint was added:

```text
POST /api/calendar/ask
```

Request body:

```json
{
  "user_text": "Schedule a meeting tomorrow at 3 PM for one hour",
  "history": [],
  "user_email": "your-login-email@example.com"
}
```

### Frontend/src/api.js

Added `api.askCalendarAgent(...)`. Existing Calendar API functions remain unchanged.

### Frontend/src/App.jsx

The Calendar page now contains:

1. AI Calendar chat.
2. Existing upcoming-events view.
3. Existing manual event creation form.
4. Existing Google Calendar connection card.

## Configuration

The existing `GEMINI_API_KEY` is used. No API key is hardcoded.

The existing Google OAuth configuration is also used. Do not create a second OAuth/token system.

## Run backend

From `Backend`:

```powershell
python -m uvicorn main:app --reload --port 8000
```

## Run frontend

From `Frontend`:

```powershell
npm install
npm run dev
```

## Important

The Calendar Agent requires the Apex user to exist in the same `banking.db` used by the running backend and requires that user to connect Google Calendar through the existing Google connection flow.
