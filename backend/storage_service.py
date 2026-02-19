import os
import shutil
import uuid
from abc import ABC, abstractmethod
from typing import Optional
from fastapi import UploadFile
from config import settings
import logging

logger = logging.getLogger(__name__)

class StorageProvider(ABC):
    @abstractmethod
    async def upload_file(self, file: UploadFile, path: str) -> str:
        """Upload a file and return its public URL."""
        pass

    @abstractmethod
    async def delete_file(self, path: str) -> bool:
        """Delete a file."""
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file: UploadFile, path: str) -> str:
        # Sanitize path to prevent directory traversal
        filename = os.path.basename(path)
        # Ensure unique filename
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Return relative URL for static mounting
            # Assuming app mounts /uploads -> upload_dir
            return f"/uploads/{unique_filename}"
        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            raise e

    async def delete_file(self, path: str) -> bool:
        # Extract filename from URL (e.g. /uploads/file.pdf -> file.pdf)
        filename = os.path.basename(path)
        file_path = os.path.join(self.upload_dir, filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            return False

class SupabaseStorageProvider(StorageProvider):
    def __init__(self, bucket_name: str = "resource-files"):
        from config import supabase
        self.client = supabase
        self.bucket = bucket_name
        # Verify bucket exists on startup
        try:
            buckets = self.client.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            if self.bucket not in bucket_names:
                logger.warning(f"Supabase bucket '{self.bucket}' not found. Available: {bucket_names}")
            else:
                logger.info(f"Supabase Storage connected to bucket '{self.bucket}'")
        except Exception as e:
            logger.warning(f"Could not verify Supabase bucket: {e}")

    async def upload_file(self, file: UploadFile, path: str) -> str:
        if not self.client:
            raise Exception("Supabase client not initialized")

        # Read file content
        content = await file.read()
        
        # Ensure unique path
        filename = os.path.basename(path)
        name, ext = os.path.splitext(filename)
        unique_path = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        try:
            # Upload to bucket
            logger.info(f"Uploading '{unique_path}' to Supabase bucket '{self.bucket}' ({len(content)} bytes)")
            response = self.client.storage.from_(self.bucket).upload(
                path=unique_path,
                file=content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket).get_public_url(unique_path)
            logger.info(f"Upload successful: {public_url}")
            return public_url
        except Exception as e:
            logger.error(f"Supabase upload failed: {e}")
            raise e
        finally:
            file.file.seek(0)  # Reset file pointer if needed elsewhere

    async def delete_file(self, path: str) -> bool:
        if not self.client:
            return False
            
        # Extract path from URL
        # URL format: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH
        try:
            # Simple heuristic: take the last part of URL as filename if flat structure
            # Or parse properly if nested. For now assuming flat unique filenames.
            filename = path.split('/')[-1]
            
            self.client.storage.from_(self.bucket).remove([filename])
            return True
        except Exception as e:
            logger.error(f"Supabase delete failed: {e}")
            return False

def get_storage_provider() -> StorageProvider:
    """Factory to get the configured storage provider."""
    # Use environment variable or config setting
    storage_type = os.getenv("STORAGE_TYPE", "local").lower()
    
    if storage_type == "supabase":
        logger.info("Using Supabase Storage provider")
        return SupabaseStorageProvider()
    
    # Default to local for dev or fallback
    logger.info("Using Local Storage provider")
    return LocalStorageProvider(settings.UPLOAD_DIR)

storage_service = get_storage_provider()
