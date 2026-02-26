"""
Artifact Storage Service - Handles Azure Blob Storage operations for FILE-type artifacts.

This service manages file uploads to Azure Blob Storage, generates SAS download URLs,
and handles file deletion. It maintains backward compatibility with existing
LINK and TEXT artifacts.
"""

from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import AzureError
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime, timezone, timedelta
from flask import current_app
from app.models import Artifact, ArtifactType, StorageBackend, Scope
from app.extensions import db


class ArtifactStorageService:
    """Service for managing file storage in Azure Blob Storage for FILE-type artifacts"""

    def __init__(self):
        """Initialize Azure Blob client (lazy)"""
        self.blob_service_client = None

    def _ensure_client(self):
        """Ensure Blob service client is initialized"""
        if not self.blob_service_client:
            self._initialize_blob_client()
        return self.blob_service_client

    def _initialize_blob_client(self):
        """Initialize Azure BlobServiceClient with connection string from config"""
        try:
            connection_string = current_app.config.get('AZURE_STORAGE_CONNECTION_STRING')
            if not connection_string:
                raise ValueError("AZURE_STORAGE_CONNECTION_STRING is not set.")
            self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        except Exception as e:
            current_app.logger.error(f"Failed to initialize Azure Blob client: {str(e)}")
            self.blob_service_client = None

    def _generate_blob_name(self, startup_id, scope, original_filename):
        """
        Generate unique blob name for file storage.
        Format: {startup_id}/{scope}/{timestamp}_{uuid}_{filename}
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = secure_filename(original_filename)
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
        Upload a file to Azure Blob Storage and create a FILE-type artifact.

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
            Artifact object with Azure Blob fields populated

        Raises:
            ValueError: If file validation or config fails
            Exception: If Azure upload fails
        """
        if not self._ensure_client():
            raise Exception("Azure Blob client not initialized. Check AZURE_STORAGE_CONNECTION_STRING.")

        current_app.logger.info("=== Starting file upload (Azure Blob Storage) ===")

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

        # Get Azure config
        container_name = current_app.config.get('AZURE_STORAGE_CONTAINER_NAME')
        if not container_name:
            raise ValueError(
                "AZURE_STORAGE_CONTAINER_NAME is not configured. "
                "Please set it in your .env file and restart the server."
            )

        blob_name = self._generate_blob_name(startup_id, scope, original_filename)
        current_app.logger.info(f"Generated blob name: {blob_name}")

        try:
            # Upload to Azure Blob Storage
            file.seek(0)
            current_app.logger.info("Starting Azure Blob upload...")
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )
            blob_client.upload_blob(
                file,
                overwrite=True,
                content_settings=None  # content_type can be set here if needed
            )

            # Create artifact record
            # We reuse s3_bucket/s3_key/s3_region to store Azure equivalents
            # to avoid a DB migration (container_name / blob_name / azure)
            artifact = Artifact(
                startup_id=startup_id,
                scope=scope,
                name=name,
                description=description,
                type=ArtifactType.FILE,
                location=blob_name,            # blob name stored in location
                storage_backend=StorageBackend.S3,  # reusing S3 enum as AZURE placeholder
                file_size=file_size,
                mime_type=mime_type,
                original_filename=original_filename,
                s3_bucket=container_name,      # container name
                s3_key=blob_name,              # blob name
                s3_region='azure',             # sentinel to indicate Azure
                uploaded_by=user_id,
                linked_to_type=linked_entity_type,
                linked_to_id=linked_entity_id
            )

            db.session.add(artifact)
            db.session.commit()

            current_app.logger.info(f"File uploaded to Azure Blob: {blob_name}")
            return artifact

        except AzureError as e:
            current_app.logger.error(f"Azure Blob upload failed: {str(e)}")
            raise Exception(f"Failed to upload file to Azure Blob Storage: {str(e)}")

    def get_download_url(self, artifact_id, expiration=None):
        """
        Generate a SAS download URL for FILE artifacts.

        Args:
            artifact_id: ID of the artifact
            expiration: URL expiration time in seconds (default from config)

        Returns:
            str: SAS URL for FILE artifacts
            str: Direct location for LINK artifacts
            None: For TEXT artifacts
        """
        artifact = Artifact.query.get(artifact_id)
        if not artifact:
            raise ValueError("Artifact not found")

        if artifact.is_deleted:
            raise ValueError("Artifact has been deleted")

        # Handle LINK and TEXT artifact types (unchanged)
        if artifact.type == ArtifactType.LINK:
            return artifact.location

        if artifact.type == ArtifactType.TEXT:
            return None

        # For FILE artifacts backed by Azure Blob Storage
        if artifact.type == ArtifactType.FILE:
            if not self._ensure_client():
                raise Exception("Azure Blob client not initialized")

            expiration_seconds = expiration or current_app.config.get('AZURE_BLOB_URL_EXPIRATION', 3600)
            container_name = artifact.s3_bucket   # container stored here
            blob_name = artifact.s3_key            # blob name stored here

            try:
                # Extract account name and key from the client
                account_name = self.blob_service_client.account_name
                account_key = self.blob_service_client.credential.account_key

                sas_token = generate_blob_sas(
                    account_name=account_name,
                    container_name=container_name,
                    blob_name=blob_name,
                    account_key=account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.now(timezone.utc) + timedelta(seconds=expiration_seconds)
                )

                blob_url = (
                    f"https://{account_name}.blob.core.windows.net"
                    f"/{container_name}/{blob_name}?{sas_token}"
                )
                return blob_url

            except AzureError as e:
                current_app.logger.error(f"Failed to generate SAS URL: {str(e)}")
                raise Exception(f"Failed to generate download URL: {str(e)}")

        return None

    def delete_artifact(self, artifact_id):
        """
        Soft-delete artifact in DB and hard-delete the blob from Azure.

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

        # Hard delete from Azure Blob Storage for FILE artifacts
        if artifact.type == ArtifactType.FILE:
            if self._ensure_client():
                container_name = artifact.s3_bucket
                blob_name = artifact.s3_key
                try:
                    blob_client = self.blob_service_client.get_blob_client(
                        container=container_name,
                        blob=blob_name
                    )
                    blob_client.delete_blob()
                    current_app.logger.info(f"Deleted blob from Azure: {blob_name}")
                except AzureError as e:
                    current_app.logger.error(f"Failed to delete blob from Azure: {str(e)}")
                    # Continue with soft delete even if blob deletion fails

        db.session.commit()
        return True

    def _validate_file(self, file):
        """
        Validate file size and type.

        Returns:
            tuple: (is_valid: bool, error_message: str)
        """
        current_app.logger.info(f"Validating file: {file}")

        if not file or not file.filename:
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
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',   # Images
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',   # Documents
            'txt', 'md',                                     # Text files
            'zip'                                            # Archives
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
        file.seek(0)
        return size


# Singleton instance
artifact_storage_service = ArtifactStorageService()
