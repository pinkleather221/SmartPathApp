"""
Pydantic models for request/response validation.
These models define the API contract for SmartPath.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


# Enums matching database enums
class UserType(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"


class CurriculumType(str, Enum):
    CBC = "CBC"
    EIGHT_FOUR_FOUR = "8-4-4"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class PlanStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


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
    grade_level: Optional[int] = Field(None, ge=7, le=12)
    curriculum_type: CurriculumType = CurriculumType.CBC
    phone_number: Optional[str] = None
    school_name: Optional[str] = None


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
    created_at: datetime
    
    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    """User profile update request model."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = None
    school_name: Optional[str] = None
    grade_level: Optional[int] = Field(None, ge=7, le=12)
    curriculum_type: Optional[CurriculumType] = None


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
    grade_level: Optional[int] = Field(None, ge=7, le=12)


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
        
        if hasattr(obj, 'times_reviewed') and hasattr(obj, 'times_correct') and hasattr(obj, 'difficulty'):
            mastery = calculate_mastery_level(
                obj.times_reviewed,
                obj.times_correct,
                obj.difficulty.value if hasattr(obj.difficulty, 'value') else str(obj.difficulty)
            )
            # Convert to percentage (0-100)
            mastery_level = mastery * 100
            review_count = obj.times_reviewed
        else:
            mastery_level = 0.0
            review_count = 0
        
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


class StudyPlanUpdate(BaseModel):
    """Study plan update request model."""
    is_active: Optional[bool] = None
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
    # Expose as 'strategy' to clients, map from DB field 'study_strategy'
    strategy: str = Field(default="", alias="study_strategy", description="Study strategy for this subject")
    # Expose as 'weekly_schedule' to clients, map from DB field 'weekly_schedule_json'
    weekly_schedule: List[Dict[str, Any]] = Field(default_factory=list, alias="weekly_schedule_json", description="Weekly study schedule")
    sessions: List["StudySessionResponse"] = Field(default_factory=list, description="Study sessions")
    created_at: datetime
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Override to ensure no null values."""
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
            # Ensure weekly_schedule_json is never null
            if obj.get("weekly_schedule_json") is None:
                obj["weekly_schedule_json"] = []
            # Ensure sessions is never null
            if obj.get("sessions") is None:
                obj["sessions"] = []
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
        return super().model_validate(obj, **kwargs)
    
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

