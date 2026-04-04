"""
V4 Migration Tool

Migrates existing V3 missions and data to V4 format.
"""

import json
import logging
import os
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class V4MigrationTool:
    """
    Migrates V3 data to V4 format.
    
    Handles:
    - Mission history migration
    - Strategy memory initialization
    - Knowledge base seeding
    - Configuration updates
    """
    
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.migration_log = []
    
    def migrate_missions(self, missions_file: str) -> Dict[str, Any]:
        """
        Migrate missions.json to V4 format.
        
        Args:
            missions_file: Path to missions.json
            
        Returns:
            Migration result
        """
        logger.info("Starting mission migration...")
        
        try:
            # Read existing missions
            with open(missions_file, 'r') as f:
                data = json.load(f)
            
            missions = data.get('missions', [])
            migrated_count = 0
            
            # Add V4 metadata to each mission
            for mission in missions:
                if 'v4_metadata' not in mission:
                    mission['v4_metadata'] = {
                        'migrated_at': datetime.utcnow().isoformat(),
                        'original_version': 'v3',
                        'strategy_attempts': [],
                        'quality_scores': [],
                        'execution_times': []
                    }
                    migrated_count += 1
            
            # Backup original
            backup_file = f"{missions_file}.v3_backup"
            with open(backup_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Write migrated version
            with open(missions_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.migration_log.append(f"Migrated {migrated_count} missions")
            logger.info(f"Migration complete: {migrated_count} missions")
            
            return {
                'success': True,
                'migrated_count': migrated_count,
                'backup_file': backup_file
            }
        
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def initialize_strategy_memory(self, startup_id: str) -> Dict[str, Any]:
        """
        Initialize strategy memory from historical data.
        
        Args:
            startup_id: Startup ID
            
        Returns:
            Initialization result
        """
        logger.info("Initializing strategy memory...")
        
        try:
            # Create strategy memory directory
            memory_dir = f".v4_strategy_memory/{startup_id}"
            os.makedirs(memory_dir, exist_ok=True)
            
            # Initialize empty strategy memory
            strategy_memory = {
                'failed_strategies': [],
                'successful_strategies': [],
                'initialized_at': datetime.utcnow().isoformat()
            }
            
            memory_file = f"{memory_dir}/strategy_memory.json"
            with open(memory_file, 'w') as f:
                json.dump(strategy_memory, f, indent=2)
            
            self.migration_log.append("Initialized strategy memory")
            logger.info("Strategy memory initialized")
            
            return {
                'success': True,
                'memory_file': memory_file
            }
        
        except Exception as e:
            logger.error(f"Strategy memory initialization failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def seed_knowledge_base(self, startup_id: str) -> Dict[str, Any]:
        """
        Seed knowledge base with initial patterns.
        
        Args:
            startup_id: Startup ID
            
        Returns:
            Seeding result
        """
        logger.info("Seeding knowledge base...")
        
        try:
            # Knowledge base will auto-initialize with built-in patterns
            # Just create the directory
            kb_dir = f".v4_knowledge/{startup_id}"
            os.makedirs(kb_dir, exist_ok=True)
            
            self.migration_log.append("Seeded knowledge base")
            logger.info("Knowledge base seeded")
            
            return {
                'success': True,
                'kb_dir': kb_dir
            }
        
        except Exception as e:
            logger.error(f"Knowledge base seeding failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_configuration(self) -> Dict[str, Any]:
        """
        Update configuration for V4.
        
        Returns:
            Update result
        """
        logger.info("Updating configuration...")
        
        try:
            # Create V4 config file
            config = {
                'v4_enabled': True,
                'safety': {
                    'enabled': True,
                    'max_identical_calls': 3,
                    'max_consecutive_failures': 5,
                    'max_cost_usd': 5.0,
                    'max_time_seconds': 300
                },
                'healing': {
                    'enabled': True,
                    'max_attempts': 3
                },
                'knowledge': {
                    'enabled': False,  # Disabled by default due to ChromaDB
                    'persist_directory': '.v4_knowledge'
                },
                'prompting': {
                    'enabled': False,  # Opt-in
                    'use_hierarchical': True
                },
                'generation': {
                    'enabled': False,  # Opt-in
                    'use_multi_pass': True
                }
            }
            
            config_file = '.v4_config.json'
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.migration_log.append("Updated configuration")
            logger.info("Configuration updated")
            
            return {
                'success': True,
                'config_file': config_file
            }
        
        except Exception as e:
            logger.error(f"Configuration update failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_full_migration(self, startup_id: str, missions_file: str) -> Dict[str, Any]:
        """
        Run complete migration process.
        
        Args:
            startup_id: Startup ID
            missions_file: Path to missions.json
            
        Returns:
            Migration result
        """
        logger.info("Starting full V4 migration...")
        
        results = {
            'started_at': datetime.utcnow().isoformat(),
            'steps': []
        }
        
        # Step 1: Migrate missions
        mission_result = self.migrate_missions(missions_file)
        results['steps'].append({
            'step': 'migrate_missions',
            'result': mission_result
        })
        
        # Step 2: Initialize strategy memory
        strategy_result = self.initialize_strategy_memory(startup_id)
        results['steps'].append({
            'step': 'initialize_strategy_memory',
            'result': strategy_result
        })
        
        # Step 3: Seed knowledge base
        kb_result = self.seed_knowledge_base(startup_id)
        results['steps'].append({
            'step': 'seed_knowledge_base',
            'result': kb_result
        })
        
        # Step 4: Update configuration
        config_result = self.update_configuration()
        results['steps'].append({
            'step': 'update_configuration',
            'result': config_result
        })
        
        # Summary
        all_success = all(step['result']['success'] for step in results['steps'])
        results['completed_at'] = datetime.utcnow().isoformat()
        results['success'] = all_success
        results['migration_log'] = self.migration_log
        
        logger.info(f"Migration {'successful' if all_success else 'failed'}")
        
        return results
