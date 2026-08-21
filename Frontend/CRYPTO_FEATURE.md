# Live Crypto Feature

## Supported cryptocurrencies

The application supports exactly five assets:
- Bitcoin (BTC)
- Ethereum (ETH)
- BNB
- Solana (SOL)
- XRP

## Data source

The backend uses Binance's public 24-hour ticker endpoint for live USD/USDT market data. No crypto API key is required for these public endpoints.

## Backend routes

- `GET /api/crypto/currencies` — live data for all five assets
- `GET /api/crypto/{asset}` — live data for one supported asset
- `POST /api/crypto/ask` — Gemini AI agent with a live crypto data tool

## Manual mode

The frontend refreshes the five-asset dashboard automatically every 60 seconds and also has a manual refresh button. Clicking an asset fetches its latest detailed 24-hour market data.

## AI mode

The Gemini crypto agent is instructed to use the live `get_crypto_market_data` tool for current market questions and to refuse unsupported cryptocurrencies. The existing `GEMINI_API_KEY` is reused from the backend `.env` file.

## Security

No API key is placed in the frontend. Keep `GEMINI_API_KEY` in the backend `.env` file only.
