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
        Extracts JSON substring from text (finding { or [ and } or ]).
        """
        if not text: return ""
        
        # Check for code blocks first
        import re
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            text = match.group(1)
        else:
             match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
             if match:
                 text = match.group(1)

        start_brace = text.find('{')
        start_bracket = text.find('[')
        
        start = -1
        if start_brace != -1 and start_bracket != -1:
            start = min(start_brace, start_bracket)
        elif start_brace != -1:
            start = start_brace
        elif start_bracket != -1:
            start = start_bracket
            
        end_brace = text.rfind('}')
        end_bracket = text.rfind(']')
        
        end = -1
        if end_brace != -1 and end_bracket != -1:
            end = max(end_brace, end_bracket)
        elif end_brace != -1:
            end = end_brace
        elif end_bracket != -1:
            end = end_bracket
        
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
