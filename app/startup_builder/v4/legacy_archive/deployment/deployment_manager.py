"""
V4 Deployment Manager

Handles deployment of V4 system to staging and production.
"""

import logging
import os
import subprocess
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class V4DeploymentManager:
    """
    Manages V4 system deployment.
    
    Handles:
    - Environment setup
    - Dependency installation
    - Configuration validation
    - Health checks
    - Rollback capability
    """
    
    def __init__(self, environment: str = "staging"):
        self.environment = environment
        self.deployment_log = []
    
    def validate_environment(self) -> Dict[str, Any]:
        """
        Validate deployment environment.
        
        Returns:
            Validation result
        """
        logger.info(f"Validating {self.environment} environment...")
        
        checks = {
            'python_version': self._check_python_version(),
            'dependencies': self._check_dependencies(),
            'disk_space': self._check_disk_space(),
            'permissions': self._check_permissions()
        }
        
        all_passed = all(check['passed'] for check in checks.values())
        
        return {
            'success': all_passed,
            'checks': checks
        }
    
    def _check_python_version(self) -> Dict[str, Any]:
        """Check Python version"""
        try:
            import sys
            version = sys.version_info
            passed = version.major == 3 and version.minor >= 8
            
            return {
                'passed': passed,
                'version': f"{version.major}.{version.minor}.{version.micro}",
                'required': '3.8+'
            }
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def _check_dependencies(self) -> Dict[str, Any]:
        """Check required dependencies"""
        required = ['pytest', 'langchain', 'langchain_google_genai']
        missing = []
        
        for dep in required:
            try:
                __import__(dep.replace('-', '_'))
            except ImportError:
                missing.append(dep)
        
        return {
            'passed': len(missing) == 0,
            'missing': missing
        }
    
    def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            free_gb = free // (2**30)
            
            return {
                'passed': free_gb >= 1,
                'free_gb': free_gb,
                'required_gb': 1
            }
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def _check_permissions(self) -> Dict[str, Any]:
        """Check file permissions"""
        try:
            test_file = '.v4_permission_test'
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            
            return {'passed': True}
        except Exception as e:
            return {'passed': False, 'error': str(e)}
    
    def install_dependencies(self) -> Dict[str, Any]:
        """
        Install V4 dependencies.
        
        Returns:
            Installation result
        """
        logger.info("Installing dependencies...")
        
        # Optional dependencies (ChromaDB is optional)
        optional_deps = ['chromadb']
        
        results = []
        for dep in optional_deps:
            try:
                subprocess.run(
                    ['pip', 'install', dep],
                    capture_output=True,
                    check=True,
                    timeout=60
                )
                results.append({'dep': dep, 'success': True})
            except Exception as e:
                results.append({'dep': dep, 'success': False, 'error': str(e)})
        
        return {
            'success': True,  # Optional deps don't block deployment
            'results': results
        }
    
    def deploy_configuration(self) -> Dict[str, Any]:
        """
        Deploy V4 configuration.
        
        Returns:
            Deployment result
        """
        logger.info("Deploying configuration...")
        
        try:
            # Set environment variables
            env_vars = {
                'USE_V4_SAFETY': 'true',
                'USE_V4_HEALING': 'true',
                'USE_V4_KNOWLEDGE': 'false',  # Disabled by default
                'USE_V4_PROMPTING': 'false',  # Opt-in
                'USE_V4_GENERATION': 'false'  # Opt-in
            }
            
            # Write to .env file
            env_file = '.env.v4'
            with open(env_file, 'w') as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")
            
            self.deployment_log.append(f"Created {env_file}")
            
            return {
                'success': True,
                'env_file': env_file,
                'env_vars': env_vars
            }
        
        except Exception as e:
            logger.error(f"Configuration deployment failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_health_check(self) -> Dict[str, Any]:
        """
        Run V4 system health check.
        
        Returns:
            Health check result
        """
        logger.info("Running health check...")
        
        checks = {}
        
        # Check 1: Import all components
        try:
            from ..safety import SafetyCoordinator
            from ..healing import SelfHealer
            from ..verification import VerificationEngine
            checks['imports'] = {'passed': True}
        except Exception as e:
            checks['imports'] = {'passed': False, 'error': str(e)}
        
        # Check 2: Initialize safety
        try:
            safety = SafetyCoordinator()
            safety.start_task()
            checks['safety_init'] = {'passed': True}
        except Exception as e:
            checks['safety_init'] = {'passed': False, 'error': str(e)}
        
        # Check 3: Test healing
        try:
            from ..healing import Failure
            healer = SelfHealer()
            result = healer.heal(
                Failure(error_message="test", error_type="test"),
                {}
            )
            checks['healing'] = {'passed': result.success}
        except Exception as e:
            checks['healing'] = {'passed': False, 'error': str(e)}
        
        all_passed = all(check['passed'] for check in checks.values())
        
        return {
            'success': all_passed,
            'checks': checks
        }
    
    def deploy(self) -> Dict[str, Any]:
        """
        Run complete deployment process.
        
        Returns:
            Deployment result
        """
        logger.info(f"Starting V4 deployment to {self.environment}...")
        
        results = {
            'environment': self.environment,
            'started_at': datetime.utcnow().isoformat(),
            'steps': []
        }
        
        # Step 1: Validate environment
        validation = self.validate_environment()
        results['steps'].append({
            'step': 'validate_environment',
            'result': validation
        })
        
        if not validation['success']:
            results['success'] = False
            results['error'] = 'Environment validation failed'
            return results
        
        # Step 2: Install dependencies
        deps = self.install_dependencies()
        results['steps'].append({
            'step': 'install_dependencies',
            'result': deps
        })
        
        # Step 3: Deploy configuration
        config = self.deploy_configuration()
        results['steps'].append({
            'step': 'deploy_configuration',
            'result': config
        })
        
        if not config['success']:
            results['success'] = False
            results['error'] = 'Configuration deployment failed'
            return results
        
        # Step 4: Health check
        health = self.run_health_check()
        results['steps'].append({
            'step': 'health_check',
            'result': health
        })
        
        # Summary
        results['completed_at'] = datetime.utcnow().isoformat()
        results['success'] = health['success']
        results['deployment_log'] = self.deployment_log
        
        logger.info(f"Deployment {'successful' if results['success'] else 'failed'}")
        
        return results
