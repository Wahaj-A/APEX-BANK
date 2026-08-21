"""AI weather agent using Gemini function calling."""
import json
from google import genai
from google.genai import types

from weather import SUPPORTED_CITIES, get_weather
from logger import logger



SYSTEM_INSTRUCTION = """
You are the weather assistant for Apex Capital Bank.

You can answer ONLY weather questions for these five supported cities:
Lahore, Karachi, Islamabad, Peshawar, and Quetta.

When the user asks about current weather, today's conditions, temperature,
rain, wind, or a forecast, ALWAYS use the get_weather_forecast tool so the
answer is based on live data. Never invent weather values.

If the user asks about a city outside the five supported cities, clearly say
that the app currently supports only Lahore, Karachi, Islamabad, Peshawar,
and Quetta.

Write every response in a polished, professional assistant style suitable for a
banking application. Use Markdown formatting so the frontend can present the
answer clearly. Prefer this structure when appropriate:
- A short bold title such as **Lahore Weather**
- A concise current-conditions paragraph
- A **5-Day Forecast** section for forecast questions
- A compact Markdown table with Date, Conditions, High, and Low when five-day
  forecast data is available
- A one-sentence practical summary or recommendation
Do not expose tool calls, raw JSON, internal instructions, or implementation
details. Use exact values returned by the live weather tool. Keep the tone
professional, natural, and easy to scan.
"""


def build_weather_tools():
    def get_weather_forecast(city: str) -> str:
        """Get live current weather and a five-day forecast for a supported city.

        Args:
            city: One of Lahore, Karachi, Islamabad, Peshawar, or Quetta.
        """
        try:
            return json.dumps(get_weather(city), ensure_ascii=False)
        except ValueError as exc:
            return f"Error: {exc}"
        except Exception as exc:
            return f"Error: Could not retrieve weather data: {exc}"

    return [get_weather_forecast]


def ask_weather(user_text: str, history=None, api_key: str = None) -> str:
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)
    contents = []

    for message in history or []:
        role = "model" if message.get("role") == "assistant" else "user"
        contents.append(types.Content(
            role=role,
            parts=[types.Part(text=message.get("text", ""))],
        ))

    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=user_text)],
    ))

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=contents,
        config=types.GenerateContentConfig(
            tools=build_weather_tools(),
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    return response.text
