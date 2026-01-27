"""
Artifact Storage Service - Handles S3 operations for FILE-type artifacts.

This service manages file uploads to S3, generates presigned download URLs,
and handles file deletion. It maintains backward compatibility with existing
LINK and TEXT artifacts.
"""

import boto3
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from flask import current_app
from app.models import Artifact, ArtifactType, StorageBackend, Scope
from app.extensions import db


class ArtifactStorageService:
    """Service for managing file storage in S3 for FILE-type artifacts"""
    
    def __init__(self):
        """Initialize S3 client"""
        self.s3_client = None
    
    def _ensure_client(self):
        """Ensure S3 client is initialized"""
        if not self.s3_client:
            self._initialize_s3_client()
        return self.s3_client

    def _initialize_s3_client(self):
        """Initialize boto3 S3 client with credentials from config"""
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
                region_name=current_app.config.get('AWS_REGION', 'us-east-1')
            )
        except Exception as e:
            current_app.logger.error(f"Failed to initialize S3 client: {str(e)}")
            self.s3_client = None
    
    def _generate_s3_key(self, startup_id, scope, original_filename):
        """
        Generate unique S3 key for file storage.
        Format: {startup_id}/{scope}/{timestamp}_{uuid}_{filename}
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = secure_filename(original_filename)
        
        # Map scope to folder structure
        scope_folder = str(scope).lower() if scope else 'general'
        
        return f"{startup_id}/{scope_folder}/{timestamp}_{unique_id}_{safe_filename}"
    
    def upload_file_artifact(
        self,
        file,
        startup_id,
        user_id,
        name,
        scope=Scope.GENERAL,
        linked_entity_type=None,
        linked_entity_id=None,
        description=None
    ):
        """
        Upload a file to S3 and create FILE-type artifact.
        
        Args:
            file: FileStorage object from request.files
            startup_id: ID of the startup
            user_id: ID of the user uploading
            name: Display name for the artifact
            scope: Scope enum value
            linked_entity_type: Optional entity type (e.g., 'transaction', 'customer')
            linked_entity_id: Optional entity ID
            description: Optional description
            
        Returns:
            Artifact object with S3 fields populated
            
        Raises:
            ValueError: If file validation fails
            Exception: If S3 upload fails
        """
        if not self._ensure_client():
            raise Exception("S3 client not initialized. Check AWS credentials.")
        
        current_app.logger.info("=== Starting file upload ===")
        
        # Validate file
        is_valid, error_msg = self._validate_file(file)
        if not is_valid:
            current_app.logger.error(f"File validation failed: {error_msg}")
            raise ValueError(error_msg)
        
        current_app.logger.info("File validation passed")
        
        # Get file metadata
        original_filename = file.filename
        file_size = self._get_file_size(file)
        mime_type = file.content_type or 'application/octet-stream'
        
        current_app.logger.info(f"File metadata: name={original_filename}, size={file_size}, mime={mime_type}")
        
        # Generate S3 key
        s3_bucket = current_app.config.get('AWS_S3_BUCKET')
        s3_region = current_app.config.get('AWS_REGION', 'us-east-1')
        
        current_app.logger.info(f"S3 config: bucket={s3_bucket}, region={s3_region}")
        
        # Validate S3 configuration
        if not s3_bucket:
            raise ValueError(
                "AWS_S3_BUCKET is not configured. Please set AWS_S3_BUCKET in your .env file "
                "and restart the Flask server."
            )
        
        s3_key = self._generate_s3_key(startup_id, scope, original_filename)
        
        current_app.logger.info(f"Generated S3 key: {s3_key}")
        
        try:
            # Upload to S3
            file.seek(0)  # Reset file pointer
            current_app.logger.info("Starting S3 upload...")
            self.s3_client.upload_fileobj(
                file,
                s3_bucket,
                s3_key,
                ExtraArgs={
                    'ContentType': mime_type,
                    'ServerSideEncryption': 'AES256'
                }
            )
            
            # Create artifact record
            artifact = Artifact(
                startup_id=startup_id,
                scope=scope,
                name=name,
                description=description,
                type=ArtifactType.FILE,
                location=s3_key,  # Store S3 key in location field
                storage_backend=StorageBackend.S3,
                file_size=file_size,
                mime_type=mime_type,
                original_filename=original_filename,
                s3_bucket=s3_bucket,
                s3_key=s3_key,
                s3_region=s3_region,
                uploaded_by=user_id,
                linked_to_type=linked_entity_type,
                linked_to_id=linked_entity_id
            )
            
            db.session.add(artifact)
            db.session.commit()
            
            current_app.logger.info(f"File uploaded to S3: {s3_key}")
            return artifact
            
        except ClientError as e:
            current_app.logger.error(f"S3 upload failed: {str(e)}")
            raise Exception(f"Failed to upload file to S3: {str(e)}")
    
    def get_download_url(self, artifact_id, expiration=None):
        """
        Generate presigned download URL for FILE artifacts.
        
        Args:
            artifact_id: ID of the artifact
            expiration: URL expiration time in seconds (default from config)
            
        Returns:
            str: Presigned download URL for FILE artifacts
            str: Direct location for LINK artifacts
            None: For TEXT artifacts (content in location field)
            
        Raises:
            ValueError: If artifact not found or deleted
            Exception: If URL generation fails
        """
        artifact = Artifact.query.get(artifact_id)
        if not artifact:
            raise ValueError("Artifact not found")
        
        if artifact.is_deleted:
            raise ValueError("Artifact has been deleted")
        
        # Handle different artifact types
        if artifact.type == ArtifactType.LINK:
            # For LINK artifacts, return the location directly
            return artifact.location
        
        if artifact.type == ArtifactType.TEXT:
            # For TEXT artifacts, content is in location field
            return None
        
        # For FILE artifacts with S3 storage
        if artifact.type == ArtifactType.FILE and artifact.storage_backend == StorageBackend.S3:
            if not self._ensure_client():
                raise Exception("S3 client not initialized")
            
            expiration = expiration or current_app.config.get('S3_URL_EXPIRATION', 3600)
            
            try:
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': artifact.s3_bucket,
                        'Key': artifact.s3_key
                    },
                    ExpiresIn=expiration
                )
                return url
            except ClientError as e:
                current_app.logger.error(f"Failed to generate presigned URL: {str(e)}")
                raise Exception(f"Failed to generate download URL: {str(e)}")
        
        # For FILE artifacts with LOCAL storage (legacy)
        if artifact.type == ArtifactType.FILE and artifact.storage_backend == StorageBackend.LOCAL:
            # Return local file path (would need separate handling in routes)
            return artifact.location
        
        return None
    
    def delete_artifact(self, artifact_id):
        """
        Soft delete artifact in DB and hard delete from S3 if applicable.
        
        Args:
            artifact_id: ID of the artifact to delete
            
        Returns:
            bool: True if successful
            
        Raises:
            ValueError: If artifact not found
        """
        artifact = Artifact.query.get(artifact_id)
        if not artifact:
            raise ValueError("Artifact not found")
        
        # Soft delete in database
        artifact.is_deleted = True
        artifact.deleted_at = datetime.utcnow()
        
        # Hard delete from S3 if it's a FILE with S3 storage
        if artifact.type == ArtifactType.FILE and artifact.storage_backend == StorageBackend.S3:
            if self._ensure_client():
                try:
                    self.s3_client.delete_object(
                        Bucket=artifact.s3_bucket,
                        Key=artifact.s3_key
                    )
                    current_app.logger.info(f"Deleted file from S3: {artifact.s3_key}")
                except ClientError as e:
                    current_app.logger.error(f"Failed to delete from S3: {str(e)}")
                    # Continue with soft delete even if S3 deletion fails
        
        db.session.commit()
        return True
    
    def _validate_file(self, file):
        """
        Validate file size and type.
        
        Returns:
            tuple: (is_valid: bool, error_message: str)
        """
        current_app.logger.info(f"Validating file: {file}")
        current_app.logger.info(f"File object: {type(file)}")
        current_app.logger.info(f"Has filename attr: {hasattr(file, 'filename')}")
        
        if not file or not file.filename:
            current_app.logger.error(f"File validation failed: no file or filename. file={file}, filename={getattr(file, 'filename', None)}")
            return False, "No file provided"
        
        current_app.logger.info(f"Filename: {file.filename}")
        
        # Check file size
        max_size = current_app.config.get('MAX_FILE_SIZE', 16 * 1024 * 1024)
        file_size = self._get_file_size(file)
        
        current_app.logger.info(f"File size: {file_size} bytes, max: {max_size} bytes")
        
        if file_size > max_size:
            return False, f"File size ({file_size} bytes) exceeds maximum allowed ({max_size} bytes)"
        
        # Check file extension
        allowed_extensions = {
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',  # Images
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',  # Documents
            'txt', 'md',  # Text files
            'zip'  # Archives
        }
        
        filename = file.filename.lower()
        if '.' not in filename:
            return False, "File must have an extension"
        
        extension = filename.rsplit('.', 1)[1]
        if extension not in allowed_extensions:
            return False, f"File type '.{extension}' not allowed"
        
        return True, ""
    
    def _get_file_size(self, file):
        """Get file size in bytes"""
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)  # Reset to beginning
        return size


# Singleton instance
artifact_storage_service = ArtifactStorageService()
