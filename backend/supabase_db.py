from datetime import datetime
from typing import List, Optional, Dict, Any
from config import supabase
import logging
logger = logging.getLogger(__name__)

# Check if supabase client is available
if supabase is None:
    raise ImportError("Supabase client not available. Install with: pip install supabase")


# ==================== USER OPERATIONS ====================

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID."""
    try:
        response = supabase.table('users').select('*').eq('user_id', user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {e}")
        return None

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email."""
    try:
        response = supabase.table('users').select('*').eq('email', email).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting user by email {email}: {e}")
        return None

def get_user_by_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """Get user by valid reset token."""
    try:
        now = datetime.utcnow().isoformat()
        response = supabase.table('users').select('*').eq('reset_token', token).gt('reset_token_expires', now).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting user by reset token: {e}")
        return None

def create_user(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new user."""
    try:
        response = supabase.table('users').insert(user_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return None

def update_user(user_id: int, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update user by ID."""
    try:
        response = supabase.table('users').update(user_data).eq('user_id', user_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        return None

def get_users_by_type(user_type: str) -> List[Dict[str, Any]]:
    """Get users by type."""
    try:
        response = supabase.table('users').select('*').eq('user_type', user_type).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting users by type {user_type}: {e}")
        return []


# ==================== ACADEMIC REPORTS ====================

def create_academic_report(report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new academic report."""
    try:
        # Calculate GPA
        grades_json = report_data.get('grades_json', {})
        overall_gpa = calculate_gpa(grades_json)
        report_data['overall_gpa'] = overall_gpa
        report_data['processed'] = True

        response = supabase.table('academic_reports').insert(report_data).execute()
        report = response.data[0] if response.data else None

        if report:
            # Update subject performance
            update_subject_performance(report['user_id'], grades_json)

        return report
    except Exception as e:
        logger.error(f"Error creating academic report: {e}")
        return None

def get_user_reports(user_id: int) -> List[Dict[str, Any]]:
    """Get academic reports for a user."""
    try:
        response = supabase.table('academic_reports').select('*').eq('user_id', user_id).order('report_date', desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting reports for user {user_id}: {e}")
        return []

def delete_academic_report(report_id: int, user_id: int) -> bool:
    """Delete an academic report."""
    try:
        response = supabase.table('academic_reports').delete().eq('report_id', report_id).eq('user_id', user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error deleting report {report_id}: {e}")
        return False


# ==================== SUBJECT PERFORMANCE ====================

def update_subject_performance(user_id: int, grades: Dict[str, str]):
    """Update subject performance records."""
    try:
        # Get historical grades for trend analysis
        reports = get_user_reports(user_id)
        grade_history = {}
        for report in reports[:5]:  # Last 5 reports
            for subject, grade in report.get('grades_json', {}).items():
                if subject not in grade_history:
                    grade_history[subject] = []
                grade_history[subject].append(grade_to_numeric(grade))

        for subject, grade in grades.items():
            subject_normalized = normalize_subject_name(subject)

            # Get existing performance record
            existing = supabase.table('subject_performance').select('*').eq('user_id', user_id).eq('subject', subject_normalized).execute()
            perf_record = existing.data[0] if existing.data else None

            # Calculate trend and other metrics
            subject_grades = grade_history.get(subject, [])
            subject_grades.insert(0, grade_to_numeric(grade))  # Add current grade

            trend = analyze_grade_trend(subject_grades)
            strength_score = calculate_strength_score(subject_grades)

            perf_data = {
                'user_id': user_id,
                'subject': subject_normalized,
                'current_grade': grade,
                'grade_numeric': grade_to_numeric(grade),
                'trend': trend,
                'strength_score': strength_score,
                'last_updated': datetime.utcnow().isoformat()
            }

            if perf_record:
                supabase.table('subject_performance').update(perf_data).eq('performance_id', perf_record['performance_id']).execute()
            else:
                supabase.table('subject_performance').insert(perf_data).execute()
    except Exception as e:
        logger.error(f"Error updating subject performance: {e}")

def get_subject_performance(user_id: int) -> List[Dict[str, Any]]:
    """Get subject performance for a user."""
    try:
        response = supabase.table('subject_performance').select('*').eq('user_id', user_id).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting subject performance for user {user_id}: {e}")
        return []


# ==================== FLASHCARDS ====================

def create_flashcard(card_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a new flashcard."""
    try:
        response = supabase.table('flashcards').insert(card_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating flashcard: {e}")
        return None

def get_user_flashcards(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Get flashcards for a user."""
    try:
        response = supabase.table('flashcards').select('*').eq('user_id', user_id).eq('is_active', True).limit(limit).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting flashcards for user {user_id}: {e}")
        return []

def update_flashcard(card_id: int, card_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a flashcard."""
    try:
        response = supabase.table('flashcards').update(card_data).eq('card_id', card_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating flashcard {card_id}: {e}")
        return None

def delete_flashcard(card_id: int, user_id: int) -> bool:
    """Delete a flashcard."""
    try:
        response = supabase.table('flashcards').delete().eq('card_id', card_id).eq('user_id', user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error deleting flashcard {card_id}: {e}")
        return False


# ==================== FLASHCARD REVIEWS ====================

def create_flashcard_review(review_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a flashcard review."""
    try:
        response = supabase.table('flashcard_reviews').insert(review_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating flashcard review: {e}")
        return None


# ==================== CAREER RECOMMENDATIONS ====================

def create_career_recommendation(rec_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a career recommendation."""
    try:
        response = supabase.table('career_recommendations').insert(rec_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating career recommendation: {e}")
        return None

def get_user_career_recommendations(user_id: int) -> List[Dict[str, Any]]:
    """Get career recommendations for a user."""
    try:
        response = supabase.table('career_recommendations').select('*').eq('user_id', user_id).order('generated_at', desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting career recommendations for user {user_id}: {e}")
        return []

def update_career_recommendation(rec_id: int, rec_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a career recommendation."""
    try:
        response = supabase.table('career_recommendations').update(rec_data).eq('recommendation_id', rec_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating career recommendation {rec_id}: {e}")
        return None

def delete_career_recommendation(rec_id: int, user_id: int) -> bool:
    """Delete a career recommendation."""
    try:
        response = supabase.table('career_recommendations').delete().eq('recommendation_id', rec_id).eq('user_id', user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error deleting career recommendation {rec_id}: {e}")
        return False


# ==================== STUDY PLANS ====================

def create_study_plan(plan_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a study plan."""
    try:
        response = supabase.table('study_plans').insert(plan_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating study plan: {e}")
        return None

def get_user_study_plans(user_id: int) -> List[Dict[str, Any]]:
    """Get study plans for a user."""
    try:
        response = supabase.table('study_plans').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting study plans for user {user_id}: {e}")
        return []

def update_study_plan(plan_id: int, plan_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update a study plan."""
    try:
        response = supabase.table('study_plans').update(plan_data).eq('plan_id', plan_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating study plan {plan_id}: {e}")
        return None

def delete_study_plan(plan_id: int, user_id: int) -> bool:
    """Delete a study plan."""
    try:
        response = supabase.table('study_plans').delete().eq('plan_id', plan_id).eq('user_id', user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error deleting study plan {plan_id}: {e}")
        return False


# ==================== STUDY SESSIONS ====================

def create_study_session(session_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a study session."""
    try:
        response = supabase.table('study_sessions').insert(session_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating study session: {e}")
        return None

def get_user_study_sessions(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Get study sessions for a user."""
    try:
        response = supabase.table('study_sessions').select('*').eq('user_id', user_id).order('date', desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting study sessions for user {user_id}: {e}")
        return []


# ==================== LEARNING INSIGHTS ====================

def create_learning_insight(insight_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create a learning insight."""
    try:
        response = supabase.table('learning_insights').insert(insight_data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating learning insight: {e}")
        return None

def get_user_insights(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Get learning insights for a user."""
    try:
        response = supabase.table('learning_insights').select('*').eq('user_id', user_id).order('generated_at', desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error getting insights for user {user_id}: {e}")
        return []

def mark_insight_read(insight_id: int) -> bool:
    """Mark an insight as read."""
    try:
        supabase.table('learning_insights').update({'is_read': True}).eq('insight_id', insight_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error marking insight {insight_id} as read: {e}")
        return False


# ==================== UTILITY FUNCTIONS ====================

def calculate_gpa(grades: Dict[str, str]) -> float:
    """Calculate GPA from grades dictionary."""
    from utils import grade_to_gpa
    if not grades:
        return 0.0

    total_points = 0
    total_subjects = 0

    for grade in grades.values():
        gpa = grade_to_gpa(grade)
        if gpa is not None:
            total_points += gpa
            total_subjects += 1

    return round(total_points / total_subjects, 2) if total_subjects > 0 else 0.0

def grade_to_numeric(grade: str) -> float:
    """Convert letter grade to numeric value."""
    from utils import grade_to_numeric
    return grade_to_numeric(grade)

def normalize_subject_name(subject: str) -> str:
    """Normalize subject name."""
    from utils import normalize_subject_name
    return normalize_subject_name(subject)

def analyze_grade_trend(grades: List[float]) -> str:
    """Analyze grade trend."""
    from utils import analyze_grade_trend
    return analyze_grade_trend(grades)

def calculate_strength_score(grades: List[float]) -> float:
    """Calculate strength score."""
    from utils import calculate_strength_score
    return calculate_strength_score(grades)
