"""Per-user Google Calendar agent.

The original direct Google Calendar methods are intentionally preserved.
This module adds an AI layer on top of them so a user can give a natural
-language instruction while the existing OAuth/database architecture remains
unchanged.
"""
import datetime as dt
import json
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from google import genai
from google.genai import types
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from google_oauth import get_credentials

try:
    from logger import logger
except ImportError:  # pragma: no cover
    import logging
    logger = logging.getLogger(__name__)


DEFAULT_TIMEZONE = "Asia/Karachi"


SYSTEM_INSTRUCTION = """
You are the Google Calendar Agent for Apex Capital Bank.

Your job is to follow the user's calendar instruction exactly and use the
connected Google Calendar belonging to the currently authenticated Apex user.

AVAILABLE ACTIONS
1. get_upcoming_events - read upcoming events from the user's primary calendar.
2. create_calendar_event - create an event in that same calendar.

RULES
- Only operate on the authenticated user's own connected Google Calendar.
- Never expose OAuth tokens, credentials, raw API responses, or internal tool details.
- Never claim an event was created unless the create_calendar_event tool returns success.
- For requests to read the calendar, use get_upcoming_events rather than guessing.
- For requests to create an event, extract all information that the user provided.
- The event title/summary, date, start time, and end time (or duration) are required.
- If a required date or exact time is missing or genuinely ambiguous, ask a concise
  clarification question instead of inventing a value.
- If the user gives a duration, calculate the end time yourself.
- If the user gives an end time, use it directly.
- Default timezone is Asia/Karachi unless the user explicitly specifies another timezone.
- Interpret relative dates such as today, tomorrow, Monday, next week, etc. using the
  current date supplied by the application.
- If the user asks for an event at a time that conflicts with an existing event, do not
  silently move it. Tell the user about the conflict and ask whether they want another time.
- Keep responses concise, professional, natural, and easy to scan.
- Use Markdown when helpful.

IMPORTANT: You are an action-taking calendar agent, not merely a text generator.
When the user's request is clear and actionable, use the appropriate tool.
"""


def _format_iso_datetime(date_str: str) -> str:
    """Normalize common date/time strings while preserving the original API behavior."""
    if not date_str:
        return date_str
    clean_str = date_str.strip()
    formats = [
        "%d/%m/%Y %I:%M %p", "%d/%m/%Y %H:%M",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
    ]
    for fmt in formats:
        try:
            parsed = dt.datetime.strptime(clean_str, fmt)
            return parsed.strftime("%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
    try:
        parsed = dt.datetime.fromisoformat(clean_str.replace("Z", "+00:00"))
        return parsed.strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return clean_str


class CalendarAgent:
    """Existing Calendar API plus a Gemini natural-language agent."""

    def service(self, user_email: str):
        return build(
            "calendar",
            "v3",
            credentials=get_credentials(user_email, "calendar"),
            cache_discovery=False,
        )

    # ------------------------------------------------------------------
    # EXISTING FUNCTIONALITY - PRESERVED
    # ------------------------------------------------------------------
    def upcoming_events(self, user_email: str, limit: int = 10) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit), 50))
        try:
            now = dt.datetime.now(dt.timezone.utc).isoformat()
            result = self.service(user_email).events().list(
                calendarId="primary",
                timeMin=now,
                maxResults=limit,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = []
            for event in result.get("items", []):
                start = event.get("start", {})
                end = event.get("end", {})
                events.append({
                    "id": event.get("id"),
                    "summary": event.get("summary", ""),
                    "description": event.get("description", ""),
                    "location": event.get("location", ""),
                    "start": start.get("dateTime", start.get("date")),
                    "end": end.get("dateTime", end.get("date")),
                    "html_link": event.get("htmlLink"),
                })
            return events
        except HttpError as exc:
            logger.exception("Calendar event listing failed")
            raise RuntimeError(f"Could not read Calendar events: {exc}") from exc
        except Exception as exc:
            logger.exception("Calendar event listing failed")
            raise RuntimeError(f"Could not read Calendar events: {exc}") from exc

    def create_event(
        self,
        user_email: str,
        summary: str,
        start: str,
        end: str,
        timezone: str = DEFAULT_TIMEZONE,
        description: str = "",
        location: str = "",
    ) -> Dict[str, Any]:
        summary, start, end = (summary or "").strip(), (start or "").strip(), (end or "").strip()
        if not summary or not start or not end:
            raise ValueError("Event summary, start, and end are required.")
        body = {
            "summary": summary,
            "description": description or "",
            "location": location or "",
            "start": {"dateTime": _format_iso_datetime(start), "timeZone": timezone},
            "end": {"dateTime": _format_iso_datetime(end), "timeZone": timezone},
        }
        try:
            event = self.service(user_email).events().insert(
                calendarId="primary", body=body
            ).execute()
            return {
                "id": event.get("id"),
                "summary": event.get("summary"),
                "start": event.get("start", {}).get("dateTime"),
                "end": event.get("end", {}).get("dateTime"),
                "html_link": event.get("htmlLink"),
            }
        except HttpError as exc:
            logger.exception("Calendar event creation failed")
            raise RuntimeError(f"Could not create Calendar event: {exc}") from exc
        except Exception as exc:
            logger.exception("Calendar event creation failed")
            raise RuntimeError(f"Could not create Calendar event: {exc}") from exc

    # ------------------------------------------------------------------
    # AI CALENDAR AGENT
    # ------------------------------------------------------------------
    def build_tools(self, user_email: str):
        """Build per-user Gemini tools. Closures prevent cross-user access."""

        def get_upcoming_events(limit: int = 10) -> str:
            """Read upcoming Google Calendar events for the authenticated user.

            Args:
                limit: Number of upcoming events to return, between 1 and 50.
            """
            try:
                return json.dumps(
                    self.upcoming_events(user_email, limit),
                    ensure_ascii=False,
                )
            except Exception as exc:
                logger.exception("AI calendar read tool failed")
                return json.dumps({"success": False, "error": str(exc)})

        def create_calendar_event(
            summary: str,
            start: str,
            end: str,
            timezone: str = DEFAULT_TIMEZONE,
            description: str = "",
            location: str = "",
        ) -> str:
            """Create a Google Calendar event for the authenticated user.

            Args:
                summary: Event title.
                start: Local start datetime in YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS format.
                end: Local end datetime in YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS format.
                timezone: IANA timezone, normally Asia/Karachi.
                description: Optional event description.
                location: Optional physical location or meeting location.
            """
            try:
                # Safety check: inspect upcoming events and refuse an overlapping
                # booking instead of silently double-booking the calendar.
                existing = self.upcoming_events(user_email, 50)
                requested_start = dt.datetime.fromisoformat(
                    _format_iso_datetime(start).replace("Z", "+00:00")
                )
                requested_end = dt.datetime.fromisoformat(
                    _format_iso_datetime(end).replace("Z", "+00:00")
                )
                if requested_start.tzinfo is None:
                    requested_start = requested_start.replace(tzinfo=ZoneInfo(timezone))
                if requested_end.tzinfo is None:
                    requested_end = requested_end.replace(tzinfo=ZoneInfo(timezone))

                conflicts = []
                for event in existing:
                    event_start = event.get("start")
                    event_end = event.get("end")
                    if not event_start or not event_end or len(event_start) == 10 or len(event_end) == 10:
                        continue
                    try:
                        es = dt.datetime.fromisoformat(event_start.replace("Z", "+00:00"))
                        ee = dt.datetime.fromisoformat(event_end.replace("Z", "+00:00"))
                        if es.tzinfo is None:
                            es = es.replace(tzinfo=dt.timezone.utc)
                        if ee.tzinfo is None:
                            ee = ee.replace(tzinfo=dt.timezone.utc)
                        if requested_start < ee and requested_end > es:
                            conflicts.append({
                                "summary": event.get("summary", "(Untitled event)"),
                                "start": event_start,
                                "end": event_end,
                            })
                    except ValueError:
                        continue

                if conflicts:
                    return json.dumps(
                        {"success": False, "conflict": True, "conflicts": conflicts},
                        ensure_ascii=False,
                    )

                result = self.create_event(
                    user_email=user_email,
                    summary=summary,
                    start=start,
                    end=end,
                    timezone=timezone,
                    description=description,
                    location=location,
                )
                return json.dumps(
                    {"success": True, "event": result, "checked_existing_events": len(existing)},
                    ensure_ascii=False,
                )
            except Exception as exc:
                logger.exception("AI calendar create tool failed")
                return json.dumps({"success": False, "error": str(exc)})

        return [get_upcoming_events, create_calendar_event]

    def ask(
        self,
        user_email: str,
        user_text: str,
        history=None,
        api_key: str = None,
    ) -> str:
        """Run the natural-language Calendar Agent for one authenticated user."""
        if not user_email or not user_email.strip():
            raise ValueError("User email is required.")
        if not user_text or not user_text.strip():
            raise ValueError("Calendar request is required.")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        client = genai.Client(api_key=api_key)
        contents = []

        for message in history or []:
            role = "model" if message.get("role") == "assistant" else "user"
            text = str(message.get("text", "")).strip()
            if text:
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part(text=text)],
                ))

        now_local = dt.datetime.now().astimezone()
        current_context = (
            f"Current local date/time: {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
            f"Default timezone: {DEFAULT_TIMEZONE}\n"
        )

        contents.append(types.Content(
            role="user",
            parts=[types.Part(text=current_context + "\nUser request:\n" + user_text.strip())],
        ))

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=contents,
            config=types.GenerateContentConfig(
                tools=self.build_tools(user_email),
                system_instruction=SYSTEM_INSTRUCTION,
            ),
        )

        answer = (response.text or "").strip()
        if not answer:
            raise RuntimeError("Calendar Agent returned an empty response.")
        return answer
