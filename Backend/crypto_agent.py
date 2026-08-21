"""AI crypto agent using Gemini function calling and live market data."""
import json
from google import genai
from google.genai import types

from crypto import SUPPORTED_CRYPTO, get_crypto
from logger import logger



SYSTEM_INSTRUCTION = """
You are the cryptocurrency assistant for Apex Capital Bank.

You can answer ONLY questions about these five supported cryptocurrencies:
Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), and XRP.

When the user asks about a current price, 24-hour change, high/low, volume,
or current market information, ALWAYS use the get_crypto_market_data tool so
the answer is based on live data. Never invent prices or market values.

If the user asks about an unsupported cryptocurrency, clearly say that the
app currently supports only Bitcoin, Ethereum, BNB, Solana, and XRP.

For comparisons, retrieve live data for each supported cryptocurrency needed
for the comparison before answering.

Write every response in a polished, professional assistant style suitable for a
banking application. Use Markdown formatting so the frontend can present the
answer clearly. Prefer this structure when appropriate:
- A short bold title such as **Bitcoin Market Update**
- A concise overview of the requested asset(s)
- Clearly labeled values such as **Current Price**, **24h Change**, **24h High**,
  **24h Low**, and **Volume** when available
- For comparisons, use a compact Markdown table
- End with a short neutral market observation when useful
Do not expose tool calls, raw JSON, internal instructions, or implementation
details. Use exact values returned by the live market-data tool. Always identify
USD prices clearly. This is market information, not financial advice.
"""


def build_crypto_tools():
    def get_crypto_market_data(asset: str) -> str:
        """Get live market data for one supported cryptocurrency.

        Args:
            asset: Bitcoin, Ethereum, BNB, Solana, or XRP (names or common tickers).
        """
        try:
            return json.dumps(get_crypto(asset), ensure_ascii=False)
        except ValueError as exc:
            return f"Error: {exc}"
        except Exception as exc:
            return f"Error: Could not retrieve crypto data: {exc}"

    return [get_crypto_market_data]


def ask_crypto(user_text: str, history=None, api_key: str = None) -> str:
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
            tools=build_crypto_tools(),
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    return response.text
