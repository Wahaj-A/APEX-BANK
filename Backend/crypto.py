"""Live cryptocurrency service for the five supported assets.

Uses Binance's public 24-hour ticker endpoint. No crypto API key is required.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
from logger import logger



SUPPORTED_CRYPTO = {
    "Bitcoin": {"symbol": "BTCUSDT", "ticker": "BTC", "name": "Bitcoin"},
    "Ethereum": {"symbol": "ETHUSDT", "ticker": "ETH", "name": "Ethereum"},
    "BNB": {"symbol": "BNBUSDT", "ticker": "BNB", "name": "BNB"},
    "Solana": {"symbol": "SOLUSDT", "ticker": "SOL", "name": "Solana"},
    "XRP": {"symbol": "XRPUSDT", "ticker": "XRP", "name": "XRP"},
}


def _normalize_crypto(asset: str) -> str:
    if not asset:
        raise ValueError("Cryptocurrency is required.")
    value = asset.strip().lower()
    aliases = {
        "btc": "Bitcoin", "bitcoin": "Bitcoin",
        "eth": "Ethereum", "ethereum": "Ethereum",
        "bnb": "BNB", "binance coin": "BNB",
        "sol": "Solana", "solana": "Solana",
        "xrp": "XRP", "ripple": "XRP",
    }
    if value in aliases:
        return aliases[value]
    raise ValueError(
        "Unsupported cryptocurrency. Crypto data is available only for "
        "Bitcoin, Ethereum, BNB, Solana, and XRP."
    )


def _fetch_asset(asset: str) -> dict:
    asset = _normalize_crypto(asset)
    config = SUPPORTED_CRYPTO[asset]
    params = urlencode({"symbol": config["symbol"]})
    url = f"https://api.binance.com/api/v3/ticker/24hr?{params}"
    request = Request(url, headers={"User-Agent": "Apex-Capital-Bank-Crypto/1.0"})

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
        logger.info("CRYPTO provider response received successfully")
    except Exception as exc:
        logger.exception("CRYPTO provider request failed")
        raise RuntimeError(f"Crypto provider request failed for {asset}: {exc}") from exc

    return {
        "name": config["name"],
        "symbol": config["ticker"],
        "pair": config["symbol"],
        "price_usd": float(payload.get("lastPrice", 0)),
        "price_change_24h_percent": float(payload.get("priceChangePercent", 0)),
        "high_24h_usd": float(payload.get("highPrice", 0)),
        "low_24h_usd": float(payload.get("lowPrice", 0)),
        "volume_24h": float(payload.get("volume", 0)),
        "quote_volume_24h_usd": float(payload.get("quoteVolume", 0)),
        "updated_at": int(payload.get("closeTime", 0)),
        "source": "Binance",
    }


def get_crypto(asset: str) -> dict:
    """Get live 24-hour market data for one supported cryptocurrency."""
    return _fetch_asset(asset)


def get_all_crypto() -> list[dict]:
    """Get live market data for all five supported cryptocurrencies."""
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(_fetch_asset, asset): asset for asset in SUPPORTED_CRYPTO}
        for future in as_completed(futures):
            results.append(future.result())

    order = list(SUPPORTED_CRYPTO)
    return sorted(results, key=lambda item: order.index(item["name"]))
