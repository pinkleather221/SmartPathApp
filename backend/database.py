"""
Database models and connection setup for SmartPath.
Uses SQLAlchemy ORM for PostgreSQL database.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy import inspect, text
import enum

from config import settings

# Database engine - Use DATABASE_URL (Render Postgres or local)
# Normalize postgres:// -> postgresql:// for compatibility
database_url = settings.database_url_fixed if hasattr(settings, 'database_url_fixed') else settings.DATABASE_URL
# if settings.SUPABASE_DB_URL:
    # Only use Supabase if explicitly configured
    # database_url = settings.SUPABASE_DB_URL
engine = create_engine(
    database_url,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=settings.DEBUG,
    connect_args={
        "options": "-c timezone=utc",  # Set timezone to UTC
        "sslmode": "require"  # Require SSL for Render Postgres
    }
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


# Enums
class UserType(str, enum.Enum):
    """User type enumeration."""
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"


class CurriculumType(str, enum.Enum):
    """Curriculum type enumeration."""
    CBC = "CBC"
    EIGHT_FOUR_FOUR = "8-4-4"


class DifficultyLevel(str, enum.Enum):
    """Flashcard difficulty level."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class PlanStatus(str, enum.Enum):
    """Study plan status."""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class InsightType(str, enum.Enum):
    """Learning insight type."""
    FEEDBACK = "feedback"
    TIP = "tip"
    ANALYSIS = "analysis"
    RECOMMENDATION = "recommendation"
    MOTIVATION = "motivation"


# Database Models
class User(Base):
    """User model for authentication and profiles."""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    user_type = Column(SQLEnum(UserType), default=UserType.STUDENT, nullable=False)
    grade_level = Column(Integer, nullable=True)  # 7-12 for high school
    curriculum_type = Column(SQLEnum(CurriculumType), default=CurriculumType.CBC)
    phone_number = Column(String(20), nullable=True)
    school_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    reports = relationship("AcademicReport", back_populates="user", cascade="all, delete-orphan")
    subject_performances = relationship("SubjectPerformance", back_populates="user", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="user", cascade="all, delete-orphan")
    career_recommendations = relationship("CareerRecommendation", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("LearningInsight", back_populates="user", cascade="all, delete-orphan")


class AcademicReport(Base):
    """Academic report model for storing uploaded reports."""
    __tablename__ = "academic_reports"
    
    report_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    report_date = Column(DateTime, nullable=False)
    term = Column(String(50), nullable=False)  # e.g., "Term 1", "Term 2", "Term 3"
    year = Column(Integer, nullable=False)
    grades_json = Column(JSON, nullable=False)  # {"Math": "A", "English": "B+", ...}
    overall_gpa = Column(Float, nullable=True)
    file_path = Column(String(500), nullable=True)  # Path to uploaded file
    file_type = Column(String(50), nullable=True)  # pdf, image, etc.
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="reports")


class SubjectPerformance(Base):
    """Subject performance tracking model."""
    __tablename__ = "subject_performance"
    
    performance_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False, index=True)
    current_grade = Column(String(10), nullable=True)  # A, B+, B, etc.
    grade_numeric = Column(Float, nullable=True)  # Converted numeric value
    trend = Column(String(20), nullable=True)  # "improving", "declining", "stable"
    strength_score = Column(Float, default=0.0)  # 0-100 score
    weakness_areas = Column(JSON, nullable=True)  # List of weak topics
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subject_performances")


class Flashcard(Base):
    """Flashcard model for study materials."""
    __tablename__ = "flashcards"
    
    card_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False, index=True)
    topic = Column(String(200), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    times_reviewed = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    next_review_date = Column(DateTime, nullable=True)  # For spaced repetition
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="flashcards")
    reviews = relationship("FlashcardReview", back_populates="flashcard", cascade="all, delete-orphan")


class FlashcardReview(Base):
    """Flashcard review tracking model."""
    __tablename__ = "flashcard_reviews"
    
    review_id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("flashcards.card_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    correct = Column(Boolean, nullable=False)
    user_answer = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)  # LLM-generated feedback
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    flashcard = relationship("Flashcard", back_populates="reviews")


class CareerRecommendation(Base):
    """Career recommendation model."""
    __tablename__ = "career_recommendations"
    
    recommendation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    career_path = Column(String(200), nullable=False)
    career_description = Column(Text, nullable=True)
    suitable_universities = Column(JSON, nullable=True)  # List of university names
    course_requirements = Column(JSON, nullable=True)  # Required subjects and grades
    match_score = Column(Float, nullable=False)  # 0-100
    reasoning = Column(Text, nullable=True)  # LLM-generated explanation
    job_market_outlook = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_favorite = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="career_recommendations")


class StudyPlan(Base):
    """Study plan model for time management."""
    __tablename__ = "study_plans"
    
    plan_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False, index=True)
    focus_area = Column(String(200), nullable=True)  # Specific topic or chapter
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    daily_duration_minutes = Column(Integer, nullable=False)
    priority = Column(Integer, default=5)  # 1-10, higher is more important
    status = Column(SQLEnum(PlanStatus), default=PlanStatus.ACTIVE)
    study_strategy = Column(Text, nullable=True)  # LLM-generated strategy
    weekly_schedule_json = Column(JSON, nullable=True)  # Persisted weekly schedule from LLM
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="study_plans")
    sessions = relationship("StudySession", back_populates="plan", cascade="all, delete-orphan")


class StudySession(Base):
    """Study session tracking model."""
    __tablename__ = "study_sessions"
    
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.plan_id"), nullable=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    topics_covered = Column(JSON, nullable=True)  # List of topics studied
    
    # Relationships
    plan = relationship("StudyPlan", back_populates="sessions")


class LearningInsight(Base):
    """Learning insights and feedback model."""
    __tablename__ = "learning_insights"
    
    insight_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    insight_type = Column(SQLEnum(InsightType), nullable=False, index=True)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)  # Additional structured data
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_read = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="insights")


# Database dependency for FastAPI
def get_db():
    """Get database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize database
def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
    # Ensure missing columns are added for development environments
    try:
        with engine.connect() as conn:
            inspector = inspect(conn)
            study_plan_columns = {col['name'] for col in inspector.get_columns('study_plans')}
            if 'weekly_schedule_json' not in study_plan_columns:
                conn.execute(text("ALTER TABLE study_plans ADD COLUMN weekly_schedule_json JSON"))
                conn.commit()
            # Widen focus_area to TEXT to avoid truncation on long strategies
            try:
                conn.execute(text("ALTER TABLE study_plans ALTER COLUMN focus_area TYPE TEXT"))
                conn.commit()
            except Exception:
                # Ignore if already TEXT or migration handled elsewhere
                pass
    except Exception as e:
        # Non-fatal: log and continue; migration tools may manage schema in other environments
        print(f"⚠️  Schema check warning: {e}")


if __name__ == "__main__":
    init_db()
    print("Database tables created successfully!")

