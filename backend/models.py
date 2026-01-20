"""
Pydantic models for request/response validation.
These models define the API contract for SmartPath.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator, ValidationError
from enum import Enum


# Enums matching database enums
class UserType(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"


class CurriculumType(str, Enum):
    CBE = "CBE"
    EIGHT_FOUR_FOUR = "8-4-4"
    KCSE = "kcse"
    IGCSE = "igcse"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class PlanStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InsightType(str, Enum):
    FEEDBACK = "feedback"
    TIP = "tip"
    ANALYSIS = "analysis"
    RECOMMENDATION = "recommendation"
    MOTIVATION = "motivation"


# ==================== AUTHENTICATION MODELS ====================

class UserRegister(BaseModel):
    """User registration request model."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    user_type: UserType = UserType.STUDENT
    grade_level: Optional[int] = Field(None, ge=3, le=12)
    curriculum_type: CurriculumType = CurriculumType.CBE
    phone_number: Optional[str] = None
    school_name: Optional[str] = None

    @validator('grade_level')
    def validate_grade_level_for_students(cls, v, values):
        """Validate that students have grade_level."""
        user_type = values.get('user_type')
        if user_type == UserType.STUDENT and v is None:
            raise ValueError("grade_level is required for students")
        return v

    @validator("curriculum_type", pre=True)
    def normalize_curriculum_type(cls, v):
        if v is None:
            return CurriculumType.CBE
        if isinstance(v, CurriculumType):
            return v
        if isinstance(v, str):
            s = v.strip().lower()
            if s == "cbe":
                return CurriculumType.CBE
            if s in {"8-4-4", "8 4 4", "844"}:
                return CurriculumType.EIGHT_FOUR_FOUR
        return v


class UserLogin(BaseModel):
    """User login request model."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserProfile(BaseModel):
    """User profile response model."""
    user_id: int
    email: str
    full_name: str
    user_type: UserType
    grade_level: Optional[int]
    curriculum_type: CurriculumType
    phone_number: Optional[str]
    school_name: Optional[str]
    profile_picture: Optional[str]
    created_at: datetime
    
    model_config = {"from_attributes": True}
    
    @validator("curriculum_type", pre=True)
    def normalize_curriculum_type(cls, v):
        if v is None:
            return CurriculumType.CBE
        if isinstance(v, CurriculumType):
            return v
        if isinstance(v, str):
            s = v.strip().lower()
            if s == "cbe":
                return CurriculumType.CBE
            if s in {"8-4-4", "8 4 4", "844"}:
                return CurriculumType.EIGHT_FOUR_FOUR
        return v


class UserProfileUpdate(BaseModel):
    """User profile update request model."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = None
    school_name: Optional[str] = None
    profile_picture: Optional[str] = None
    grade_level: Optional[int] = Field(None, ge=3, le=12)
    curriculum_type: Optional[CurriculumType] = None

    @validator("curriculum_type", pre=True)
    def normalize_curriculum_type(cls, v):
        if v is None:
            return None
        if isinstance(v, CurriculumType):
            return v
        if isinstance(v, str):
            s = v.strip().lower()
            if s == "cbe":
                return CurriculumType.CBE
            if s in {"8-4-4", "8 4 4", "844"}:
                return CurriculumType.EIGHT_FOUR_FOUR
        return v


# ==================== REPORT MODELS ====================

class ReportUpload(BaseModel):
    """Report upload request model."""
    term: str = Field(..., description="Term name (e.g., 'Term 1', 'Term 2')")
    year: int = Field(..., ge=2020, le=2030)
    report_date: datetime
    grades_json: Optional[Dict[str, str]] = Field(None, description="Subject grades as JSON object")


class ReportResponse(BaseModel):
    """Academic report response model."""
    report_id: int
    user_id: int
    report_date: datetime
    term: str
    year: int
    grades_json: Dict[str, str]
    overall_gpa: Optional[float]
    uploaded_at: datetime
    processed: bool
    
    model_config = {"from_attributes": True}


class ReportAnalysis(BaseModel):
    """Report analysis response model."""
    report_id: int
    overall_gpa: float
    subject_count: int
    strong_subjects: List[str]
    weak_subjects: List[str]
    trend_analysis: Dict[str, str]
    recommendations: List[str]


# ==================== PERFORMANCE MODELS ====================

class SubjectPerformanceResponse(BaseModel):
    """Subject performance response model."""
    performance_id: int
    subject: str
    current_grade: Optional[str]
    grade_numeric: Optional[float]
    trend: Optional[str]
    strength_score: float
    weakness_areas: Optional[List[str]]
    last_updated: datetime
    
    model_config = {"from_attributes": True}


class PerformanceDashboard(BaseModel):
    """Performance dashboard response model."""
    overall_gpa: float
    total_subjects: int
    subject_performance: List[SubjectPerformanceResponse]
    strong_subjects: List[SubjectPerformanceResponse]
    weak_subjects: List[SubjectPerformanceResponse]
    improving_subjects: List[str]
    declining_subjects: List[str]
    recent_reports: List[ReportResponse]


class GradeTrend(BaseModel):
    """Grade trend data model."""
    subject: str
    grades: List[float]
    dates: List[datetime]
    trend: str  # "improving", "declining", "stable"
    predicted_next: Optional[float]


class PerformancePrediction(BaseModel):
    """Performance prediction response model."""
    subject: str
    current_grade: str
    predicted_next_grade: str
    confidence: float  # 0-1
    factors: List[str]


# ==================== FLASHCARD MODELS ====================

class FlashcardGenerate(BaseModel):
    """Flashcard generation request model."""
    subject: str = Field(..., min_length=1, max_length=100)
    topic: Optional[str] = None
    count: int = Field(5, ge=1, le=20)
    difficulty: Optional[DifficultyLevel] = None
    grade_level: Optional[int] = Field(None, ge=3, le=12)


class FlashcardResponse(BaseModel):
    """Flashcard response model."""
    card_id: int
    subject: str
    topic: Optional[str]
    question: str
    answer: str
    difficulty: DifficultyLevel
    times_reviewed: int
    times_correct: int
    last_reviewed: Optional[datetime]
    next_review_date: Optional[datetime]
    created_at: datetime
    mastery_level: float = 0.0  # Calculated field (0-100 percentage)
    review_count: int = 0  # Alias for times_reviewed
    
    model_config = {"from_attributes": True}
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to calculate mastery_level and review_count."""
        from utils import calculate_mastery_level
        from collections.abc import Mapping
        
        def get_field(source, key: str):
            if isinstance(source, Mapping):
                return source.get(key)
            return getattr(source, key, None)
        
        times_reviewed = get_field(obj, "times_reviewed")
        times_correct = get_field(obj, "times_correct")
        difficulty = get_field(obj, "difficulty")
        
        if times_reviewed is None:
            times_reviewed = 0
        if times_correct is None:
            times_correct = 0
        
        difficulty_value = None
        if difficulty is not None:
            difficulty_value = difficulty.value if hasattr(difficulty, "value") else str(difficulty)
        
        mastery = calculate_mastery_level(times_reviewed, times_correct, difficulty_value or "medium")
        mastery_level = mastery * 100
        review_count = times_reviewed
        
        # Create dict with calculated fields
        data = obj.__dict__.copy() if hasattr(obj, '__dict__') else dict(obj)
        data['mastery_level'] = mastery_level
        data['review_count'] = review_count
        
        return super().model_validate(data, **kwargs)


class FlashcardReviewRequest(BaseModel):
    """Flashcard review request model."""
    correct: bool
    user_answer: Optional[str] = None


class FlashcardReviewResponse(BaseModel):
    """Flashcard review response model."""
    review_id: int
    correct: bool
    feedback: Optional[str]
    next_review_date: Optional[datetime]
    mastery_level: float  # 0-1


class FlashcardEvaluateRequest(BaseModel):
    """Flashcard answer evaluation request model."""
    user_answer: str = Field(..., min_length=1)


class FlashcardEvaluateResponse(BaseModel):
    """Flashcard evaluation response model."""
    correct: bool
    score: float  # 0-1
    feedback: str
    suggestions: List[str]


# ==================== CAREER MODELS ====================

class CareerRecommendationResponse(BaseModel):
    """Career recommendation response model."""
    recommendation_id: int
    career_path: str
    career_description: Optional[str]
    suitable_universities: Optional[List[str]]
    course_requirements: Optional[Dict[str, Any]]
    match_score: float
    reasoning: Optional[str]
    job_market_outlook: Optional[str]
    generated_at: datetime
    is_favorite: bool
    
    model_config = {"from_attributes": True}


class CareerQuizRequest(BaseModel):
    """Career interest quiz request model."""
    interests: List[str] = Field(..., min_items=1)
    preferred_subjects: List[str]
    career_goals: Optional[str] = None
    work_environment: Optional[str] = None  # "indoor", "outdoor", "mixed"


# ==================== STUDY PLAN MODELS ====================

class StudyPlanGenerate(BaseModel):
    """Study plan generation request model."""
    subjects: List[str] = Field(..., min_items=1)
    available_hours_per_day: float = Field(..., ge=1, le=12)
    exam_date: Optional[datetime] = None
    focus_areas: Optional[Dict[str, List[str]]] = None  # subject -> topics
    priority: Optional[PriorityLevel] = PriorityLevel.MEDIUM
    active_days: Optional[List[str]] = None # Added active_days for editable schedule


class StudyPlanUpdate(BaseModel):
    """Study plan update request model."""
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    focus_area: Optional[str] = None
    study_strategy: Optional[str] = None
    available_hours_per_day: Optional[float] = Field(None, ge=0.5, le=12)
    is_active: Optional[bool] = None
    status: Optional[PlanStatus] = None
    priority: Optional[PriorityLevel] = None
    completed_topics: Optional[List[str]] = None


class StudyPlanResponse(BaseModel):
    """Study plan response model."""
    plan_id: int
    subject: str
    focus_area: str = Field(default="", description="Areas to focus on for this subject")
    start_date: datetime
    end_date: datetime
    daily_duration_minutes: int
    priority: int
    status: PlanStatus
    strategy: str = Field(default="", description="Study strategy for this subject")
    # Expose as 'weekly_schedule' to clients, map from DB field 'weekly_schedule_json'
    weekly_schedule: List[Dict[str, Any]] = Field(default_factory=list, alias="weekly_schedule_json", description="Weekly study schedule")
    sessions: List["StudySessionResponse"] = Field(default_factory=list, description="Study sessions")
    progress_percentage: float = Field(default=0.0, description="Progress percentage based on logged sessions vs planned time")
    created_at: datetime

    # Custom properties for weekly schedule items
    @property
    def active_weekly_schedule(self) -> List[Dict[str, Any]]:
        return [day for day in self.weekly_schedule if day.get("is_active", True)]
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Override to ensure no null values."""
        def _parse_dt(value):
            if value is None:
                return None
            if isinstance(value, datetime):
                return value
            if isinstance(value, str):
                v = value.strip()
                if v.endswith("Z"):
                    v = v[:-1] + "+00:00"
                try:
                    return datetime.fromisoformat(v)
                except Exception:
                    return None
            return None

        # Handle both dict and SQLAlchemy objects
        if isinstance(obj, dict):
            # Ensure focus_area is never null
            if obj.get("focus_area") is None or obj.get("focus_area") == "":
                obj["focus_area"] = "Focus on core concepts and practice regularly"
            # Ensure study_strategy is never null
            if obj.get("study_strategy") is None or obj.get("study_strategy") == "":
                subject = obj.get("subject", "this subject")
                obj["study_strategy"] = (
                    f"Study {subject} daily for consistent progress. "
                    f"Break down topics into manageable chunks, practice regularly, "
                    f"and review previous lessons weekly."
                )
            if obj.get("strategy") is None or obj.get("strategy") == "":
                obj["strategy"] = obj.get("study_strategy") or ""
            # Ensure weekly_schedule_json is never null
            if obj.get("weekly_schedule_json") is None:
                obj["weekly_schedule_json"] = []
            # Ensure sessions is never null
            if obj.get("sessions") is None:
                obj["sessions"] = []
            if isinstance(obj.get("status"), str):
                obj["status"] = obj["status"].lower()
        else:
            # Handle SQLAlchemy objects
            if hasattr(obj, "focus_area") and (obj.focus_area is None or obj.focus_area == ""):
                obj.focus_area = "Focus on core concepts and practice regularly"
            if hasattr(obj, "study_strategy") and (obj.study_strategy is None or obj.study_strategy == ""):
                subject = getattr(obj, "subject", "this subject")
                obj.study_strategy = (
                    f"Study {subject} daily for consistent progress. "
                    f"Break down topics into manageable chunks, practice regularly, "
                    f"and review previous lessons weekly."
                )
            if hasattr(obj, "weekly_schedule_json") and obj.weekly_schedule_json is None:
                obj.weekly_schedule_json = []

        # Calculate progress percentage
        progress_percentage = 0.0
        # Check if we have the required fields for progress calculation
        start_date = None
        end_date = None
        daily_duration_minutes = None

        if isinstance(obj, dict):
            if "start_date" in obj and "end_date" in obj and "daily_duration_minutes" in obj:
                start_date = _parse_dt(obj["start_date"]) or obj["start_date"]
                end_date = _parse_dt(obj["end_date"]) or obj["end_date"]
                daily_duration_minutes = obj["daily_duration_minutes"]
                if isinstance(daily_duration_minutes, str):
                    try:
                        daily_duration_minutes = int(float(daily_duration_minutes))
                    except Exception:
                        daily_duration_minutes = None
                if isinstance(start_date, datetime):
                    obj["start_date"] = start_date
                if isinstance(end_date, datetime):
                    obj["end_date"] = end_date
            if "created_at" in obj:
                created_at = _parse_dt(obj.get("created_at"))
                if created_at:
                    obj["created_at"] = created_at
        elif hasattr(obj, "start_date") and hasattr(obj, "end_date") and hasattr(obj, "daily_duration_minutes"):
            start_date = _parse_dt(obj.start_date) or obj.start_date
            end_date = _parse_dt(obj.end_date) or obj.end_date
            daily_duration_minutes = obj.daily_duration_minutes

        if isinstance(start_date, datetime) and isinstance(end_date, datetime) and daily_duration_minutes:
            # Calculate total planned hours
            days_diff = (end_date - start_date).days + 1  # Include both start and end dates
            planned_hours = (days_diff * daily_duration_minutes) / 60

            # Calculate total actual hours from sessions
            actual_hours = 0
            sessions = []
            if isinstance(obj, dict) and "sessions" in obj:
                sessions = obj["sessions"] or []
            elif hasattr(obj, "sessions") and obj.sessions:
                sessions = obj.sessions

            for session in sessions:
                if hasattr(session, "duration_minutes"):
                    actual_hours += session.duration_minutes / 60
                elif isinstance(session, dict) and "duration_minutes" in session:
                    actual_hours += session["duration_minutes"] / 60

            # Calculate progress percentage
            if planned_hours > 0:
                progress_percentage = min(100.0, (actual_hours / planned_hours) * 100)

        # Set progress_percentage in the object
        if isinstance(obj, dict):
            obj["progress_percentage"] = progress_percentage

        validated_obj = super().model_validate(obj, **kwargs)

        # Ensure progress_percentage is set even if it gets overridden
        validated_obj.progress_percentage = progress_percentage

        return validated_obj

    model_config = {"from_attributes": True, "populate_by_name": True}


class StudySessionLog(BaseModel):
    """Study session logging request model."""
    plan_id: Optional[int] = None
    subject: str
    duration_minutes: int = Field(..., ge=1, le=480)
    completed: bool = True
    notes: Optional[str] = None
    topics_covered: Optional[List[str]] = None


class StudySessionResponse(BaseModel):
    """Study session response model."""
    session_id: int
    date: datetime
    duration_minutes: int
    completed: bool
    notes: Optional[str]
    topics_covered: Optional[List[str]]
    
    model_config = {"from_attributes": True}


# ==================== INSIGHT MODELS ====================

class LearningInsightResponse(BaseModel):
    """Learning insight response model."""
    insight_id: int
    insight_type: InsightType
    title: Optional[str]
    content: str
    metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata_json")
    generated_at: datetime
    is_read: bool
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class AcademicFeedback(BaseModel):
    """Academic feedback response model."""
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    motivational_message: str
    next_steps: List[str]

# ==================== RESOURCE LIBRARY MODELS ====================

class ResourceType(str, Enum):
    PDF = "pdf"
    VIDEO = "video"
    NOTE = "note"
    TOOLKIT = "toolkit"

class ResourceCreate(BaseModel):
    """Create a new curated resource."""
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    subject: str = Field(..., min_length=2, max_length=100)
    grade_level: Optional[int] = Field(None, ge=3, le=12)
    type: ResourceType = ResourceType.PDF
    tags: Optional[List[str]] = None
    content_url: str = Field(..., min_length=5)
    thumbnail_url: Optional[str] = None
    source: Optional[str] = None
    is_curated: bool = True

class ResourceUpdate(BaseModel):
    """Update curated resource fields."""
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=2, max_length=100)
    grade_level: Optional[int] = Field(None, ge=3, le=12)
    type: Optional[ResourceType] = None
    tags: Optional[List[str]] = None
    content_url: Optional[str] = Field(None, min_length=5)
    thumbnail_url: Optional[str] = None
    source: Optional[str] = None
    is_curated: Optional[bool] = None

class ResourceResponse(BaseModel):
    """Resource response model."""
    resource_id: int
    title: str
    description: Optional[str]
    subject: str
    grade_level: Optional[int]
    type: ResourceType
    tags: Optional[List[str]]
    content_url: str
    thumbnail_url: Optional[str]
    source: Optional[str]
    is_curated: bool
    created_at: datetime
    updated_at: Optional[datetime]
    views: int = 0
    downloads: int = 0
    likes: int = 0
    is_favorite: bool = False
    
    model_config = {"from_attributes": True}

class ResourceQuery(BaseModel):
    """Query filters for resources."""
    q: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[int] = None
    type: Optional[ResourceType] = None
    page: int = 1
    page_size: int = 20


# ==================== COMMON MODELS ====================

class MessageResponse(BaseModel):
    """Generic message response model."""
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== INVITE & RELATIONSHIP MODELS ====================

class InviteCodeGenerate(BaseModel):
    """Request to generate an invite code."""
    pass  # No parameters needed, uses authenticated user


class InviteCodeResponse(BaseModel):
    """Invite code response model."""
    code_id: int
    code: str
    creator_type: UserType
    used: bool
    used_by: Optional[int]
    created_at: datetime
    expires_at: datetime
    
    model_config = {"from_attributes": True}


class InviteCodeRedeem(BaseModel):
    """Request to redeem an invite code."""
    code: str = Field(..., min_length=8, max_length=8)


class UserRelationshipResponse(BaseModel):
    """User relationship response model."""
    relationship_id: int
    guardian_id: int
    student_id: int
    relationship_type: str
    created_at: datetime
    
    model_config = {"from_attributes": True}


class LinkedStudentResponse(BaseModel):
    """Response for a linked student's basic info."""
    user_id: int
    full_name: str
    email: str
    grade_level: Optional[int]
    school_name: Optional[str]
    profile_picture: Optional[str]
    relationship_type: str
    linked_at: datetime


class LinkedGuardianResponse(BaseModel):
    """Response for a linked guardian's basic info."""
    user_id: int
    full_name: str
    email: str
    profile_picture: Optional[str]
    user_type: UserType
    relationship_type: str
    linked_at: datetime


class StudentDashboardResponse(BaseModel):
    """Dashboard data for a student (viewed by teacher/parent)."""
    student_id: int
    student_name: str
    overall_gpa: float
    total_subjects: int
    strong_subjects: List[str]
    weak_subjects: List[str]
    recent_reports: List[ReportResponse]
    improving_subjects: List[str]
    declining_subjects: List[str]


class GuardianInsightCreate(BaseModel):
    """Request to create an insight for a student from teacher/parent."""
    student_id: int
    insight_type: InsightType
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10)


class GuardianInsightResponse(BaseModel):
    """Response for a guardian-created insight."""
    insight_id: int
    student_id: int
    insight_type: InsightType
    title: str
    content: str
    created_by: int
    created_by_name: str
    created_by_type: UserType
    created_at: datetime
    is_read: bool
    
    model_config = {"from_attributes": True}


# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    """Chat message model."""
    role: str  # "user" or "model" (or "assistant")
    content: str

class ChatRequest(BaseModel):
    """Chat request model."""
    message: str
    history: List[ChatMessage] = []
    subject: Optional[str] = None
    grade_level: Optional[int] = None
    context: Optional[str] = None


# ==================== VALIDATORS ====================

def validate_kenyan_grade(grade: str) -> str:
    """Validate Kenyan grade format (A, B+, B, C+, C, D+, D, E)."""
    valid_grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"]
    if grade.upper() not in valid_grades:
        raise ValueError(f"Invalid grade. Must be one of: {', '.join(valid_grades)}")
    return grade.upper()


def validate_kenyan_subject(subject: str) -> str:
    """Validate common Kenyan high school subjects."""
    common_subjects = [
        "Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology",
        "History", "Geography", "CRE", "IRE", "HRE", "Business Studies",
        "Agriculture", "Computer Studies", "French", "German", "Music", "Art"
    ]
    # Allow any subject but normalize
    return subject.title()
