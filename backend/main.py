import os
import sys
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
import aiofiles

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
from models import (
    UserRegister, UserLogin, Token, UserProfile, UserProfileUpdate,
    ReportUpload, ReportResponse, ReportAnalysis,
    PerformanceDashboard, GradeTrend, PerformancePrediction,
    FlashcardGenerate, FlashcardResponse, FlashcardReviewRequest,
    FlashcardEvaluateRequest, FlashcardEvaluateResponse,
    CareerRecommendationResponse, CareerQuizRequest,
    StudyPlanGenerate, StudyPlanUpdate, StudyPlanResponse, StudySessionLog, StudySessionResponse,
    LearningInsightResponse, AcademicFeedback,
    MessageResponse, ErrorResponse, PaginatedResponse,
    InviteCodeResponse, InviteCodeRedeem, LinkedStudentResponse, LinkedGuardianResponse,
    StudentDashboardResponse, GuardianInsightCreate, PriorityLevel,
    ChatRequest, MessageResponse,
    ResourceCreate, ResourceUpdate, ResourceResponse, ResourceQuery
)
from pydantic import BaseModel, EmailStr

def _convert_priority_to_int(priority: PriorityLevel) -> int:
    """Converts PriorityLevel enum to an integer for database storage."""
    if priority == PriorityLevel.LOW:
        return 1
    elif priority == PriorityLevel.MEDIUM:
        return 5
    elif priority == PriorityLevel.HIGH:
        return 8
    return 5  # Default to medium if somehow unexpected

from auth import (
    authenticate_user, get_current_active_user, create_access_token,
    get_password_hash, require_user_type
)
from supabase_db import (
    get_user_by_email, create_user, get_user_insights, delete_academic_report,
    delete_flashcard, update_career_recommendation, delete_career_recommendation,
    delete_study_plan,
    create_resource, update_resource, delete_resource, get_resource, list_resources,
    favorite_resource, unfavorite_resource
)
from services import (
    ReportService, PerformanceService, FlashcardService,
    CareerService, StudyPlanService, InsightService,
    InviteService, RelationshipService
)
from utils import extract_grades_from_text, normalize_subject_name, extract_grades_from_file

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SmartPath API - AI-powered learning and career guidance for Kenyan students",
    docs_url="/docs" if not settings.is_production else None,  # Disable docs in production
    redoc_url="/redoc" if not settings.is_production else None,
)

# Mount static files directory for uploaded files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions."""
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    if settings.is_production:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again later."}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

cors_origins = settings.cors_origins_list.copy()
vercel_pattern = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Exact matches
    allow_origin_regex=vercel_pattern,  # Pattern for Vercel preview URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["Authorization", "Content-Type", "Location"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if settings.ENABLE_SECURITY_HEADERS:
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            if settings.is_production:
                response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Trusted host middleware for production security
if settings.is_production:
    trusted_hosts = os.getenv("TRUSTED_HOSTS", "").split(",")
    if trusted_hosts and trusted_hosts[0]:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=trusted_hosts
        )

# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    try:
        # Import supabase client
        from config import supabase

        if supabase is None:
            raise Exception("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY in .env")

        # Test Supabase connection
        test_response = supabase.table('users').select('user_id').limit(1).execute()
        logger.info("Supabase connection successful")

    except Exception as e:
        logger.error(f"Supabase initialization error: {e}", exc_info=True)
        if settings.is_production:
            # In production, fail fast if Supabase is not available
            raise
        else:
            # In development, log warning but continue (allows testing without DB)
            logger.warning("Server will start but Supabase features may not work.")
            logger.warning("Make sure SUPABASE_URL and SUPABASE_KEY are correct in .env")
    
    logger.info(f"SmartPath API v{settings.APP_VERSION} started")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("SmartPath API shutting down")


# ==================== HEALTH CHECK ====================

@app.get("/health")
@app.get(f"{settings.API_V1_PREFIX}/health")
async def health_check():
    """Health check endpoint to test server connectivity."""
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}


# ==================== AUTHENTICATION ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/auth/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register a new user."""
    from email_service import email_service
    
    # Check if user exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user data
    user_data_dict = {
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "user_type": user_data.user_type.value,
        "grade_level": user_data.grade_level,
        "curriculum_type": user_data.curriculum_type.value,
        "phone_number": user_data.phone_number,
        "school_name": user_data.school_name,
        "is_active": True
    }

    user = create_user(user_data_dict)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
        
    # Send welcome email
    try:
        await email_service.send_welcome_email(user['email'], user['full_name'])
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")

    return MessageResponse(
        message="User registered successfully",
        success=True,
        data={"user_id": user["user_id"]}
    )


@app.post(f"{settings.API_V1_PREFIX}/auth/login", response_model=Token)
def login(credentials: UserLogin):
    """Login and get access token."""
    user = authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user['user_id'])}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@app.post(f"{settings.API_V1_PREFIX}/auth/forgot-password")
async def forgot_password(
    email: EmailStr = Form(...),
):
    """Request a password reset email."""
    from auth import generate_reset_token
    from email_service import email_service
    
    user = get_user_by_email(email)
    if user:
        token = generate_reset_token()
        # Set token expiration to 1 hour
        expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        
        # Save token to user record
        update_user(user['user_id'], {
            "reset_token": token,
            "reset_token_expires": expires
        })
        
        # Send email
        await email_service.send_reset_password_email(email, token)
        
    # Always return success to prevent email enumeration
    return {"message": "If an account exists with this email, a reset link has been sent."}

@app.post(f"{settings.API_V1_PREFIX}/auth/reset-password")
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...)
):
    """Reset password with a valid token."""
    from auth import get_password_hash
    from supabase_db import get_user_by_reset_token
    
    user = get_user_by_reset_token(token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    # Update password and clear token
    password_hash = get_password_hash(new_password)
    update_user(user['user_id'], {
        "password_hash": password_hash,
        "reset_token": None,
        "reset_token_expires": None
    })
    
    return {"message": "Password reset successfully. You can now login."}

# ==================== RESOURCE LIBRARY ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/resources", response_model=PaginatedResponse)
def get_resources(
    q: Optional[str] = None,
    subject: Optional[str] = None,
    grade_level: Optional[int] = None,
    type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_active_user)
):
    filters = {"q": q, "subject": subject, "grade_level": grade_level, "type": type}
    data = list_resources(filters, user_id=current_user.get("user_id") if current_user else None, page=page, page_size=page_size)
    return PaginatedResponse(
        items=[ResourceResponse.model_validate(item) for item in data["items"]],
        total=data["total"],
        page=data["page"],
        page_size=data["page_size"],
        total_pages=(data["total"] + page_size - 1) // page_size
    )

@app.get(f"{settings.API_V1_PREFIX}/resources/{{resource_id}}", response_model=ResourceResponse)
def get_resource_detail(
    resource_id: int,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_active_user)
):
    resource = get_resource(resource_id, user_id=current_user.get("user_id") if current_user else None)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return ResourceResponse.model_validate(resource)

@app.post(f"{settings.API_V1_PREFIX}/resources", response_model=ResourceResponse)
def create_resource_item(
    payload: ResourceCreate,
    admin_user: Dict[str, Any] = Depends(require_user_type("admin"))
):
    data = payload.model_dump()
    created = create_resource(data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create resource")
    return ResourceResponse.model_validate(created)

@app.put(f"{settings.API_V1_PREFIX}/resources/{{resource_id}}", response_model=ResourceResponse)
def update_resource_item(
    resource_id: int,
    payload: ResourceUpdate,
    admin_user: Dict[str, Any] = Depends(require_user_type("admin"))
):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = update_resource(resource_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found or update failed")
    return ResourceResponse.model_validate(updated)

@app.delete(f"{settings.API_V1_PREFIX}/resources/{{resource_id}}", response_model=MessageResponse)
def delete_resource_item(
    resource_id: int,
    admin_user: Dict[str, Any] = Depends(require_user_type("admin"))
):
    ok = delete_resource(resource_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Resource not found or delete failed")
    return MessageResponse(message="Resource deleted", success=True)

@app.post(f"{settings.API_V1_PREFIX}/resources/{{resource_id}}/favorite", response_model=MessageResponse)
def favorite_resource_item(
    resource_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    ok = favorite_resource(current_user["user_id"], resource_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to favorite resource")
    return MessageResponse(message="Favorited", success=True)

@app.delete(f"{settings.API_V1_PREFIX}/resources/{{resource_id}}/favorite", response_model=MessageResponse)
def unfavorite_resource_item(
    resource_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    ok = unfavorite_resource(current_user["user_id"], resource_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to remove favorite")
    return MessageResponse(message="Unfavorited", success=True)

@app.get(f"{settings.API_V1_PREFIX}/auth/profile", response_model=UserProfile)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_active_user)):
    """Get current user's profile."""
    # Transform user data for Pydantic validation
    user_data = current_user.copy()
    if 'user_type' in user_data and isinstance(user_data['user_type'], str):
        user_data['user_type'] = user_data['user_type'].lower()
    if 'curriculum_type' in user_data and isinstance(user_data['curriculum_type'], str):
        user_data['curriculum_type'] = user_data['curriculum_type'].lower()

    return UserProfile.model_validate(user_data)


@app.put(f"{settings.API_V1_PREFIX}/auth/profile", response_model=UserProfile)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Update current user's profile."""
    # Update only provided fields
    update_data = {}
    if profile_update.full_name is not None:
        update_data['full_name'] = profile_update.full_name
    if profile_update.phone_number is not None:
        update_data['phone_number'] = profile_update.phone_number
    if profile_update.school_name is not None:
        update_data['school_name'] = profile_update.school_name
    if profile_update.grade_level is not None:
        update_data['grade_level'] = profile_update.grade_level
    if profile_update.curriculum_type is not None:
        update_data['curriculum_type'] = profile_update.curriculum_type.value
    if profile_update.profile_picture is not None:
        update_data['profile_picture'] = profile_update.profile_picture

    updated_user = update_user(current_user['user_id'], update_data)

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

    # Transform user data for Pydantic validation
    user_data = current_user.copy()
    user_data.pop('_sa_instance_state', None)  # Remove SQLAlchemy internal state
    if 'user_type' in user_data and isinstance(user_data['user_type'], str):
        user_data['user_type'] = user_data['user_type'].lower()
    if 'curriculum_type' in user_data and isinstance(user_data['curriculum_type'], str):
        user_data['curriculum_type'] = user_data['curriculum_type'].lower()

    return UserProfile.model_validate(user_data)


@app.post(f"{settings.API_V1_PREFIX}/auth/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Upload a profile picture for the current user."""
    from supabase_db import update_user

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )

    # Validate file size (max 5MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)

    if file_size > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB."
        )

    # Generate unique filename
    import uuid
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"profile_{current_user['user_id']}_{uuid.uuid4().hex}.{file_extension}"

    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Save file
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    # Generate URL for the file
    file_url = f"/uploads/{unique_filename}"

    # Update user's profile picture in database
    updated_user = update_user(current_user['user_id'], {'profile_picture': file_url})
    if not updated_user:
        logger.error(f"Failed to update profile picture for user {current_user['user_id']}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile picture"
        )

    return {"profile_picture_url": file_url, "message": "Profile picture uploaded successfully"}



# ==================== MATH SOLVER ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/math/solve")
async def solve_math(
    file: Optional[UploadFile] = File(None),
    prompt: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Solve a math problem from text or uploaded image."""
    from llm_service import llm_service
    
    if not file and not prompt:
        raise HTTPException(status_code=400, detail="Please provide either an image or a text problem.")

    image_bytes = None
    image_mime_type = None

    if file:
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are supported.")
        image_bytes = await file.read()
        image_mime_type = file.content_type

    try:
        solution = await llm_service.solve_math_problem(
            problem_text=prompt,
            image_bytes=image_bytes,
            image_mime_type=image_mime_type
        )
        return {"solution": solution, "success": True}
    except Exception as e:
        logger.error(f"Math solver route error: {e}")
        raise HTTPException(status_code=500, detail="Failed to solve math problem")


@app.post(f"{settings.API_V1_PREFIX}/math/practice")
async def generate_math_practice(
    subject: str = Form(...),
    topic: str = Form(...),
    grade_level: int = Form(...),
    difficulty: str = Form("medium"),
    count: int = Form(3),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Generate practice math problems."""
    from llm_service import llm_service
    
    try:
        problems = await llm_service.generate_practice_problems(
            subject=subject,
            topic=topic,
            grade_level=grade_level,
            count=count,
            difficulty=difficulty
        )
        return {"problems": problems, "success": True}
    except Exception as e:
        logger.error(f"Math practice route error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate practice problems")


# ==================== CHAT ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/chat/send")
async def chat_send(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Send a message to the AI Tutor."""
    from llm_service import llm_service
    
    try:
        # Pass user context (grade level) if not explicitly provided
        grade_level = request.grade_level
        if grade_level is None and current_user.get("grade_level"):
             grade_level = current_user.get("grade_level")
             
        # Convert history to dict format for service
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        response_text = await llm_service.chat_with_tutor(
            message=request.message,
            history=history_dicts,
            subject=request.subject,
            grade_level=grade_level,
            context_type=request.context
        )
        
        return {"message": response_text, "success": True}
    except Exception as e:
        logger.error(f"Chat route error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI Tutor")


# ==================== REPORT ROUTES ====================

class OCRPreviewResponse(BaseModel):
    """Response model for OCR preview."""
    extracted_text: str
    grades: dict[str, str]
    success: bool
    message: str


@app.post(f"{settings.API_V1_PREFIX}/reports/ocr-preview")
async def preview_ocr(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Preview OCR extraction without saving the report.
    
    This endpoint allows users to see what grades were extracted from their file
    before committing to save the report. Useful for verification and correction.
    """
    # Validate file size
    try:
        if hasattr(file, "size") and file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum allowed size"
            )
    except Exception:
        # Some ASGI servers may not provide size; skip and rely on downstream handling
        pass
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not supported. Please upload PDF, JPG, or PNG files."
        )
    
    # Create temporary file
    import tempfile
    timestamp = datetime.utcnow().timestamp()
    
    try:
        # Save to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Extract grades using Gemini AI
        from utils import extract_grades_from_file
        
        # Extract grades directly (Gemini handles both image and PDF)
        grades = extract_grades_from_file(tmp_path, file.content_type)
        
        # Get a preview message
        raw_text = f"Analyzed with Gemini AI. Found {len(grades)} subjects." if grades else "No grades detected."
        
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except PermissionError:
            pass
        
        if not grades:
            return OCRPreviewResponse(
                extracted_text=raw_text[:1000],  # First 1000 chars
                grades={},
                success=False,
                message="No grades could be extracted from the file. Please check the image quality and try again, or enter grades manually."
            )
        
        return OCRPreviewResponse(
            extracted_text=raw_text[:1000],  # First 1000 chars for debugging
            grades=grades,
            success=True,
            message=f"Successfully extracted {len(grades)} grades. Please review and confirm."
        )
        
    except Exception as e:
        # Clean up on error
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except PermissionError:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@app.post(f"{settings.API_V1_PREFIX}/reports/upload", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    term: str = Form(...),
    year: int = Form(...),
    report_date: datetime = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Upload and process an academic report with OCR."""
    # Validate file size
    if file.size and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed size"
        )
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not supported. Please upload PDF, JPG, or PNG files."
        )
    
    # Save file
    timestamp = datetime.utcnow().timestamp()
    file_path = os.path.join(
        settings.UPLOAD_DIR, 
        f"{current_user['user_id']}_{timestamp}_{file.filename}"
    )
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Perform OCR to extract grades
        print(f"🔍 Processing file with OCR: {file.filename}")
        grades_json = extract_grades_from_file(file_path, file.content_type)
        print(f"✅ Extracted {len(grades_json)} grades: {grades_json}")
        
        # If no grades found, return a helpful message
        if not grades_json:
            print("⚠️ No grades extracted from file")
            # Still create the report but with empty grades
            # The user can manually enter grades later
        
        # Create report
        report = ReportService.create_report(
            user_id=current_user['user_id'],
            report_date=report_date,
            term=term,
            year=year,
            grades_json=grades_json,
            file_path=file_path,
            file_type=file.content_type
        )
        
        # Auto-generate insights after report upload
        try:
            logger.info(f"Auto-generating insights for user {current_user['user_id']} after report upload")
            await InsightService.generate_feedback(current_user['user_id'])
        except Exception as e:
            logger.warning(f"Could not auto-generate insights after report upload: {e}")
            # Don't fail the report upload if insight generation fails
        
        return ReportResponse.model_validate(report)
        
    except Exception as e:
        # Clean up file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        
        print(f"❌ Error processing upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@app.post(f"{settings.API_V1_PREFIX}/reports/upload-json", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_report_json(
    report_data: ReportUpload,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Upload report data directly as JSON (for testing or manual entry)."""
    if not report_data.grades_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grades_json is required in request body"
        )
    
    report = ReportService.create_report(
        user_id=current_user['user_id'],
        report_date=report_data.report_date,
        term=report_data.term,
        year=report_data.year,
        grades_json=report_data.grades_json
    )
    
    # Auto-generate insights after report upload
    try:
        logger.info(f"Auto-generating insights for user {current_user['user_id']} after report upload")
        await InsightService.generate_feedback(current_user['user_id'])
    except Exception as e:
        logger.warning(f"Could not auto-generate insights after report upload: {e}")
        # Don't fail the report upload if insight generation fails
    
    return ReportResponse.model_validate(report)


@app.get(f"{settings.API_V1_PREFIX}/reports/history", response_model=List[ReportResponse])
async def get_report_history(
    limit: int = 10,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get user's report history."""
    reports = ReportService.get_report_history(current_user['user_id'], limit)
    return [ReportResponse.model_validate(r) for r in reports]


@app.post(f"{settings.API_V1_PREFIX}/reports/analyze", response_model=ReportAnalysis)
async def analyze_report(
    report_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Analyze a specific report and generate AI-powered insights."""
    analysis = await ReportService.analyze_report(report_id)
    return analysis


@app.delete(f"{settings.API_V1_PREFIX}/reports/{{report_id}}", response_model=MessageResponse)
async def delete_report(
    report_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Delete a report."""
    from supabase_db import supabase, delete_academic_report
    import os

    # First get the report to check for file_path
    try:
        response = supabase.table('academic_reports').select('file_path').eq('report_id', report_id).eq('user_id', current_user['user_id']).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        report = response.data[0]

        # Delete associated file if exists
        if report.get('file_path') and os.path.exists(report['file_path']):
            try:
                os.remove(report['file_path'])
            except Exception as e:
                print(f"Warning: Could not delete file {report['file_path']}: {e}")

    except Exception as e:
        logger.error(f"Error getting report for deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting report"
        )

    # Delete from database
    success = delete_academic_report(report_id, current_user['user_id'])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    return MessageResponse(
        message="Report deleted successfully",
        success=True
    )


# ==================== PERFORMANCE ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/performance/dashboard", response_model=PerformanceDashboard)
async def get_performance_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get performance dashboard data."""
    dashboard = PerformanceService.get_dashboard(current_user['user_id'])
    return dashboard


@app.get(f"{settings.API_V1_PREFIX}/performance/trends", response_model=List[GradeTrend])
async def get_performance_trends(
    subject: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get grade trends for subjects."""
    trends = PerformanceService.get_grade_trends(current_user['user_id'], subject)
    return trends


@app.get(f"{settings.API_V1_PREFIX}/performance/predictions", response_model=List[PerformancePrediction])
async def get_performance_predictions(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get performance predictions."""
    predictions = await PerformanceService.get_predictions(current_user['user_id'])
    return predictions


# ==================== FLASHCARD ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/flashcards/generate", response_model=List[FlashcardResponse], status_code=status.HTTP_201_CREATED)
async def generate_flashcards(
    request: FlashcardGenerate,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Generate flashcards using AI."""
    flashcards = await FlashcardService.generate_flashcards(
        user_id=current_user['user_id'],
        subject=request.subject,
        topic=request.topic,
        count=request.count,
        grade_level=request.grade_level or current_user['grade_level'] or 10,
        curriculum=current_user['curriculum_type']
    )
    
    return [FlashcardResponse.model_validate(card) for card in flashcards]


@app.get(f"{settings.API_V1_PREFIX}/flashcards/list", response_model=List[FlashcardResponse])
async def list_flashcards(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """List user's flashcards."""
    from supabase_db import supabase

    try:
        # Build query dynamically
        query = supabase.table('flashcards').select('*').eq('user_id', current_user['user_id']).eq('is_active', True)

        if subject:
            query = query.eq('subject', subject)
        if difficulty:
            query = query.eq('difficulty', difficulty.lower())  # Assuming difficulty is stored as lowercase

        response = query.order('created_at', desc=True).limit(limit).execute()
        reviews_resp = supabase.table('flashcard_reviews').select('card_id, correct').eq('user_id', current_user['user_id']).execute()
        review_counts: Dict[int, Dict[str, int]] = {}
        for r in reviews_resp.data or []:
            cid = r.get('card_id')
            if cid is None:
                continue
            if cid not in review_counts:
                review_counts[cid] = {'total': 0, 'correct': 0}
            review_counts[cid]['total'] += 1
            if r.get('correct'):
                review_counts[cid]['correct'] += 1
        normalized_cards = []
        for card in response.data or []:
            c = dict(card)
            if 'card_id' not in c and 'flashcard_id' in c:
                c['card_id'] = c['flashcard_id']
            if 'question' not in c and 'question_text' in c:
                c['question'] = c['question_text']
            if 'answer' not in c and 'answer_text' in c:
                c['answer'] = c['answer_text']
            if isinstance(c.get('difficulty'), str):
                c['difficulty'] = c['difficulty'].lower()
            cid = c.get('card_id')
            counts = review_counts.get(cid, {'total': c.get('times_reviewed', 0) or 0, 'correct': c.get('times_correct', 0) or 0})
            c['times_reviewed'] = counts['total']
            c['times_correct'] = counts['correct']
            normalized_cards.append(FlashcardResponse.model_validate(c))
        return normalized_cards
    except Exception as e:
        logger.error(f"Error listing flashcards: {e}")
        return []


@app.delete(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}", response_model=MessageResponse)
async def delete_flashcard(
    card_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Delete a flashcard."""
    from supabase_db import delete_flashcard as delete_flashcard_db

    success = delete_flashcard_db(card_id, current_user['user_id'])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )

    return MessageResponse(message="Flashcard deleted successfully")


@app.post(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}/review", response_model=MessageResponse)
async def review_flashcard(
    card_id: int,
    review_data: FlashcardReviewRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Record a flashcard review."""
    review_result = FlashcardService.review_flashcard(
        card_id=card_id,
        user_id=current_user['user_id'],
        correct=review_data.correct,
        user_answer=review_data.user_answer
    )
    
    return MessageResponse(
        message="Review recorded successfully",
        success=True,
        data=review_result
    )


@app.post(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}/evaluate", response_model=FlashcardEvaluateResponse)
async def evaluate_flashcard_answer(
    card_id: int,
    request: FlashcardEvaluateRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Evaluate student's answer to a flashcard."""

    evaluation = await FlashcardService.evaluate_answer(
        card_id=card_id,
        user_id=current_user['user_id'],
        user_answer=request.user_answer
    )

    return FlashcardEvaluateResponse(**evaluation)


# ==================== CAREER ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/career/recommendations", response_model=List[CareerRecommendationResponse])
async def get_career_recommendations(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get career recommendations."""
    from supabase_db import get_user_career_recommendations

    recommendations = get_user_career_recommendations(current_user['user_id'])

    # Sort by match_score descending
    recommendations.sort(key=lambda x: x.get('match_score', 0), reverse=True)

    if not recommendations:
        logger.info(f"No existing career recommendations for user {current_user['user_id']}. Generating new ones.")
        recommendations = await CareerService.generate_recommendations(user_id=current_user['user_id'])

    return [CareerRecommendationResponse.model_validate(r) for r in recommendations]


@app.post(f"{settings.API_V1_PREFIX}/career/quiz", response_model=List[CareerRecommendationResponse])
async def career_quiz(
    quiz_data: CareerQuizRequest,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Generate career recommendations based on quiz."""
    recommendations = await CareerService.generate_recommendations(
        user_id=current_user['user_id'],
        interests=quiz_data.interests
    )
    
    return [CareerRecommendationResponse.model_validate(r) for r in recommendations]


@app.get(f"{settings.API_V1_PREFIX}/career/{{recommendation_id}}/details", response_model=CareerRecommendationResponse)
async def get_career_details(
    recommendation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get details of a specific career recommendation."""
    from supabase_db import supabase

    try:
        response = supabase.table('career_recommendations').select('*').eq('recommendation_id', recommendation_id).eq('user_id', current_user['user_id']).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Career recommendation not found"
            )

        return CareerRecommendationResponse.model_validate(response.data[0])
    except Exception as e:
        logger.error(f"Error getting career recommendation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving career recommendation"
        )

@app.post(f"{settings.API_V1_PREFIX}/career/{{recommendation_id}}/favorite", response_model=MessageResponse)
async def favorite_career(
    recommendation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    from supabase_db import update_career_recommendation
    updated = update_career_recommendation(recommendation_id, {"is_favorite": True})
    if not updated:
        raise HTTPException(status_code=404, detail="Career recommendation not found")
    return MessageResponse(message="Career saved to favorites", data={"recommendation_id": recommendation_id})

@app.delete(f"{settings.API_V1_PREFIX}/career/{{recommendation_id}}/favorite", response_model=MessageResponse)
async def unfavorite_career(
    recommendation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    from supabase_db import update_career_recommendation
    updated = update_career_recommendation(recommendation_id, {"is_favorite": False})
    if not updated:
        raise HTTPException(status_code=404, detail="Career recommendation not found")
    return MessageResponse(message="Career removed from favorites", data={"recommendation_id": recommendation_id})

@app.post(f"{settings.API_V1_PREFIX}/career/{{recommendation_id}}/share", response_model=MessageResponse)
async def share_career(
    recommendation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    from supabase_db import update_career_recommendation
    try:
        update_career_recommendation(recommendation_id, {"share_count": 1})
    except Exception:
        pass
    share_url = f"/career/{recommendation_id}"
    return MessageResponse(message="Share link generated", data={"share_url": share_url})


# ==================== STUDY PLAN ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/study-plans/generate", response_model=List[StudyPlanResponse], status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    request: StudyPlanGenerate,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Generate a personalized study plan."""
    try:
        logger.info(f"Generating study plan for user {current_user['user_id']} with subjects: {request.subjects}")
        if request.focus_areas:
            logger.info(f"Focus areas provided: {request.focus_areas}")
        else:
            logger.info("No focus areas provided - will generate general study plan")
        
        plans = await StudyPlanService.generate_study_plan(
            user_id=current_user['user_id'],
            subjects=request.subjects,
            available_hours=request.available_hours_per_day,
            exam_date=request.exam_date,
            focus_areas=request.focus_areas,
            priority=_convert_priority_to_int(request.priority) if request.priority else 5, # Convert string priority to int
            active_days=request.active_days # Pass active days to service
        )
        
        # Log response details for debugging
        if plans:
            logger.info(f"Generated {len(plans)} study plans")
            for plan in plans:
                if isinstance(plan, dict):
                    subject = plan.get("subject")
                    focus_area = plan.get("focus_area")
                    study_strategy = plan.get("study_strategy") or plan.get("strategy")
                else:
                    subject = getattr(plan, "subject", None)
                    focus_area = getattr(plan, "focus_area", None)
                    study_strategy = getattr(plan, "study_strategy", None) or getattr(plan, "strategy", None)
                logger.debug(
                    f"Plan for {subject}: focus_area={(focus_area[:100] if focus_area else 'None')}, "
                    f"strategy_length={(len(study_strategy) if study_strategy else 0)}"
                )
        
        if not plans:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate study plan. Please try again."
            )
        
        logger.info(f"Successfully generated {len(plans)} study plan(s) for user {current_user['user_id']}")
        return [StudyPlanResponse.model_validate(plan) for plan in plans]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating study plan: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate study plan: {str(e)}"
        )



@app.get(f"{settings.API_V1_PREFIX}/study-plans/all", response_model=List[dict])
async def get_all_study_plans(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get all study plans for the current user, regardless of status."""
    from supabase_db import get_user_study_plans
    from supabase_db import supabase

    plans = get_user_study_plans(current_user['user_id'])

    sessions_resp = supabase.table("study_sessions").select("session_id, plan_id, date, duration_minutes, completed").eq("user_id", current_user["user_id"]).order("date", desc=True).limit(500).execute()
    sessions_by_plan: Dict[int, List[Dict[str, Any]]] = {}
    minutes_by_plan: Dict[int, int] = {}
    for s in sessions_resp.data or []:
        pid = s.get("plan_id")
        if pid is None:
            continue
        sessions_by_plan.setdefault(pid, []).append(s)
        minutes_by_plan[pid] = minutes_by_plan.get(pid, 0) + (s.get("duration_minutes") or 0)

    # Return simplified data while computing progress_percentage using logged sessions
    simplified_plans = []
    for plan in plans or []:
        status_raw = plan.get("status", "ACTIVE")
        status_str = status_raw if isinstance(status_raw, str) else str(status_raw)
        status_norm = status_str.lower()
        daily_minutes = plan.get("daily_duration_minutes", 0) or 0
        avail_hours = round(daily_minutes / 60, 2)
        start_dt = plan.get("start_date")
        end_dt = plan.get("end_date")
        created_dt = plan.get("created_at")
        try:
            start_dt = datetime.fromisoformat(start_dt) if isinstance(start_dt, str) else (start_dt or datetime.utcnow())
        except Exception:
            start_dt = datetime.utcnow()
        try:
            end_dt = datetime.fromisoformat(end_dt) if isinstance(end_dt, str) else (end_dt or (start_dt + timedelta(days=30)))
        except Exception:
            end_dt = start_dt + timedelta(days=30)
        try:
            created_dt = datetime.fromisoformat(created_dt) if isinstance(created_dt, str) else (created_dt or datetime.utcnow())
        except Exception:
            created_dt = datetime.utcnow()

        planned_hours = 0.0
        try:
            days_diff = (end_dt - start_dt).days + 1
            planned_hours = (days_diff * daily_minutes) / 60
        except Exception:
            planned_hours = 0.0

        pid = plan.get("plan_id")
        actual_hours = (minutes_by_plan.get(pid, 0) or 0) / 60
        progress_percentage = min(100.0, (actual_hours / planned_hours) * 100) if planned_hours > 0 else 0.0

        simplified_plans.append({
            "plan_id": plan.get("plan_id"),
            "subject": plan.get("subject", ""),
            "focus_area": plan.get("focus_area", ""),
            "status": status_norm,
            "created_at": created_dt.isoformat(),
            "available_hours_per_day": avail_hours,
            "progress_percentage": progress_percentage,
            "end_date": end_dt.isoformat(),
            "priority": plan.get("priority", None),
            "sessions": sessions_by_plan.get(pid, [])
        })
    return simplified_plans

@app.get(f"{settings.API_V1_PREFIX}/study-plans/active", response_model=List[dict])
async def get_active_study_plans(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get active study plans."""
    from supabase_db import get_user_study_plans

    all_plans = get_user_study_plans(current_user['user_id'])
    plans = [p for p in all_plans if str(p.get('status', '')).lower() == 'active']

    # For now, return simplified data to avoid date parsing issues
    simplified_plans = []
    for plan in plans:
        simplified_plans.append({
            "plan_id": plan.get("plan_id"),
            "subject": plan.get("subject", ""),
            "focus_area": plan.get("focus_area", ""),
            "status": plan.get("status", "ACTIVE"),
            "created_at": plan.get("created_at", "")
        })
    return simplified_plans


@app.get(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}", response_model=StudyPlanResponse)
async def get_study_plan_by_id(
    plan_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get a specific study plan by ID."""
    from supabase_db import supabase

    try:
        response = supabase.table('study_plans').select('*').eq('plan_id', plan_id).eq('user_id', current_user['user_id']).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Study plan not found")

        plan = response.data[0]
        start_dt = plan.get("start_date")
        end_dt = plan.get("end_date")
        created_dt = plan.get("created_at")
        try:
            start_dt = datetime.fromisoformat(start_dt) if isinstance(start_dt, str) else (start_dt or datetime.utcnow())
        except Exception:
            start_dt = datetime.utcnow()
        try:
            end_dt = datetime.fromisoformat(end_dt) if isinstance(end_dt, str) else (end_dt or (start_dt + timedelta(days=30)))
        except Exception:
            end_dt = start_dt + timedelta(days=30)
        try:
            created_dt = datetime.fromisoformat(created_dt) if isinstance(created_dt, str) else (created_dt or datetime.utcnow())
        except Exception:
            created_dt = datetime.utcnow()

        status_raw = plan.get("status", "active")
        status_norm = str(status_raw).lower()

        full_plan = {
            "plan_id": plan.get("plan_id"),
            "subject": plan.get("subject", ""),
            "focus_area": plan.get("focus_area", "") or "",
            "start_date": start_dt,
            "end_date": end_dt,
            "daily_duration_minutes": plan.get("daily_duration_minutes", 60) or 60,
            "priority": plan.get("priority", 5) or 5,
            "status": status_norm,
            "strategy": plan.get("study_strategy", "") or "",
            "weekly_schedule_json": plan.get("weekly_schedule_json", []) or [],
            "sessions": supabase.table('study_sessions').select('*').eq('plan_id', plan_id).order('date', desc=True).execute().data or [],
            "created_at": created_dt
        }
        return StudyPlanResponse.model_validate(full_plan)
    except Exception as e:
        logger.error(f"Error getting study plan: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving study plan")



@app.put(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}/update", response_model=StudyPlanResponse)
async def update_study_plan(
    plan_id: int,
    request: StudyPlanUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Update a study plan."""
    from supabase_db import update_study_plan

    # Build update data
    update_data = {}
    if request.subject is not None:
        update_data['subject'] = request.subject
    if request.focus_area is not None:
        update_data['focus_area'] = request.focus_area
    if request.study_strategy is not None:
        update_data['study_strategy'] = request.study_strategy
    if request.available_hours_per_day is not None:
        update_data['daily_duration_minutes'] = int(request.available_hours_per_day * 60)
    if request.status is not None:
        status_val = request.status.value if hasattr(request.status, 'value') else str(request.status)
        status_norm = str(status_val).lower()
        update_data['status'] = status_norm
    if request.completed_topics is not None:
        update_data['completed_topics'] = request.completed_topics
    if request.priority is not None:
        update_data['priority'] = _convert_priority_to_int(request.priority)

    updated_plan = update_study_plan(plan_id, update_data)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )

    return StudyPlanResponse.model_validate(updated_plan)


@app.delete(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}", response_model=MessageResponse)
async def delete_study_plan(
    plan_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Delete a study plan."""
    from supabase_db import delete_study_plan as delete_study_plan_db

    success = delete_study_plan_db(plan_id, current_user['user_id'])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )

    return MessageResponse(message="Study plan deleted successfully")


@app.post(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}/log-session", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
async def log_study_session(
    plan_id: int,
    session_data: StudySessionLog,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Log a study session."""
    from supabase_db import create_study_session
    
    session_to_create = {
        "user_id": current_user['user_id'],
        "plan_id": plan_id if plan_id > 0 else None,
        "date": datetime.utcnow().isoformat(),
        "duration_minutes": session_data.duration_minutes,
        "completed": session_data.completed,
        "notes": session_data.notes,
        "topics_covered": session_data.topics_covered
    }
    
    session = create_study_session(session_to_create)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log study session"
        )

    # Check for auto-completion
    if plan_id > 0:
        from supabase_db import supabase, update_study_plan
        from models import PlanStatus

        plan_response = supabase.table('study_plans').select('*').eq('plan_id', plan_id).execute()
        plan = plan_response.data[0] if plan_response.data else None

        if plan:
            # Calculate progress logic here
            start_date = datetime.fromisoformat(plan['start_date']) if plan.get('start_date') else None
            end_date = datetime.fromisoformat(plan['end_date']) if plan.get('end_date') else None
            daily_duration_minutes = plan.get('daily_duration_minutes', 0)

            if start_date and end_date and daily_duration_minutes > 0:
                # Get all sessions for this plan
                sessions_response = supabase.table('study_sessions').select('duration_minutes').eq('plan_id', plan_id).execute()
                total_minutes_studied = sum(s['duration_minutes'] for s in sessions_response.data)

                days_active_in_plan = (end_date - start_date).days + 1
                planned_minutes = days_active_in_plan * daily_duration_minutes

                if planned_minutes > 0 and total_minutes_studied >= planned_minutes:
                    logger.info(f"Study plan {plan_id} completed automatically for user {current_user['user_id']}")
                    update_study_plan(plan_id, {'status': PlanStatus.COMPLETED.value})
    
    return StudySessionResponse.model_validate(session)


# ==================== INSIGHT ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/insights/feedback", response_model=AcademicFeedback)
async def get_academic_feedback(
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get personalized academic feedback."""
    feedback = await InsightService.generate_feedback(current_user['user_id'])
    return feedback


@app.get(f"{settings.API_V1_PREFIX}/insights/learning-tips", response_model=List[LearningInsightResponse])
async def get_learning_tips(
    limit: int = 10,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get learning tips and insights."""
    from supabase_db import get_user_insights

    # Get all insights and filter for TIP and RECOMMENDATION types
    all_insights = get_user_insights(current_user['user_id'], limit * 2)  # Get more to account for filtering

    # Transform insight_type to lowercase
    for insight in all_insights:
        if 'insight_type' in insight:
            insight['insight_type'] = insight['insight_type'].lower()

    insights = [i for i in all_insights if i.get('insight_type') in ['tip', 'recommendation']][:limit]

    return [LearningInsightResponse.model_validate(insight) for insight in insights]


@app.get(f"{settings.API_V1_PREFIX}/insights/academic-analysis", response_model=List[LearningInsightResponse])
async def get_academic_analysis(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get all learning insights for the user."""
    from supabase_db import get_user_insights

    # Get all insights using Supabase
    insights = get_user_insights(current_user['user_id'], limit)

    # Transform insight_type to lowercase to match enum expectations
    for insight in insights:
        if 'insight_type' in insight:
            insight['insight_type'] = insight['insight_type'].lower()

    # If no insights exist, log the situation (temporarily disabled feedback generation)
    if not insights:
        logger.info(f"No insights found for user {current_user['user_id']}")

    return [LearningInsightResponse.model_validate(insight) for insight in insights]


@app.get(f"{settings.API_V1_PREFIX}/insights/{{insight_id}}", response_model=LearningInsightResponse)
async def get_insight_by_id(
    insight_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Get a specific insight by ID."""
    from supabase_db import supabase

    try:
        response = supabase.table('learning_insights').select('*').eq('insight_id', insight_id).eq('user_id', current_user['user_id']).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Insight not found"
            )

        insight = response.data[0]

        # Transform insight_type to lowercase
        if 'insight_type' in insight:
            insight['insight_type'] = insight['insight_type'].lower()

        # Mark as read when viewed
        if not insight.get('is_read', False):
            from supabase_db import mark_insight_read
            mark_insight_read(insight_id)

        return LearningInsightResponse.model_validate(insight)
    except Exception as e:
        logger.error(f"Error getting insight {insight_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving insight"
        )


@app.put(f"{settings.API_V1_PREFIX}/insights/{{insight_id}}/read", response_model=MessageResponse)
async def mark_insight_read(
    insight_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user)
):
    """Mark an insight as read."""
    from supabase_db import mark_insight_read as mark_read

    success = mark_read(insight_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insight not found"
        )

    return MessageResponse(message="Insight marked as read")


# ==================== INVITE CODE ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/invite/generate", response_model=InviteCodeResponse, status_code=status.HTTP_201_CREATED)
async def generate_invite_code(
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Generate an invite code for linking students. Only for teachers and parents."""
    try:
        invite = InviteService.create_invite_code(
            creator_id=current_user['user_id'],
            creator_type=current_user['user_type']
        )
        return InviteCodeResponse.model_validate(invite)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@app.get(f"{settings.API_V1_PREFIX}/invite/my-codes", response_model=List[InviteCodeResponse])
async def get_my_invite_codes(
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get all invite codes created by the current user."""
    codes = InviteService.get_my_codes(current_user['user_id'])
    return [InviteCodeResponse.model_validate(c) for c in codes]


@app.post(f"{settings.API_V1_PREFIX}/invite/redeem", response_model=MessageResponse)
async def redeem_invite_code(
    request: InviteCodeRedeem,
    current_user: Dict[str, Any] = Depends(require_user_type("student"))
):
    """Redeem an invite code to link with a teacher or parent. Only for students."""
    try:
        relationship = InviteService.redeem_code(
            code=request.code,
            student_id=current_user['user_id']
        )
        return MessageResponse(
            message=f"Successfully linked! You are now connected.",
            success=True,
            data={"relationship_id": relationship['relationship_id']}
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ==================== RELATIONSHIP ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/relationships/students", response_model=List[LinkedStudentResponse])
async def get_linked_students(
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get all students linked to the current teacher/parent."""
    students_data = RelationshipService.get_linked_students(current_user['user_id'])
    return [LinkedStudentResponse.model_validate(s) for s in students_data]


@app.get(f"{settings.API_V1_PREFIX}/relationships/guardians", response_model=List[LinkedGuardianResponse])
async def get_linked_guardians(
    current_user: Dict[str, Any] = Depends(require_user_type("student"))
):
    """Get all teachers/parents linked to the current student."""
    guardians_data = RelationshipService.get_linked_guardians(current_user['user_id'])
    return [LinkedGuardianResponse.model_validate(g) for g in guardians_data]


@app.get(f"{settings.API_V1_PREFIX}/students/{{student_id}}/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    student_id: int,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get a student's dashboard data. Only accessible by linked teachers/parents."""
    try:
        dashboard = RelationshipService.get_student_dashboard(
            guardian_id=current_user['user_id'],
            student_id=student_id
        )
        return StudentDashboardResponse.model_validate(dashboard)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

@app.get(f"{settings.API_V1_PREFIX}/students/{{student_id}}/reports", response_model=List[ReportResponse])
async def get_student_reports(
    student_id: int,
    limit: int = 10,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get a student's reports. Only accessible by linked teachers/parents."""
    # Verify relationship
    if not RelationshipService.verify_relationship(current_user['user_id'], student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this student's reports"
        )
    
    reports = ReportService.get_report_history(student_id, limit)
    return [ReportResponse.model_validate(r) for r in reports]


@app.delete(f"{settings.API_V1_PREFIX}/relationships/{{student_id}}", response_model=MessageResponse)
async def remove_student_link(
    student_id: int,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Remove a link to a student."""
    success = RelationshipService.remove_relationship(current_user['user_id'], student_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relationship not found"
        )
    return MessageResponse(message="Student link removed successfully")


@app.get(f"{settings.API_V1_PREFIX}/students/{{student_id}}/flashcards", response_model=List[FlashcardResponse])
async def get_student_flashcards(
    student_id: int,
    subject: Optional[str] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get a student's flashcards. Only accessible by linked teachers/parents."""
    from supabase_db import supabase

    if not RelationshipService.verify_relationship(current_user['user_id'], student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this student's flashcards"
        )

    # Build query dynamically
    query = supabase.table('flashcards').select('*').eq('user_id', student_id).eq('is_active', True)

    if subject:
        query = query.eq('subject', subject)

    response = query.order('created_at', desc=True).limit(limit).execute()
    return [FlashcardResponse.model_validate(card) for card in response.data]


@app.get(f"{settings.API_V1_PREFIX}/students/{{student_id}}/career", response_model=List[CareerRecommendationResponse])
async def get_student_career_recommendations(
    student_id: int,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get a student's career recommendations. Only accessible by linked teachers/parents."""
    from supabase_db import get_user_career_recommendations

    if not RelationshipService.verify_relationship(current_user['user_id'], student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this student's career recommendations"
        )

    recommendations = get_user_career_recommendations(student_id)
    # Sort by match_score descending
    recommendations.sort(key=lambda x: x.get('match_score', 0), reverse=True)

    return [CareerRecommendationResponse.model_validate(r) for r in recommendations]


@app.post(f"{settings.API_V1_PREFIX}/students/{{student_id}}/insights", response_model=LearningInsightResponse, status_code=status.HTTP_201_CREATED)
async def create_student_insight(
    student_id: int,
    insight_data: GuardianInsightCreate,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Create an insight for a student. Only accessible by linked teachers/parents."""
    from supabase_db import create_learning_insight
    
    # Verify relationship
    if not RelationshipService.verify_relationship(current_user['user_id'], student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create insights for this student"
        )
    
    # Create the insight
    insight_to_create = {
        "user_id": student_id,
        "insight_type": insight_data.insight_type.value, # Use string value
        "title": insight_data.title,
        "content": insight_data.content,
        "created_by": current_user['user_id'],
        "metadata_json": {
            "created_by_name": current_user['full_name'],
            "created_by_type": current_user['user_type'],
            "source": "guardian"
        }
    }
    insight = create_learning_insight(insight_to_create)

    if not insight:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create insight"
        )
    
    return LearningInsightResponse.model_validate(insight)


@app.get(f"{settings.API_V1_PREFIX}/students/{{student_id}}/insights", response_model=List[LearningInsightResponse])
async def get_student_insights(
    student_id: int,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_user_type("teacher", "parent"))
):
    """Get insights for a student. Only accessible by linked teachers/parents."""
    from supabase_db import get_user_insights

    # Verify relationship
    if not RelationshipService.verify_relationship(current_user['user_id'], student_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this student's insights"
        )

    insights = get_user_insights(student_id, limit)

    # Transform insight_type to lowercase
    for insight in insights:
        if 'insight_type' in insight:
            insight['insight_type'] = insight['insight_type'].lower()

    return [LearningInsightResponse.model_validate(insight) for insight in insights]


# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to SmartPath API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
