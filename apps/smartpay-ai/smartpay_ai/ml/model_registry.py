"""
ML Model Registry

Location: smartpay_ai/ml/model_registry.py
Purpose: Track model versions, metrics, deployment status, and enable rollback
Features:
  - Version management (keep last 3 versions)
  - Performance tracking
  - Deployment status
  - Rollback capability
  - Model comparison
"""

import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Model registry for tracking versions and enabling rollback
    
    Tracks:
    - Model versions with timestamps
    - Training metrics and performance
    - Deployment status
    - Training data statistics
    - Model artifacts (model files, scalers, metadata)
    """

    def __init__(self, models_base_dir: Optional[Path] = None):
        """
        Initialize model registry
        
        Args:
            models_base_dir: Base directory for model storage
        """
        if models_base_dir is None:
            project_root = Path(__file__).parent.parent.parent
            models_base_dir = project_root / "smartpay_ai" / "models"
        
        self.models_base_dir = Path(models_base_dir)
        self.registry_file = self.models_base_dir / "registry.json"
        
        logger.info(f"Model registry: {self.models_base_dir}")
        
        # Initialize registry if doesn't exist
        if not self.registry_file.exists():
            self._initialize_registry()
        
        self.registry = self._load_registry()

    def _initialize_registry(self):
        """Create initial registry file"""
        initial_registry = {
            'models': {
                'fraud_detection': {'versions': [], 'active_version': None},
                'credit_scoring': {'versions': [], 'active_version': None},
                'spending_analysis': {'versions': [], 'active_version': None},
                'transaction_classification': {'versions': [], 'active_version': None},
                'savings_forecast': {'versions': [], 'active_version': None},
            },
            'last_updated': datetime.now().isoformat(),
        }
        
        self.models_base_dir.mkdir(parents=True, exist_ok=True)
        
        with open(self.registry_file, 'w') as f:
            json.dump(initial_registry, f, indent=2)
        
        logger.info("Initialized model registry")

    def _load_registry(self) -> Dict[str, Any]:
        """Load registry from disk"""
        with open(self.registry_file, 'r') as f:
            return json.load(f)

    def _save_registry(self):
        """Save registry to disk"""
        self.registry['last_updated'] = datetime.now().isoformat()
        
        with open(self.registry_file, 'w') as f:
            json.dump(self.registry, f, indent=2)

    def register_model(
        self,
        model_name: str,
        version: str,
        metrics: Dict[str, float],
        training_info: Dict[str, Any],
        model_artifacts: Optional[Dict[str, Path]] = None,
        set_active: bool = True
    ) -> Dict[str, Any]:
        """
        Register a new model version
        
        Args:
            model_name: Name of model (e.g., 'fraud_detection')
            version: Version timestamp (e.g., '20240322_143000')
            metrics: Performance metrics
            training_info: Training metadata (samples, features, etc.)
            model_artifacts: Paths to model files
            set_active: Whether to set as active version
            
        Returns:
            Registration record
        """
        if model_name not in self.registry['models']:
            self.registry['models'][model_name] = {
                'versions': [],
                'active_version': None
            }
        
        # Create version record
        version_record = {
            'version': version,
            'registered_at': datetime.now().isoformat(),
            'metrics': metrics,
            'training_info': training_info,
            'deployment_status': 'registered',
            'deployed_at': None,
            'artifacts': {k: str(v) for k, v in (model_artifacts or {}).items()},
        }
        
        # Add to registry
        self.registry['models'][model_name]['versions'].append(version_record)
        
        # Set as active if requested
        if set_active:
            self.registry['models'][model_name]['active_version'] = version
            version_record['deployment_status'] = 'active'
            version_record['deployed_at'] = datetime.now().isoformat()
        
        # Keep only last 3 versions (cleanup old versions)
        self._cleanup_old_versions(model_name, keep_count=3)
        
        self._save_registry()
        
        logger.info(f"Registered model: {model_name} version {version}")
        if set_active:
            logger.info(f"  Set as active version")
        
        return version_record

    def _cleanup_old_versions(self, model_name: str, keep_count: int = 3):
        """
        Keep only the last N versions, delete older ones
        
        Args:
            model_name: Model name
            keep_count: Number of versions to keep
        """
        versions = self.registry['models'][model_name]['versions']
        
        if len(versions) <= keep_count:
            return
        
        # Sort by registered_at (newest first)
        versions.sort(key=lambda v: v['registered_at'], reverse=True)
        
        # Keep only the last N versions
        versions_to_keep = versions[:keep_count]
        versions_to_delete = versions[keep_count:]
        
        # Delete old version artifacts
        model_dir = self.models_base_dir / model_name
        
        for version_record in versions_to_delete:
            version = version_record['version']
            
            # Delete archived version files
            archive_dir = model_dir / "versions" / version
            if archive_dir.exists():
                shutil.rmtree(archive_dir)
                logger.info(f"Deleted old version: {model_name}/{version}")
        
        # Update registry
        self.registry['models'][model_name]['versions'] = versions_to_keep

    def get_active_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Get active model version
        
        Args:
            model_name: Model name
            
        Returns:
            Active version record or None
        """
        if model_name not in self.registry['models']:
            return None
        
        active_version = self.registry['models'][model_name]['active_version']
        
        if not active_version:
            return None
        
        # Find version record
        versions = self.registry['models'][model_name]['versions']
        
        for version in versions:
            if version['version'] == active_version:
                return version
        
        return None

    def get_model_versions(self, model_name: str) -> List[Dict[str, Any]]:
        """
        Get all versions for a model
        
        Args:
            model_name: Model name
            
        Returns:
            List of version records
        """
        if model_name not in self.registry['models']:
            return []
        
        return self.registry['models'][model_name]['versions']

    def set_active_version(self, model_name: str, version: str) -> bool:
        """
        Set a specific version as active (rollback/promote)
        
        Args:
            model_name: Model name
            version: Version to activate
            
        Returns:
            True if successful
        """
        if model_name not in self.registry['models']:
            logger.error(f"Model not found: {model_name}")
            return False
        
        # Find version
        versions = self.registry['models'][model_name]['versions']
        version_found = False
        
        for v in versions:
            if v['version'] == version:
                version_found = True
                v['deployment_status'] = 'active'
                v['deployed_at'] = datetime.now().isoformat()
            elif v['deployment_status'] == 'active':
                v['deployment_status'] = 'inactive'
        
        if not version_found:
            logger.error(f"Version not found: {model_name}/{version}")
            return False
        
        # Update active version
        old_version = self.registry['models'][model_name]['active_version']
        self.registry['models'][model_name]['active_version'] = version
        
        self._save_registry()
        
        logger.info(f"Activated version: {model_name}/{version} (was: {old_version})")
        
        return True

    def compare_versions(
        self,
        model_name: str,
        version_a: str,
        version_b: str
    ) -> Dict[str, Any]:
        """
        Compare two model versions
        
        Args:
            model_name: Model name
            version_a: First version
            version_b: Second version
            
        Returns:
            Comparison results
        """
        versions = self.registry['models'][model_name]['versions']
        
        version_a_record = None
        version_b_record = None
        
        for v in versions:
            if v['version'] == version_a:
                version_a_record = v
            if v['version'] == version_b:
                version_b_record = v
        
        if not version_a_record or not version_b_record:
            return {'error': 'One or both versions not found'}
        
        comparison = {
            'model_name': model_name,
            'version_a': version_a,
            'version_b': version_b,
            'metrics_comparison': {},
            'training_info_comparison': {},
        }
        
        # Compare metrics
        metrics_a = version_a_record['metrics']
        metrics_b = version_b_record['metrics']
        
        for metric_name in set(list(metrics_a.keys()) + list(metrics_b.keys())):
            val_a = metrics_a.get(metric_name, None)
            val_b = metrics_b.get(metric_name, None)
            
            if val_a is not None and val_b is not None:
                diff = val_b - val_a
                comparison['metrics_comparison'][metric_name] = {
                    'version_a': val_a,
                    'version_b': val_b,
                    'difference': diff,
                    'percent_change': (diff / val_a * 100) if val_a != 0 else 0,
                }
        
        # Compare training info
        info_a = version_a_record['training_info']
        info_b = version_b_record['training_info']
        
        comparison['training_info_comparison'] = {
            'training_samples': {
                'version_a': info_a.get('training_samples'),
                'version_b': info_b.get('training_samples'),
            },
            'test_samples': {
                'version_a': info_a.get('test_samples'),
                'version_b': info_b.get('test_samples'),
            },
            'training_date': {
                'version_a': info_a.get('training_date'),
                'version_b': info_b.get('training_date'),
            },
        }
        
        return comparison

    def get_registry_summary(self) -> Dict[str, Any]:
        """Get summary of all models in registry"""
        summary = {
            'last_updated': self.registry['last_updated'],
            'models': {},
        }
        
        for model_name, model_info in self.registry['models'].items():
            active_version = model_info['active_version']
            versions = model_info['versions']
            
            active_metrics = None
            if active_version:
                for v in versions:
                    if v['version'] == active_version:
                        active_metrics = v['metrics']
                        break
            
            summary['models'][model_name] = {
                'active_version': active_version,
                'total_versions': len(versions),
                'active_metrics': active_metrics,
                'latest_version': versions[0]['version'] if versions else None,
            }
        
        return summary

    def auto_register_from_metadata(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Auto-register a model from its metadata.json file
        
        Args:
            model_name: Model name
            
        Returns:
            Registration record or None
        """
        model_dir = self.models_base_dir / model_name
        metadata_file = model_dir / "metadata.json"
        
        if not metadata_file.exists():
            logger.error(f"Metadata file not found: {metadata_file}")
            return None
        
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        version = metadata.get('version', datetime.now().strftime("%Y%m%d_%H%M%S"))
        metrics = metadata.get('metrics', {})
        
        training_info = {
            'training_samples': metadata.get('training_samples'),
            'test_samples': metadata.get('test_samples'),
            'training_date': metadata.get('training_date'),
            'features': metadata.get('features', []),
            'model_type': metadata.get('model_type'),
        }
        
        # Find artifact files
        artifacts = {}
        for file_path in model_dir.glob("*.pkl"):
            artifacts[file_path.stem] = file_path
        
        return self.register_model(
            model_name=model_name,
            version=version,
            metrics=metrics,
            training_info=training_info,
            model_artifacts=artifacts,
            set_active=True
        )

    def print_summary(self):
        """Print registry summary to console"""
        summary = self.get_registry_summary()
        
        print("\n" + "=" * 80)
        print("MODEL REGISTRY SUMMARY")
        print("=" * 80)
        print(f"Last updated: {summary['last_updated']}")
        print()
        
        for model_name, info in summary['models'].items():
            print(f"{model_name}:")
            print(f"  Active version: {info['active_version']}")
            print(f"  Total versions: {info['total_versions']}")
            
            if info['active_metrics']:
                print(f"  Active metrics:")
                for metric_name, value in info['active_metrics'].items():
                    print(f"    {metric_name}: {value:.4f}")
            
            print()


def main():
    """Example usage"""
    registry = ModelRegistry()
    
    # Auto-register models from metadata files
    model_names = ['fraud_detection', 'credit_scoring', 'spending_analysis']
    
    for model_name in model_names:
        logger.info(f"Checking {model_name}...")
        result = registry.auto_register_from_metadata(model_name)
        if result:
            logger.info(f"  ✓ Registered version {result['version']}")
    
    # Print summary
    registry.print_summary()


if __name__ == "__main__":
    main()
