# Weather Feature Integration

## What was added
- Live weather API integration using Open-Meteo.
- Exactly five supported cities: Lahore, Karachi, Islamabad, Peshawar, Quetta.
- Manual weather dashboard with live current conditions and a 5-day forecast.
- Automatic dashboard refresh every 10 minutes plus a manual Refresh button.
- AI Weather Agent using Gemini function calling. It fetches live weather before answering.
- Existing banking agent and RAG functionality are kept separate.

## Backend
From the `Backend` folder:

```bash
pip install -r requirements.txt
python main.py
```

The backend runs at `http://127.0.0.1:8000`.

## Frontend
From the `Frontend` folder:

```bash
npm install
npm run dev
```

The frontend normally runs at `http://localhost:5173`.

Keep your existing `.env` file in `Backend` and make sure it contains:

```env
GEMINI_API_KEY=YOUR_KEY
```

The weather API itself does not require a weather API key.

## API routes
- `GET /api/weather/cities` — live weather for all five cities
- `GET /api/weather/{city}` — live weather + 5-day forecast for one supported city
- `POST /api/weather/ask` — AI weather assistant

## Changing the five cities
Edit `Backend/weather.py` and change the `SUPPORTED_CITIES` dictionary. The city names and coordinates there control both the manual dashboard and the AI agent.
