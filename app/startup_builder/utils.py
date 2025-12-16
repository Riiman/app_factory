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
    @staticmethod
    def parse(text):
        """
        Robustly parses JSON from text.
        Returns parsed dict/list or raises ValueError.
        """
        # Attempt 1: Parse original text directly (best case)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

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

    @staticmethod
    def extract_json(text):
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
        # Fix unescaped newlines (common in LLM output)
        # Replace control character newlines, tabs, etc if needed.
        # But specifically newlines validly appear in formatted JSON (indentation), 
        # so we can't just blind replace ALL newlines if they are outside strings.
        # BUT, standard json.loads handles newlines outside strings fine. 
        # It fails on newlines INSIDE strings.
        
        # A simple naive fix for unescaped newlines in strings is hard without a parser.
        # However, for this specific issue, let's just avoid the destructive regex first.
        
        # DANGEROUS: re.sub(r"//.*", "", json_str) breaks URLs! 
        # We will disable it.
        # json_str = re.sub(r"//.*", "", json_str)
        
        # Remove trailing commas
        json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
        
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
