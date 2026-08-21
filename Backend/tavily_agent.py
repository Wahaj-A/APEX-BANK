"""Tavily web-search agent."""

import os
from typing import Any, Dict

from tavily import TavilyClient

try:
    from logger import logger
except ImportError:  # pragma: no cover
    import logging
    logger = logging.getLogger(__name__)


class TavilySearchAgent:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.client = TavilyClient(api_key=self.api_key) if self.api_key else None

    def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        query = (query or "").strip()
        if not query:
            raise ValueError("Search query is required.")
        if not self.client:
            raise RuntimeError("TAVILY_API_KEY is not configured.")

        max_results = max(1, min(int(max_results), 10))
        try:
            response = self.client.search(
                query=query,
                search_depth="basic",
                max_results=max_results,
                include_answer="advanced",
                include_raw_content=False,
            )
            results = [
                {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "content": item.get("content", ""),
                }
                for item in response.get("results", [])
            ]
            summary = response.get("answer") or "No concise summary was returned."
            return {"query": query, "summary": summary, "results": results}
        except Exception as exc:
            logger.exception("Tavily web search failed")
            raise RuntimeError(f"Web search failed: {exc}") from exc
