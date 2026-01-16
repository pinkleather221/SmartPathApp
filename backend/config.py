import os
import warnings
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # Application
    APP_NAME: str = "SmartPath API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))  # Render sets PORT dynamically
    
    # Database (PostgreSQL - Render Postgres or local)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:root@localhost:5432/smartpath"
    )
    SUPABASE_DB_URL: Optional[str] = os.getenv("SUPABASE_DB_URL")  # Optional: Supabase connection
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    
    # Database URL normalization - handles postgres:// -> postgresql:// conversion
    @property
    def database_url_fixed(self) -> str:
        url = self.DATABASE_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    
    # JWT Authentication - Will be validated after class instantiation
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # LLM Configuration (Gemini)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")  # gemini
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")  
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 8192
    
    # File Storage
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # local, s3, supabase
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_S3_BUCKET: Optional[str] = os.getenv("AWS_S3_BUCKET")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # OCR Configuration
    TESSERACT_CMD: Optional[str] = os.getenv("TESSERACT_CMD")
    TESSERACT_PATH: Optional[str] = os.getenv("TESSERACT_PATH")
    POPPLER_PATH: Optional[str] = os.getenv("POPPLER_PATH")
    OCR_PROVIDER: str = os.getenv("OCR_PROVIDER", "tesseract")  # tesseract or cloud
    
    # Redis Cache
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CACHE_TTL: int = 3600  # 1 hour
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # CORS - Production should restrict origins
    # In production, set CORS_ORIGINS env var with comma-separated list
    # Render frontend URLs should be added via environment variable
    # Store as string to avoid JSON parsing issues, parse in property
    CORS_ORIGINS: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:4173",  # Vite preview
            "http://localhost:8080",  # Vite dev server alternative port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
            "http://127.0.0.1:8080",  # Vite dev server alternative port
        ]
        
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "":
            return default_origins
        
        # Split by comma and add to defaults
        additional_origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return default_origins + additional_origins
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    
    # Security headers
    ENABLE_SECURITY_HEADERS: bool = True
    ALLOWED_HOSTS: str = ""
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        if not self.ALLOWED_HOSTS or self.ALLOWED_HOSTS.strip() == "":
            return []
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production" or os.getenv("RENDER") == "true"
    
    # Kenyan Context
    DEFAULT_CURRICULUM: str = "CBE"  # CBE or 8-4-4
    DEFAULT_TIMEZONE: str = "Africa/Nairobi"
    
    # Feature Flags
    ENABLE_OCR: bool = True
    ENABLE_LLM_CACHING: bool = True
    ENABLE_ANALYTICS: bool = True
    
@lru_cache()
def get_settings() -> Settings:
    settings_instance = Settings()
    
    # SECRET_KEY validation
    if not settings_instance.SECRET_KEY:
        if os.getenv("SKIP_SECRET_CHECK"):
            settings_instance.SECRET_KEY = "development-secret-key-change-in-production"
        else:
            raise ValueError("SECRET_KEY must be set. Set SKIP_SECRET_CHECK=1 to allow a temporary development default.")
    
    # Production safety checks
    if settings_instance.is_production:
        if settings_instance.DEBUG:
            warnings.warn("DEBUG=True in production! This should be False.", UserWarning)
        if not settings_instance.GEMINI_API_KEY:
            warnings.warn("GEMINI_API_KEY not set - AI features will be disabled.", UserWarning)
    
    return settings_instance


# Global settings instance
settings = get_settings()

# Initialize Supabase client
try:
    from supabase import create_client, Client
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        supabase = None
    else:
        try:
            from supabase.lib.client_options import ClientOptions
            supabase: Client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY,
                options=ClientOptions(postgrest_client_timeout=10),
            )
        except Exception:
            supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
except ImportError:
    supabase = None
    warnings.warn("Supabase client not available. Install with: pip install supabase", UserWarning)

