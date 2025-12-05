import json
import re

class JsonRepair:
    @staticmethod
    def extract_json(text):
        """
        Extracts JSON substring from text.
        Handles markdown code blocks and raw JSON.
        """
        text = text.strip()
        
        # Try to find JSON in markdown code blocks
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            return match.group(1)
            
        match = re.search(r"```\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            return match.group(1)
            
        # Try to find the first '{' and last '}'
        start = text.find('{')
        end = text.rfind('}')
        
        if start != -1 and end != -1 and end > start:
            return text[start:end+1]
            
        return text

    @staticmethod
    def repair_json(json_str):
        """
        Attempts to repair common JSON errors.
        """
        # Remove comments (// ...)
        json_str = re.sub(r"//.*", "", json_str)
        
        # Remove trailing commas
        json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
        
        # Fix missing quotes around keys (simple cases)
        # This is risky but can help with some LLM outputs
        # json_str = re.sub(r"([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'\1"\2":', json_str)
        
        return json_str

    @staticmethod
    def parse(text):
        """
        Robustly parses JSON from text.
        Returns parsed dict/list or raises ValueError.
        """
        json_str = JsonRepair.extract_json(text)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Try repairing
            repaired_str = JsonRepair.repair_json(json_str)
            try:
                return json.loads(repaired_str)
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse JSON: {e}")
