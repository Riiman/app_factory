from abc import ABC, abstractmethod
import os
import requests
from typing import List, Dict, Any
from setup_engine.utils.logger import AgentLogger

class SearchProvider(ABC):
    @abstractmethod
    def search(self, query: str) -> List[Dict[str, Any]]:
        pass

class MockSearchProvider(SearchProvider):
    def search(self, query: str) -> List[Dict[str, Any]]:
        AgentLogger.think("MockSearch", f"Simulating search results for: '{query}'")
        # Return mock data based on keywords
        q = query.lower()
        if "bvlos" in q:
            return [{"title": "BVLOS Regulations", "snippet": "BVLOS operations require specific approval from aviation authorities (DGCA/FAA).", "source": "Mock DB"}]
        if "battery" in q:
            return [{"title": "Battery Tech 2024", "snippet": "LiPo batteries avg 150-180Wh/kg. Hydrogen allows 2h+ flight.", "source": "Mock DB"}]
        return [{"title": "General Info", "snippet": f"Information about {query}.", "source": "Mock DB"}]

class TavilySearchProvider(SearchProvider):
    def __init__(self):
        self.api_key = os.environ.get("TAVILY_API_KEY")
        if not self.api_key:
             raise ValueError("Missing TAVILY_API_KEY")
        AgentLogger.success("Tavily Search Connected.")

    def search(self, query: str) -> List[Dict[str, Any]]:
        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": self.api_key,
                "query": query,
                "search_depth": "basic",
                "max_results": 3
            }
            resp = requests.post(url, json=payload, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            
            results = []
            for res in data.get("results", []):
                results.append({
                    "title": res.get("title"),
                    "snippet": res.get("content"),
                    "source": res.get("url")
                })
            return results
        except Exception as e:
            AgentLogger.error(f"Tavily Search Failed: {e}")
            return []

class BingSearchProvider(SearchProvider):
    def __init__(self):
        self.api_key = os.environ.get("BING_SEARCH_V7_SUBSCRIPTION_KEY") or os.environ.get("AZURE_BING_SEARCH_KEY")
        self.endpoint = os.environ.get("BING_SEARCH_V7_ENDPOINT", "https://api.bing.microsoft.com/v7.0/search")
        if not self.api_key:
             raise ValueError("Missing BING_SEARCH_KEY")
        AgentLogger.success("Bing Search Connected.")

    def search(self, query: str) -> List[Dict[str, Any]]:
        try:
            headers = {"Ocp-Apim-Subscription-Key": self.api_key}
            params = {"q": query, "count": 3}
            resp = requests.get(self.endpoint, headers=headers, params=params, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            
            results = []
            for res in data.get("webPages", {}).get("value", []):
                 results.append({
                    "title": res.get("name"),
                    "snippet": res.get("snippet"),
                    "source": res.get("url")
                })
            return results
        except Exception as e:
            AgentLogger.error(f"Bing Search Failed: {e}")
            return []

class DuckDuckGoSearchProvider(SearchProvider):
    def __init__(self):
        try:
            from duckduckgo_search import DDGS
            self.ddgs = DDGS()
            AgentLogger.success("DuckDuckGo Search Connected (Free).")
        except ImportError:
            raise ImportError("duckduckgo-search package not installed. Run `pip install duckduckgo-search`.")

    def search(self, query: str) -> List[Dict[str, Any]]:
        try:
             # run search
            results = []
            # DDGS().text() returns max results
            for res in self.ddgs.text(query, max_results=3):
                results.append({
                    "title": res.get("title"),
                    "snippet": res.get("body"), # DDG uses 'body' for snippet
                    "source": res.get("href")
                })
            return results
        except Exception as e:
             AgentLogger.error(f"DuckDuckGo Search Failed: {e}")
             return []

