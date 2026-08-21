"""
Weather service for the five supported cities.

Uses Open-Meteo's live forecast endpoint. No weather API key is required.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
from logger import logger



SUPPORTED_CITIES = {
    "Lahore": {"latitude": 31.5204, "longitude": 74.3587},
    "Karachi": {"latitude": 24.8607, "longitude": 67.0011},
    "Islamabad": {"latitude": 33.6844, "longitude": 73.0479},
    "Peshawar": {"latitude": 34.0151, "longitude": 71.5249},
    "Quetta": {"latitude": 30.1798, "longitude": 66.9750},
}

WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def _normalize_city(city: str) -> str:
    if not city:
        raise ValueError("City is required.")
    city = city.strip().lower()
    for supported in SUPPORTED_CITIES:
        if supported.lower() == city:
            return supported
    raise ValueError(
        "Unsupported city. Weather is available only for Lahore, Karachi, "
        "Islamabad, Peshawar, and Quetta."
    )


def _fetch_city(city: str) -> dict:
    city = _normalize_city(city)
    coords = SUPPORTED_CITIES[city]

    params = {
        "latitude": coords["latitude"],
        "longitude": coords["longitude"],
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
            "wind_speed_10m",
            "precipitation",
            "is_day",
        ]),
        "daily": ",".join([
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "wind_speed_10m_max",
            "sunrise",
            "sunset",
        ]),
        "forecast_days": 5,
        "timezone": "auto",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
    }

    url = "https://api.open-meteo.com/v1/forecast?" + urlencode(params)
    request = Request(url, headers={"User-Agent": "Apex-Capital-Bank-Weather/1.0"})

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
        logger.info("WEATHER provider response received successfully")
    except Exception as exc:
        logger.exception("WEATHER provider request failed")
        raise RuntimeError(f"Weather provider request failed for {city}: {exc}") from exc

    current = payload.get("current", {})
    daily = payload.get("daily", {})

    forecast = []
    days = daily.get("time", [])
    for i, date in enumerate(days):
        forecast.append({
            "date": date,
            "weather_code": daily.get("weather_code", [None] * len(days))[i],
            "condition": WEATHER_CODES.get(
                daily.get("weather_code", [None] * len(days))[i], "Unknown"
            ),
            "max_temperature": daily.get("temperature_2m_max", [None] * len(days))[i],
            "min_temperature": daily.get("temperature_2m_min", [None] * len(days))[i],
            "precipitation_probability": daily.get(
                "precipitation_probability_max", [None] * len(days)
            )[i],
            "precipitation": daily.get("precipitation_sum", [None] * len(days))[i],
            "max_wind_speed": daily.get("wind_speed_10m_max", [None] * len(days))[i],
            "sunrise": daily.get("sunrise", [None] * len(days))[i],
            "sunset": daily.get("sunset", [None] * len(days))[i],
        })

    return {
        "city": city,
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "timezone": payload.get("timezone"),
        "updated_at": current.get("time"),
        "current": {
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "precipitation": current.get("precipitation"),
            "weather_code": current.get("weather_code"),
            "condition": WEATHER_CODES.get(current.get("weather_code"), "Unknown"),
            "is_day": current.get("is_day"),
        },
        "forecast": forecast,
        "units": {
            "temperature": "°C",
            "wind_speed": "km/h",
            "precipitation": "mm",
        },
        "source": "Open-Meteo",
    }


def get_weather(city: str) -> dict:
    """Get current weather and a 5-day forecast for one supported city."""
    return _fetch_city(city)


def get_all_weather() -> list[dict]:
    """Get live weather for all five supported cities."""
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_fetch_city, city): city for city in SUPPORTED_CITIES
        }
        for future in as_completed(futures):
            city = futures[future]
            results.append(future.result())

    order = list(SUPPORTED_CITIES)
    return sorted(results, key=lambda item: order.index(item["city"]))
