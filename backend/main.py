"""
Main FastAPI application for SmartPath backend.
Contains all API routes and endpoints.
"""
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import aiofiles

from config import settings
from database import get_db, init_db, User

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
    UserRegister, UserLogin, Token, UserProfile,
    ReportUpload, ReportResponse, ReportAnalysis,
    PerformanceDashboard, GradeTrend, PerformancePrediction,
    FlashcardGenerate, FlashcardResponse, FlashcardReviewRequest,
    FlashcardEvaluateRequest, FlashcardEvaluateResponse,
    CareerRecommendationResponse, CareerQuizRequest,
    StudyPlanGenerate, StudyPlanUpdate, StudyPlanResponse, StudySessionLog, StudySessionResponse,
    LearningInsightResponse, AcademicFeedback,
    MessageResponse, ErrorResponse, PaginatedResponse
)
from pydantic import BaseModel

from auth import (
    authenticate_user, get_current_active_user, create_access_token,
    get_password_hash, require_user_type
)
from services import (
    ReportService, PerformanceService, FlashcardService,
    CareerService, StudyPlanService, InsightService
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

# CORS middleware - Must be added before other middleware
# Build CORS origins list including Vercel preview URLs
cors_origins = settings.cors_origins_list.copy()
# Add regex pattern for Vercel preview deployments (any subdomain of vercel.app)
# FastAPI CORSMiddleware supports allow_origin_regex for pattern matching
vercel_pattern = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Exact matches
    allow_origin_regex=vercel_pattern,  # Pattern for Vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],  # Allow all headers for preflight
    expose_headers=["*"],
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
    """Initialize database on application startup."""
    try:
        init_db()
        logger.info("✅ Database connection successful!")
        logger.info(f"🚀 SmartPath API v{settings.APP_VERSION} started")
        logger.info(f"📍 Environment: {settings.ENVIRONMENT}")
        logger.info(f"🔧 Debug mode: {settings.DEBUG}")
        
        # Create uploads directory if it doesn't exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        logger.info(f"📁 Upload directory: {settings.UPLOAD_DIR}")
        
    except Exception as e:
        logger.error(f"⚠️  Database initialization error: {e}", exc_info=True)
        if settings.is_production:
            # In production, fail fast if database is not available
            raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    logger.info("👋 SmartPath API shutting down")


# ==================== HEALTH CHECK ====================

@app.get("/health")
@app.get(f"{settings.API_V1_PREFIX}/health")
async def health_check():
    """Health check endpoint to test server connectivity."""
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}


# ==================== AUTHENTICATION ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/auth/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        user_type=user_data.user_type.value,
        grade_level=user_data.grade_level,
        curriculum_type=user_data.curriculum_type.value,
        phone_number=user_data.phone_number,
        school_name=user_data.school_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return MessageResponse(
        message="User registered successfully",
        success=True,
        data={"user_id": user.user_id}
    )


@app.post(f"{settings.API_V1_PREFIX}/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id)}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@app.get(f"{settings.API_V1_PREFIX}/auth/profile", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user's profile."""
    return UserProfile.model_validate(current_user)


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
    current_user: User = Depends(get_current_active_user)
):
    """Preview OCR extraction without saving the report.
    
    This endpoint allows users to see what grades were extracted from their file
    before committing to save the report. Useful for verification and correction.
    """
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
        os.unlink(tmp_path)
        
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
            os.unlink(tmp_path)
        
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
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
        f"{current_user.user_id}_{timestamp}_{file.filename}"
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
            db=db,
            user_id=current_user.user_id,
            report_date=report_date,
            term=term,
            year=year,
            grades_json=grades_json,
            file_path=file_path,
            file_type=file.content_type
        )
        
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload report data directly as JSON (for testing or manual entry)."""
    if not report_data.grades_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grades_json is required in request body"
        )
    
    report = ReportService.create_report(
        db=db,
        user_id=current_user.user_id,
        report_date=report_data.report_date,
        term=report_data.term,
        year=report_data.year,
        grades_json=report_data.grades_json
    )
    
    return ReportResponse.model_validate(report)


@app.get(f"{settings.API_V1_PREFIX}/reports/history", response_model=List[ReportResponse])
async def get_report_history(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's report history."""
    reports = ReportService.get_report_history(db, current_user.user_id, limit)
    return [ReportResponse.model_validate(r) for r in reports]


@app.post(f"{settings.API_V1_PREFIX}/reports/analyze", response_model=ReportAnalysis)
async def analyze_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyze a specific report and generate AI-powered insights."""
    analysis = await ReportService.analyze_report(db, report_id)
    return analysis


@app.delete(f"{settings.API_V1_PREFIX}/reports/{{report_id}}", response_model=MessageResponse)
async def delete_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a report."""
    from database import AcademicReport
    
    report = db.query(AcademicReport).filter(
        AcademicReport.report_id == report_id,
        AcademicReport.user_id == current_user.user_id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Delete associated file if exists
    if report.file_path and os.path.exists(report.file_path):
        try:
            os.remove(report.file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {report.file_path}: {e}")
    
    db.delete(report)
    db.commit()
    
    return MessageResponse(
        message="Report deleted successfully",
        success=True
    )


# ==================== PERFORMANCE ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/performance/dashboard", response_model=PerformanceDashboard)
async def get_performance_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get performance dashboard data."""
    dashboard = PerformanceService.get_dashboard(db, current_user.user_id)
    return dashboard


@app.get(f"{settings.API_V1_PREFIX}/performance/trends", response_model=List[GradeTrend])
async def get_performance_trends(
    subject: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get grade trends for subjects."""
    trends = PerformanceService.get_grade_trends(db, current_user.user_id, subject)
    return trends


@app.get(f"{settings.API_V1_PREFIX}/performance/predictions", response_model=List[PerformancePrediction])
async def get_performance_predictions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get performance predictions."""
    predictions = await PerformanceService.get_predictions(db, current_user.user_id)
    return predictions


# ==================== FLASHCARD ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/flashcards/generate", response_model=List[FlashcardResponse], status_code=status.HTTP_201_CREATED)
async def generate_flashcards(
    request: FlashcardGenerate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards using AI."""
    flashcards = await FlashcardService.generate_flashcards(
        db=db,
        user_id=current_user.user_id,
        subject=request.subject,
        topic=request.topic,
        count=request.count,
        grade_level=request.grade_level or current_user.grade_level or 10,
        curriculum=current_user.curriculum_type.value
    )
    
    return [FlashcardResponse.model_validate(card) for card in flashcards]


@app.get(f"{settings.API_V1_PREFIX}/flashcards/list", response_model=List[FlashcardResponse])
async def list_flashcards(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List user's flashcards."""
    from database import Flashcard, DifficultyLevel
    
    query = db.query(Flashcard).filter(Flashcard.user_id == current_user.user_id)
    
    if subject:
        query = query.filter(Flashcard.subject == subject)
    if difficulty:
        query = query.filter(Flashcard.difficulty == DifficultyLevel(difficulty))
    
    flashcards = query.order_by(Flashcard.created_at.desc()).limit(limit).all()
    return [FlashcardResponse.model_validate(card) for card in flashcards]


@app.delete(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}", response_model=MessageResponse)
async def delete_flashcard(
    card_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a flashcard."""
    from database import Flashcard
    
    flashcard = db.query(Flashcard).filter(
        Flashcard.card_id == card_id,
        Flashcard.user_id == current_user.user_id
    ).first()
    
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found"
        )
    
    db.delete(flashcard)
    db.commit()
    
    return MessageResponse(message="Flashcard deleted successfully")


@app.post(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}/review", response_model=MessageResponse)
async def review_flashcard(
    card_id: int,
    review_data: FlashcardReviewRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Record a flashcard review."""
    review = FlashcardService.review_flashcard(
        db=db,
        card_id=card_id,
        user_id=current_user.user_id,
        correct=review_data.correct,
        user_answer=review_data.user_answer
    )
    
    return MessageResponse(
        message="Review recorded successfully",
        success=True,
        data={"review_id": review.review_id}
    )


@app.post(f"{settings.API_V1_PREFIX}/flashcards/{{card_id}}/evaluate", response_model=FlashcardEvaluateResponse)
async def evaluate_flashcard_answer(
    card_id: int,
    request: FlashcardEvaluateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Evaluate student's answer to a flashcard."""

    evaluation = await FlashcardService.evaluate_answer(
        db=db,
        card_id=card_id,
        user_id=current_user.user_id,
        user_answer=request.user_answer
    )
    
    # Refresh flashcard to get updated stats
    from database import Flashcard
    from utils import calculate_mastery_level
    flashcard = db.query(Flashcard).filter(Flashcard.card_id == card_id).first()
    if flashcard:
        # Calculate mastery level
        mastery = calculate_mastery_level(
            flashcard.times_reviewed,
            flashcard.times_correct,
            flashcard.difficulty.value
        )
        evaluation['mastery_level'] = mastery * 100  # Convert to percentage

    return FlashcardEvaluateResponse(**evaluation)


# ==================== CAREER ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/career/recommendations", response_model=List[CareerRecommendationResponse])
async def get_career_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get career recommendations."""
    from database import CareerRecommendation
    
    recommendations = db.query(CareerRecommendation).filter(
        CareerRecommendation.user_id == current_user.user_id
    ).order_by(CareerRecommendation.match_score.desc()).all()
    
    if not recommendations:
        # Generate new recommendations
        recommendations = await CareerService.generate_recommendations(
            db=db,
            user_id=current_user.user_id
        )
    
    return [CareerRecommendationResponse.model_validate(r) for r in recommendations]


@app.post(f"{settings.API_V1_PREFIX}/career/quiz", response_model=List[CareerRecommendationResponse])
async def career_quiz(
    quiz_data: CareerQuizRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate career recommendations based on quiz."""
    recommendations = await CareerService.generate_recommendations(
        db=db,
        user_id=current_user.user_id,
        interests=quiz_data.interests
    )
    
    return [CareerRecommendationResponse.model_validate(r) for r in recommendations]


@app.get(f"{settings.API_V1_PREFIX}/career/{{recommendation_id}}/details", response_model=CareerRecommendationResponse)
async def get_career_details(
    recommendation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific career recommendation."""
    from database import CareerRecommendation
    
    recommendation = db.query(CareerRecommendation).filter(
        CareerRecommendation.recommendation_id == recommendation_id,
        CareerRecommendation.user_id == current_user.user_id
    ).first()
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Career recommendation not found"
        )
    
    return CareerRecommendationResponse.model_validate(recommendation)


# ==================== STUDY PLAN ROUTES ====================

@app.post(f"{settings.API_V1_PREFIX}/study-plans/generate", response_model=List[StudyPlanResponse], status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    request: StudyPlanGenerate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a personalized study plan."""
    plans = await StudyPlanService.generate_study_plan(
        db=db,
        user_id=current_user.user_id,
        subjects=request.subjects,
        available_hours=request.available_hours_per_day,
        exam_date=request.exam_date
    )
    
    return [StudyPlanResponse.model_validate(plan) for plan in plans]


@app.get(f"{settings.API_V1_PREFIX}/study-plans/active", response_model=List[StudyPlanResponse])
async def get_active_study_plans(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get active study plans."""
    from database import StudyPlan, PlanStatus
    
    plans = db.query(StudyPlan).filter(
        StudyPlan.user_id == current_user.user_id,
        StudyPlan.status == PlanStatus.ACTIVE
    ).all()
    
    return [StudyPlanResponse.model_validate(plan) for plan in plans]


@app.put(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}/update", response_model=StudyPlanResponse)
async def update_study_plan(
    plan_id: int,
    request: StudyPlanUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a study plan."""
    from database import StudyPlan, PlanStatus
    
    plan = db.query(StudyPlan).filter(
        StudyPlan.plan_id == plan_id,
        StudyPlan.user_id == current_user.user_id
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )
    
    # Update fields from request
    if request.is_active is not None:
        plan.is_active = request.is_active
        if not plan.is_active:
            plan.status = PlanStatus.COMPLETED
        else:
            plan.status = PlanStatus.ACTIVE
    
    if request.completed_topics is not None:
        # Update completed topics if provided
        if hasattr(plan, 'completed_topics'):
            plan.completed_topics = request.completed_topics
    
    db.commit()
    db.refresh(plan)
    
    return StudyPlanResponse.model_validate(plan)


@app.delete(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}", response_model=MessageResponse)
async def delete_study_plan(
    plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a study plan."""
    from database import StudyPlan
    
    plan = db.query(StudyPlan).filter(
        StudyPlan.plan_id == plan_id,
        StudyPlan.user_id == current_user.user_id
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study plan not found"
        )
    
    db.delete(plan)
    db.commit()
    
    return MessageResponse(message="Study plan deleted successfully")


@app.post(f"{settings.API_V1_PREFIX}/study-plans/{{plan_id}}/log-session", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
async def log_study_session(
    plan_id: int,
    session_data: StudySessionLog,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Log a study session."""
    from database import StudySession
    
    session = StudySession(
        user_id=current_user.user_id,
        plan_id=plan_id if plan_id > 0 else None,
        date=datetime.utcnow(),
        duration_minutes=session_data.duration_minutes,
        completed=session_data.completed,
        notes=session_data.notes,
        topics_covered=session_data.topics_covered
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return StudySessionResponse.model_validate(session)


# ==================== INSIGHT ROUTES ====================

@app.get(f"{settings.API_V1_PREFIX}/insights/feedback", response_model=AcademicFeedback)
async def get_academic_feedback(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get personalized academic feedback."""
    feedback = await InsightService.generate_feedback(db, current_user.user_id)
    return feedback


@app.get(f"{settings.API_V1_PREFIX}/insights/learning-tips", response_model=List[LearningInsightResponse])
async def get_learning_tips(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get learning tips and insights."""
    from database import LearningInsight, InsightType
    
    insights = db.query(LearningInsight).filter(
        LearningInsight.user_id == current_user.user_id,
        LearningInsight.insight_type.in_([InsightType.TIP, InsightType.RECOMMENDATION])
    ).order_by(LearningInsight.generated_at.desc()).limit(limit).all()
    
    return [LearningInsightResponse.model_validate(insight) for insight in insights]


@app.get(f"{settings.API_V1_PREFIX}/insights/academic-analysis", response_model=List[LearningInsightResponse])
async def get_academic_analysis(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get academic analysis insights."""
    from database import LearningInsight, InsightType
    
    insights = db.query(LearningInsight).filter(
        LearningInsight.user_id == current_user.user_id,
        LearningInsight.insight_type == InsightType.ANALYSIS
    ).order_by(LearningInsight.generated_at.desc()).limit(limit).all()
    
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

