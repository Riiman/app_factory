import json
import re

class JsonRepair:
    @staticmethod
    def parse(text):
        """
        Robustly parses JSON from text.
        Returns parsed dict/list or raises ValueError.
        """
        if not text:
             raise ValueError("Empty JSON text")
             
        # 1. Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. Extract JSON from Markdown/Text
        json_str = JsonRepair.extract_json(text)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
            
        # 3. Repair common errors (trailing commas, etc)
        repaired_str = JsonRepair.repair_json(json_str)
        try:
            return json.loads(repaired_str)
        except json.JSONDecodeError as e:
            # Last ditch: try to fix newlines in strings
            # But really, at this point, it's usually hopeless or requires more heavy lifting.
            # We raise the original error or a clear message.
            raise ValueError(f"Failed to parse JSON: {e}")

    @staticmethod
    def extract_json(text):
        """
        Extracts JSON substring from text (finding { and }).
        """
        if not text: return ""
        
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
        if not json_str: return ""
        
        # Remove trailing commas: , } -> }
        json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
        
        return json_str
