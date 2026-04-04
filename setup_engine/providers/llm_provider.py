from abc import ABC, abstractmethod
import os
from typing import Dict, Any, Optional
from setup_engine.utils.logger import AgentLogger

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_message: str = "You are a helpful assistant.") -> str:
        pass

class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, system_message: str = "") -> str:
        AgentLogger.think("MockLLM", "Returning None (Simulation Mode). Agents should use internal logic.")
        return ""

class AzureLLMProvider(LLMProvider):
    def __init__(self):
        from openai import AzureOpenAI
        
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION")
        self.azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME")
        
        if not all([self.api_key, self.api_version, self.azure_endpoint, self.deployment_name]):
             AgentLogger.error("Missing Azure Environment Variables. Please check .env")
             raise ValueError("Azure Config Missing")

        self.client = AzureOpenAI(
            api_key=self.api_key,
            api_version=self.api_version,
            azure_endpoint=self.azure_endpoint,
            max_retries=3
        )
        AgentLogger.success("Azure OpenAI Client Initialized.")

    def generate(self, prompt: str, system_message: str = "You are a helpful assistant.") -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            return response.choices[0].message.content
        except Exception as e:
            AgentLogger.error(f"Azure OpenAI Error: {e}")
            return ""
