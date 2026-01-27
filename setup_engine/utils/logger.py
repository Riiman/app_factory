import time
import sys

class AgentLogger:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    GREY = '\033[90m'

    @staticmethod
    def think(agent_name, thought):
        """
        Simulates a thinking process with a stylized log.
        """
        prefix = f"[{agent_name}] 🤔"
        print(f"{AgentLogger.GREY}{prefix} {thought}{AgentLogger.ENDC}")
        time.sleep(0.5) # Simulate processing time

    @staticmethod
    def action(agent_name, action):
        print(f"{AgentLogger.BLUE}[{agent_name}] ⚡ {action}{AgentLogger.ENDC}")

    @staticmethod
    def system(message):
        print(f"{AgentLogger.WARNING}[System] {message}{AgentLogger.ENDC}")

    @staticmethod
    def success(message):
        print(f"{AgentLogger.GREEN}{message}{AgentLogger.ENDC}")

    @staticmethod
    def error(message):
        print(f"{AgentLogger.FAIL}{message}{AgentLogger.ENDC}")

    @staticmethod
    def warning(message):
        print(f"{AgentLogger.WARNING}[Warning] {message}{AgentLogger.ENDC}")
