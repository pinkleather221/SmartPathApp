"""
Core business logic services for SmartPath.
Handles grade analysis, career matching, study planning, and more.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Import Supabase database functions instead of SQLAlchemy
from supabase_db import (
    create_academic_report, get_user_reports, update_subject_performance, get_subject_performance,
    create_flashcard, get_user_flashcards, update_flashcard, create_flashcard_review,
    create_career_recommendation, get_user_career_recommendations,
    create_study_plan, get_user_study_plans, update_study_plan,
    create_study_session, get_user_study_sessions,
    create_learning_insight, get_user_insights, mark_insight_read,
    get_user_by_id, get_user_by_email, create_user, update_user, get_users_by_type
)
from models import (
    ReportAnalysis, SubjectPerformanceResponse, PerformanceDashboard,
    GradeTrend, PerformancePrediction, FlashcardResponse, CareerRecommendationResponse,
    StudyPlanResponse, StudySessionResponse, LearningInsightResponse, AcademicFeedback,
    InviteCodeResponse, LinkedStudentResponse, LinkedGuardianResponse, StudentDashboardResponse,
    ReportResponse
)
import secrets
import string
from utils import (
    grade_to_numeric, grade_to_gpa, calculate_gpa, analyze_grade_trend,
    predict_next_grade, identify_strong_subjects, identify_weak_subjects,
    calculate_strength_score, get_career_match_score, calculate_study_hours_needed,
    prioritize_study_topics, calculate_next_review_date, calculate_mastery_level,
    adjust_difficulty, extract_grades_from_text, normalize_subject_name,
    numeric_to_grade
)
from llm_service import llm_service
from config import supabase
import logging
logger = logging.getLogger(__name__)


# ==================== REPORT SERVICES ====================

class ReportService:
    """Service for handling academic reports."""

    @staticmethod
    def create_report(
        user_id: int,
        report_date: datetime,
        term: str,
        year: int,
        grades_json: Dict[str, str],
        file_path: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> Optional[Dict[str, any]]:
        """Create a new academic report."""
        report_data = {
            'user_id': user_id,
            'report_date': report_date.isoformat(),
            'term': term,
            'year': year,
            'grades_json': grades_json,
            'file_path': file_path,
            'file_type': file_type
        }

        report = create_academic_report(report_data)
        return report
    
    @staticmethod
    def _update_subject_performance(user_id: int, grades: Dict[str, str]):
        """Update subject performance records."""
        # Get historical grades for trend analysis
        reports = get_user_reports(user_id)

        for subject, grade in grades.items():
            subject_normalized = normalize_subject_name(subject)

            # Get existing performance record
            existing_perf = supabase.table('subject_performance').select('*').eq('user_id', user_id).eq('subject', subject_normalized).execute()
            perf_record = existing_perf.data[0] if existing_perf.data else None

            # Get grade history for trend
            grade_history = []
            for report in reports:
                if subject in report['grades_json']:
                    grade_history.append(grade_to_numeric(report['grades_json'][subject]))

            # Add current grade
            current_numeric = grade_to_numeric(grade)
            grade_history.insert(0, current_numeric)

            # Analyze trend
            trend = analyze_grade_trend(grade_history) if len(grade_history) > 1 else "stable"
            strength_score = calculate_strength_score(grade, trend)

            # Identify weakness areas (if grade is low)
            weakness_areas = []
            if current_numeric < 6.0:  # Below C+
                weakness_areas = [f"{subject_normalized} fundamentals"]

            perf_data = {
                'user_id': user_id,
                'subject': subject_normalized,
                'current_grade': grade,
                'grade_numeric': current_numeric,
                'trend': trend,
                'strength_score': strength_score,
                'weakness_areas': weakness_areas,
                'last_updated': datetime.utcnow().isoformat()
            }

            if perf_record:
                supabase.table('subject_performance').update(perf_data).eq('performance_id', perf_record['performance_id']).execute()
            else:
                supabase.table('subject_performance').insert(perf_data).execute()
    
    @staticmethod
    async def analyze_report(report_id: int) -> ReportAnalysis:
        """Analyze a report and generate insights."""
        # Get all reports for the user to find this specific report
        # This is a simplified approach - in production, you'd want to optimize this
        from supabase_db import supabase

        # Get the specific report
        response = supabase.table('academic_reports').select('*').eq('report_id', report_id).execute()
        if not response.data:
            raise ValueError("Report not found")

        report = response.data[0]
        grades = report['grades_json']
        strong_subjects = identify_strong_subjects(grades, "B+")
        weak_subjects = identify_weak_subjects(grades, "B")  # Changed from "C" to "B" to catch more subjects

        # Get previous reports for trend analysis
        prev_reports = supabase.table('academic_reports').select('*').eq('user_id', report['user_id']).neq('report_id', report_id).lt('report_date', report['report_date']).order('report_date', desc=True).limit(1).execute()

        trend_analysis = {}
        if prev_reports.data:
            prev_report = prev_reports.data[0]
            for subject in grades.keys():
                current = grade_to_numeric(grades.get(subject, "E"))
                previous = grade_to_numeric(prev_report['grades_json'].get(subject, "E"))
                if current > previous:
                    trend_analysis[subject] = "improving"
                elif current < previous:
                    trend_analysis[subject] = "declining"
                else:
                    trend_analysis[subject] = "stable"
        else:
            # For first report, mark all subjects as stable
            for subject in grades.keys():
                trend_analysis[subject] = "stable"
        
        # Generate AI-powered recommendations using Gemini
        try:
                recommendations = await llm_service.generate_study_recommendations(
                    grades=grades,
                    strong_subjects=strong_subjects,
                    weak_subjects=weak_subjects,
                    overall_gpa=report.get('overall_gpa', 0.0) or 0.0,
                    trend_analysis=trend_analysis if prev_report else None
                )
        except Exception as e:
            logger.error(f"Error generating AI recommendations: {e}")
            # Fallback recommendations
            recommendations = []
            if weak_subjects:
                recommendations.append(f"Focus on improving {', '.join(weak_subjects[:3])}")
            if strong_subjects:
                recommendations.append(f"Maintain excellence in {', '.join(strong_subjects[:2])}")
            if not recommendations:
                recommendations.append("Keep up the consistent study habits for continued success")
        
        result = ReportAnalysis(
            report_id=report_id,
            overall_gpa=report.get('overall_gpa', 0.0) or 0.0,
            subject_count=len(grades),
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            trend_analysis=trend_analysis,
            recommendations=recommendations
        )
        logger.debug(f"Returning analysis with trend_analysis: {trend_analysis}")
        return result
    
    @staticmethod
    def get_report_history(user_id: int, limit: int = 10) -> List[Dict[str, any]]:
        """Get user's report history."""
        return get_user_reports(user_id)[:limit]


# ==================== PERFORMANCE SERVICES ====================

class PerformanceService:
    """Service for performance analytics."""
    
    @staticmethod
    def get_dashboard(user_id: int) -> PerformanceDashboard:
        """Get performance dashboard data."""
        # Get reports for the user
        reports = get_user_reports(user_id)

        if not reports:
            return PerformanceDashboard(
                overall_gpa=0.0,
                total_subjects=0,
                strong_subjects=[],
                weak_subjects=[],
                improving_subjects=[],
                declining_subjects=[],
                recent_reports=[]
            )

        # Get latest report (first in sorted list)
        latest_report = reports[0]

        # Get subject performances
        subject_perfs = get_subject_performance(user_id)

        strong_subjects = [sp for sp in subject_perfs if sp['strength_score'] >= 70]
        weak_subjects = [sp for sp in subject_perfs if sp['strength_score'] < 60]
        improving = [sp['subject'] for sp in subject_perfs if sp['trend'] == "improving"]
        declining = [sp['subject'] for sp in subject_perfs if sp['trend'] == "declining"]

        # Get recent reports (up to 5)
        recent_reports = reports[:5]

        # Convert to response format
        from models import ReportResponse, SubjectPerformanceResponse
        recent_reports_response = []
        for report in recent_reports:
            # Convert datetime string back to datetime for validation
            report_copy = report.copy()
            report_copy['report_date'] = datetime.fromisoformat(report['report_date'])
            recent_reports_response.append(ReportResponse.model_validate(report_copy))

        return PerformanceDashboard(
            overall_gpa=latest_report.get('overall_gpa', 0.0) or 0.0,
            total_subjects=len(latest_report.get('grades_json', {})),
            subject_performance=[SubjectPerformanceResponse.model_validate(sp) for sp in subject_perfs],
            strong_subjects=[SubjectPerformanceResponse.model_validate(sp) for sp in strong_subjects],
            weak_subjects=[SubjectPerformanceResponse.model_validate(sp) for sp in weak_subjects],
            improving_subjects=improving,
            declining_subjects=declining,
            recent_reports=recent_reports_response
        )
    
    @staticmethod
    def get_grade_trends(user_id: int, subject: Optional[str] = None) -> List[GradeTrend]:
        """Get grade trends for subjects."""
        reports = get_user_reports(user_id)
        
        if not reports:
            return []
        
        # Group by subject
        subject_data: Dict[str, List[Tuple[datetime, float]]] = {}
        for report in reports:
            # Convert report_date string to datetime object for proper sorting and comparison
            report_date = datetime.fromisoformat(report['report_date'])
            for subj, grade in report['grades_json'].items():
                if subject and subj != subject:
                    continue
                if subj not in subject_data:
                    subject_data[subj] = []
                subject_data[subj].append((report_date, grade_to_numeric(grade)))
        
        trends = []
        for subj, data in subject_data.items():
            # Sort data by date before extracting
            data.sort(key=lambda x: x[0])
            dates = [d[0] for d in data]
            grades = [d[1] for d in data]
            trend = analyze_grade_trend(grades)
            predicted = predict_next_grade(grades)
            
            trends.append(GradeTrend(
                subject=subj,
                grades=grades,
                dates=dates,
                trend=trend,
                predicted_next=predicted
            ))
        
        return trends
    
    @staticmethod
    async def get_predictions(user_id: int) -> List[PerformancePrediction]:
        """Get performance predictions using LLM."""
        # Get grade history
        reports = get_user_reports(user_id)
        
        if not reports:
            return []
        
        # Build grade history by subject
        grade_history: Dict[str, List[float]] = {}
        for report in reports:
            for subject, grade in report['grades_json'].items():
                if subject not in grade_history:
                    grade_history[subject] = []
                grade_history[subject].append(grade_to_numeric(grade))
        
        # Get LLM analysis
        analysis = await llm_service.analyze_performance_trends(grade_history, list(grade_history.keys()))
        
        predictions = []
        for subject, history in grade_history.items():
            current_grade = numeric_to_grade(history[-1]) if history else "E"
            trend_data = analysis.get("trends", {}).get(subject, {})
            predicted_numeric = trend_data.get("predicted_next", predict_next_grade(history))
            predicted_grade = numeric_to_grade(predicted_numeric)
            confidence = trend_data.get("confidence", 0.7)
            
            predictions.append(PerformancePrediction(
                subject=subject,
                current_grade=current_grade,
                predicted_next_grade=predicted_grade,
                confidence=confidence,
                factors=trend_data.get("factors", [])
            ))
        
        return predictions


# ==================== FLASHCARD SERVICES ====================

class FlashcardService:
    """Service for flashcard management."""
    
    @staticmethod
    async def generate_flashcards(
        user_id: int,
        subject: str,
        topic: Optional[str],
        count: int,
        grade_level: int,
        curriculum: str
    ) -> List[Dict[str, Any]]:
        """Generate flashcards using LLM."""
        flashcards_data = await llm_service.generate_flashcards(
            subject=subject,
            topic=topic,
            grade_level=grade_level,
            count=count,
            curriculum=curriculum
        )
        
        flashcards = []
        for card_data in flashcards_data:
            difficulty = card_data.get("difficulty", "medium")
            flashcard = create_flashcard({
                "user_id": user_id,
                "subject": subject,
                "topic": topic,
                "question": card_data.get("question", ""),
                "answer": card_data.get("answer", ""),
                "difficulty": difficulty,
                "is_active": True,
                "times_reviewed": 0,
                "times_correct": 0,
                "next_review_date": datetime.utcnow().isoformat()
            })
            if flashcard:
                flashcards.append(flashcard)
        
        return flashcards
    
    @staticmethod
    def review_flashcard(
        card_id: int,
        user_id: int,
        correct: bool,
        user_answer: Optional[str] = None
    ) -> FlashcardReview:
        """Record a flashcard review."""
        existing_flashcard = supabase.table('flashcards').select('*').eq('card_id', card_id).eq('user_id', user_id).execute()
        flashcard = existing_flashcard.data[0] if existing_flashcard.data else None
        
        if not flashcard:
            raise ValueError("Flashcard not found")
        
        # Update flashcard stats
        times_reviewed = flashcard.get('times_reviewed', 0) + 1
        times_correct = flashcard.get('times_correct', 0)
        if correct:
            times_correct += 1
        last_reviewed = datetime.utcnow().isoformat()
        
        # Calculate and update mastery level (for logic, not directly stored in DB currently)
        mastery = calculate_mastery_level(
            times_reviewed,
            times_correct,
            flashcard.get('difficulty', 'medium')
        )
        
        # Calculate next review date
        next_review_date = calculate_next_review_date(
            datetime.fromisoformat(last_reviewed),
            flashcard.get('difficulty', 'medium'),
            correct,
            times_reviewed
        ).isoformat()
        
        # Adjust difficulty
        new_difficulty = adjust_difficulty(
            flashcard.get('difficulty', 'medium'),
            times_reviewed,
            times_correct
        )
        
        update_data = {
            'times_reviewed': times_reviewed,
            'times_correct': times_correct,
            'last_reviewed': last_reviewed,
            'next_review_date': next_review_date,
            'difficulty': new_difficulty
        }
        
        supabase.table('flashcards').update(update_data).eq('card_id', card_id).execute()
        
        # Create review record
        review_data = {
            'card_id': card_id,
            'user_id': user_id,
            'correct': correct,
            'user_answer': user_answer,
            'reviewed_at': datetime.utcnow().isoformat()
        }
        create_flashcard_review(review_data)
        
        return {"message": "Review recorded", "mastery_level": mastery * 100}
    
    @staticmethod
    async def evaluate_answer(
        card_id: int,
        user_id: int,
        user_answer: str
    ) -> Dict:
        """Evaluate student's answer using LLM."""
        flashcard_response = supabase.table('flashcards').select('*').eq('card_id', card_id).eq('user_id', user_id).execute()
        flashcard = flashcard_response.data[0] if flashcard_response.data else None
        
        if not flashcard:
            raise ValueError("Flashcard not found")
        
        evaluation = await llm_service.evaluate_answer(
            question=flashcard['question'],
            correct_answer=flashcard['answer'],
            student_answer=user_answer,
            subject=flashcard['subject']
        )
        
        # Record review
        FlashcardService.review_flashcard(
            card_id, user_id, evaluation.get("correct", False), user_answer
        )
        
        return evaluation


# ==================== CAREER SERVICES ====================

class CareerService:
    """Service for career recommendations."""
    
    @staticmethod
    async def generate_recommendations(
        user_id: int,
        interests: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Generate career recommendations using LLM."""
        # Get user's latest grades
        latest_report_response = supabase.table('academic_reports').select('*').eq('user_id', user_id).order('report_date', desc=True).limit(1).execute()
        latest_report = latest_report_response.data[0] if latest_report_response.data else None
        
        if not latest_report:
            raise ValueError("No academic reports found. Please upload a report first.")
        
        user_response = supabase.table('users').select('*').eq('user_id', user_id).limit(1).execute()
        user = user_response.data[0] if user_response.data else None
        grades = latest_report['grades_json']
        subjects = list(grades.keys())
        
        # Get LLM recommendations
        recommendations_data = await llm_service.generate_career_recommendations(
            subjects=subjects,
            grades=grades,
            interests=interests,
            grade_level=user['grade_level'] if user and 'grade_level' in user else 10
        )
        
        # Delete old recommendations
        supabase.table('career_recommendations').delete().eq('user_id', user_id).execute()
        
        # Create new recommendations
        recommendations = []
        for rec_data in recommendations_data:
            rec = create_career_recommendation({
                "user_id": user_id,
                "career_path": rec_data.get("career_path", ""),
                "career_description": rec_data.get("career_description"),
                "suitable_universities": rec_data.get("suitable_universities", []),
                "course_requirements": rec_data.get("course_requirements", {}),
                "match_score": rec_data.get("match_score", 0.0),
                "reasoning": rec_data.get("reasoning"),
                "job_market_outlook": rec_data.get("job_market_outlook")
            })
            if rec:
                recommendations.append(rec)
        
        return recommendations


# ==================== STUDY PLAN SERVICES ====================

class StudyPlanService:
    """Service for study planning."""
    
    @staticmethod
    async def generate_study_plan(
        user_id: int,
        subjects: List[str],
        available_hours: float,
        exam_date: Optional[datetime] = None,
        focus_areas: Optional[Dict[str, List[str]]] = None,
        priority: Optional[int] = 5, # Added priority parameter
        active_days: Optional[List[str]] = None # Added active_days parameter
    ) -> List[Dict[str, Any]]:
        """Generate study plans using LLM."""
        # Get weak subjects
        weak_subjects_response = supabase.table('subject_performance').select('subject').eq('user_id', user_id).in_('subject', subjects).lt('strength_score', 60).execute()
        weak_subject_names = [sp['subject'] for sp in weak_subjects_response.data] if weak_subjects_response.data else subjects
        
        # Get user's grade level for better LLM context
        user_response = supabase.table('users').select('grade_level').eq('user_id', user_id).limit(1).execute()
        user = user_response.data[0] if user_response.data else None
        grade_level = user['grade_level'] if user and 'grade_level' in user else 10
        
        # Get LLM plan with retry logic
        import logging
        logger = logging.getLogger(__name__)
        
        plan_data = None
        max_retries = 2
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting to generate study plan (attempt {attempt + 1}/{max_retries})")
                plan_data = await llm_service.generate_study_plan(
                    weak_subjects=weak_subject_names,
                    available_hours=available_hours,
                    exam_date=exam_date,
                    grade_level=grade_level,
                    focus_areas=focus_areas
                )
                logger.info("Successfully received LLM response")
                break
            except Exception as e:
                logger.warning(f"LLM call failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    # Last attempt failed, use fallback
                    logger.error("All LLM attempts failed, using fallback")
                    plan_data = {
                        "weekly_schedule": [],
                        "focus_areas": {},
                        "strategies": {},
                        "recommendations": ["Study regularly for consistent progress"]
                    }
                else:
                    # Wait a bit before retry
                    import asyncio
                    await asyncio.sleep(1)
        
        # Create study plans
        plans = []
        weekly_schedule = plan_data.get("weekly_schedule", [])
        strategies = plan_data.get("strategies", {})
        focus_areas_from_llm = plan_data.get("focus_areas", {})
        recommendations = plan_data.get("recommendations", [])
        
        # Log what we received from LLM
        logger.info(f"LLM returned: weekly_schedule={len(weekly_schedule)} entries, "
                   f"focus_areas={len(focus_areas_from_llm)} subjects, "
                   f"strategies={len(strategies)} subjects, "
                   f"recommendations={len(recommendations)} items")

        # Generate default weekly schedule if LLM didn't provide one
        if not weekly_schedule:
            from datetime import timedelta
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            # Filter days based on active_days if provided, otherwise use all days
            effective_days = active_days if active_days is not None and len(active_days) > 0 else days
            
            weekly_schedule_data = []
            for i, day in enumerate(days):
                if day in effective_days: # Only add active days
                    # Distribute subjects across the week for active days
                    subject_index = i % len(subjects) if subjects else 0
                    if subjects:
                        weekly_schedule_data.append({
                            "day": day,
                            "is_active": True, # Mark as active
                            "subjects": [{
                                "subject": subjects[subject_index],
                                "duration_minutes": int((available_hours * 60) / len(effective_days)), # Divide by active days
                                "focus": f"Review key concepts and practice problems",
                                "priority": 8 if subjects[subject_index] in weak_subject_names else 5
                            }]
                        })
                else:
                    weekly_schedule_data.append({
                        "day": day,
                        "is_active": False, # Mark as inactive
                        "subjects": [],
                        "duration_minutes": 0,
                        "focus": "",
                        "priority": 0
                    })
            weekly_schedule = weekly_schedule_data
        for subject in subjects:
            # Calculate duration based on priority
            priority = 5
            if subject in weak_subject_names:
                priority = 8

            daily_duration = int((available_hours * 60) / len(subjects))

            # Get or generate focus area - prioritize user-specified focus areas, then LLM-generated
            focus_area = ""
            if focus_areas and subject in focus_areas and focus_areas[subject]:
                topics = ", ".join(focus_areas[subject])
                # Use LLM-generated focus area if available, but incorporate user topics
                if focus_areas_from_llm.get(subject):
                    llm_focus = str(focus_areas_from_llm[subject] or "").strip()
                    if llm_focus and llm_focus != f"Core concepts and fundamentals of {subject}":
                        # LLM provided specific focus areas, use them but ensure user topics are mentioned
                        if subject.lower() == "kiswahili":
                            focus_area = f"{llm_focus} (Mkazo: {topics})"
                        else:
                            focus_area = f"{llm_focus} (Emphasizing: {topics})"
                        logger.info(f"Using LLM-generated focus area for {subject} with user topics: {focus_area[:100]}")
                    else:
                        focus_area = f"Focus on: {topics}"
                else:
                    focus_area = f"Focus on: {topics}"
            elif focus_areas_from_llm.get(subject):
                focus_area = str(focus_areas_from_llm[subject] or "").strip()
                if focus_area and focus_area != f"Core concepts and fundamentals of {subject}":
                    logger.info(f"Using LLM-generated focus area for {subject}: {focus_area[:100]}")
                else:
                    focus_area = f"Focus on core concepts and practice regularly for {subject}"
            elif (strategies.get(subject) or "").strip():
                # Use strategy as focus area if it's specific (not generic)
                strategy_text = (strategies.get(subject) or "").strip()
                if len(strategy_text) > 50 and "core concepts" not in strategy_text.lower():
                    focus_area = strategy_text[:200]  # Use first 200 chars of strategy
                    logger.info(f"Using strategy as focus area for {subject}: {focus_area[:100]}")
                else:
                    focus_area = f"Focus on core concepts, practice problems, and regular review sessions for {subject}"
            else:
                focus_area = f"Focus on core concepts, practice problems, and regular review sessions for {subject}"

            # Get or generate study strategy - incorporate user-specified focus areas
            study_strategy = (strategies.get(subject) or "").strip()
            if not study_strategy:
                if focus_areas and subject in focus_areas and focus_areas[subject]:
                    topics = ", ".join(focus_areas[subject])
                    study_strategy = (
                        f"Study {subject} for {daily_duration} minutes daily, with emphasis on: {topics}. "
                        f"Break down these topics into manageable chunks, practice regularly with exercises specific to these areas, "
                        f"and review previous lessons weekly. Use active recall techniques and solve practice problems "
                        f"focused on {topics} to reinforce learning."
                    )
                else:
                    study_strategy = (
                        f"Study {subject} for {daily_duration} minutes daily. "
                        f"Break down topics into manageable chunks, practice regularly, "
                        f"and review previous lessons weekly. Use active recall techniques "
                        f"and solve practice problems to reinforce learning."
                    )
            
            # Update weekly schedule to include focus areas if specified
            if focus_areas and subject in focus_areas and focus_areas[subject]:
                topics = ", ".join(focus_areas[subject])
                # Update the weekly schedule entries for this subject
                for day_schedule in weekly_schedule:
                    if "subjects" in day_schedule:
                        for subj_entry in day_schedule["subjects"]:
                            if isinstance(subj_entry, dict) and subj_entry.get("subject") == subject:
                                existing_focus = subj_entry.get("focus", "")
                                if existing_focus:
                                    subj_entry["focus"] = f"{topics} - {existing_focus}"
                                else:
                                    subj_entry["focus"] = topics

            plan = create_study_plan({
                "user_id": user_id,
                "subject": subject,
                "focus_area": focus_area,
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (exam_date if exam_date else (datetime.utcnow() + timedelta(days=90))).isoformat(),
                "daily_duration_minutes": daily_duration,
                "priority": priority,
                "status": "ACTIVE", # Use string value
                "study_strategy": study_strategy,
                "weekly_schedule_json": weekly_schedule
            })
            if plan:
                plans.append(plan)

        return plans

    @staticmethod
    def get_plan_by_id(plan_id: int) -> Dict[str, Any]:
        """Get study plan by ID with sessions and weekly schedule."""
        plan_response = supabase.table('study_plans').select('*').eq('plan_id', plan_id).execute()
        plan = plan_response.data[0] if plan_response.data else None
        if not plan:
            raise ValueError("Study plan not found")
        
        # Get sessions
        sessions_response = supabase.table('study_sessions').select('*').eq('plan_id', plan_id).execute()
        sessions = sessions_response.data
        
        # Convert to response models
        weekly_schedule = plan.get('weekly_schedule_json', []) or []
        session_responses = [StudySessionResponse.model_validate(s) for s in sessions]
        
        # Create response with additional fields
        response_data = {
            **plan,
            "weekly_schedule": weekly_schedule,
            "sessions": session_responses
        }

        # Explicitly ensure strategy field is set
        response_data["strategy"] = plan.get('study_strategy', '')

        return response_data


# ==================== INSIGHT SERVICES ====================

class InsightService:
    """Service for learning insights."""
    
    @staticmethod
    async def generate_feedback(
        user_id: int
    ) -> AcademicFeedback:
        """Generate academic feedback using LLM."""
        # Get latest reports
        reports_response = supabase.table('academic_reports').select('*').eq('user_id', user_id).order('report_date', desc=True).limit(2).execute()
        reports = reports_response.data
        
        if not reports:
            return AcademicFeedback(
                strengths=[],
                weaknesses=[],
                recommendations=["Upload your first report to get personalized feedback."],
                motivational_message="Start your learning journey today!",
                next_steps=["Upload academic report"]
            )
        
        current = reports[0]['grades_json']
        previous = reports[1]['grades_json'] if len(reports) > 1 else None
        
        user_response = supabase.table('users').select('*').eq('user_id', user_id).limit(1).execute()
        user = user_response.data[0] if user_response.data else None
        if not user:
            return AcademicFeedback(
                strengths=[],
                weaknesses=[],
                recommendations=["User not found."],
                motivational_message="Please contact support.",
                next_steps=[]
            )
        
        feedback = await llm_service.generate_academic_feedback(
            current_grades=current,
            previous_grades=previous,
            grade_level=user.get('grade_level', 10),
            curriculum=user.get('curriculum_type', 'CBE')
        )
        
        # Save as insight
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Create feedback insight
            feedback_insight_data = {
                "user_id": user_id,
                "insight_type": "feedback", # Use string literal
                "title": "Academic Feedback",
                "content": feedback.get("motivational_message", "Academic feedback generated."),
                "metadata_json": feedback
            }
            feedback_insight = create_learning_insight(feedback_insight_data)
            
            # Create additional insights from recommendations
            if feedback.get("recommendations") and feedback_insight:
                for i, rec in enumerate(feedback.get("recommendations", [])[:5]):  # Limit to 5
                    rec_insight_data = {
                        "user_id": user_id,
                        "insight_type": "recommendation", # Use string literal
                        "title": f"Study Recommendation {i+1}",
                        "content": rec,
                        "metadata_json": {"source": "academic_feedback", "related_feedback": feedback_insight['insight_id']}
                    }
                    create_learning_insight(rec_insight_data)
            
            # Create insights from strengths
            if feedback.get("strengths"):
                strengths_text = "Your academic strengths:\n" + "\n".join(f"• {s}" for s in feedback.get("strengths", []))
                strength_insight_data = {
                    "user_id": user_id,
                    "insight_type": "analysis", # Use string literal
                    "title": "Academic Strengths",
                    "content": strengths_text,
                    "metadata_json": {"source": "academic_feedback", "type": "strengths"}
                }
                create_learning_insight(strength_insight_data)
            
            # Create insights from weaknesses
            if feedback.get("weaknesses"):
                weaknesses_text = "Areas for improvement:\n" + "\n".join(f"• {w}" for w in feedback.get("weaknesses", []))
                weakness_insight_data = {
                    "user_id": user_id,
                    "insight_type": "analysis", # Use string literal
                    "title": "Areas for Improvement",
                    "content": weaknesses_text,
                    "metadata_json": {"source": "academic_feedback", "type": "weaknesses"}
                }
                create_learning_insight(weakness_insight_data)
            
            # Create tips insight from next steps
            if feedback.get("next_steps"):
                tips_text = "Recommended next steps:\n" + "\n".join(f"• {step}" for step in feedback.get("next_steps", []))
                tips_insight_data = {
                    "user_id": user_id,
                    "insight_type": "tip", # Use string literal
                    "title": "Learning Tips",
                    "content": tips_text,
                    "metadata_json": {"source": "academic_feedback", "type": "next_steps"}
                }
                create_learning_insight(tips_insight_data)
            
            logger.info(f"Successfully created insights for user {user_id}")
        except Exception as e:
            # Log error but don't fail the request
            logger.warning(f"Could not save insights: {e}", exc_info=True)
        
        return AcademicFeedback(**feedback)


# ==================== INVITE SERVICES ====================

class InviteService:
    """Service for invite code management."""
    
    @staticmethod
    def generate_code() -> str:
        """Generate a random 8-character invite code."""
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(8))
    
    @staticmethod
    def create_invite_code(creator_id: int, creator_type: UserType) -> Dict[str, Any]:
        """Create a new invite code for a teacher or parent."""
        # Validate creator type
        if creator_type not in [UserType.TEACHER, UserType.PARENT]:
            raise ValueError("Only teachers and parents can create invite codes")
        
        # Generate unique code
        code = InviteService.generate_code()
        while supabase.table('invite_codes').select('*').eq('code', code).execute().data:
            code = InviteService.generate_code()
        
        # Create invite code (expires in 7 days)
        invite_data = {
            "code": code,
            "creator_id": creator_id,
            "creator_type": creator_type.value, # Use string value
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "used": False
        }
        response = supabase.table('invite_codes').insert(invite_data).execute()
        
        return response.data[0]
    
    @staticmethod
    def get_my_codes(user_id: int) -> List[Dict[str, Any]]:
        """Get all invite codes created by a user."""
        response = supabase.table('invite_codes').select('*').eq('creator_id', user_id).order('created_at', desc=True).execute()
        return response.data
    
    @staticmethod
    def redeem_code(code: str, student_id: int) -> Dict[str, Any]:
        """Redeem an invite code and create a relationship."""
        # Find the invite code
        invite_response = supabase.table('invite_codes').select('*').eq('code', code.upper()).execute()
        invite = invite_response.data[0] if invite_response.data else None
        
        if not invite:
            raise ValueError("Invalid invite code")
        
        if invite['used']:
            raise ValueError("This invite code has already been used")
        
        if datetime.fromisoformat(invite['expires_at']) < datetime.utcnow():
            raise ValueError("This invite code has expired")
        
        # Verify the redeemer is a student
        student_response = supabase.table('users').select('*').eq('user_id', student_id).limit(1).execute()
        student = student_response.data[0] if student_response.data else None
        if not student or student.get('user_type') != 'STUDENT':
            raise ValueError("Only students can redeem invite codes")
        
        # Check if relationship already exists
        existing_rel_response = supabase.table('user_relationships').select('*').eq('guardian_id', invite['creator_id']).eq('student_id', student_id).execute()
        if existing_rel_response.data:
            raise ValueError("You are already linked to this teacher/parent")
        
        # Determine relationship type
        relationship_type = "teacher-student" if invite.get('creator_type') == 'TEACHER' else "parent-child"
        
        # Create relationship
        relationship_data = {
            "guardian_id": invite['creator_id'],
            "student_id": student_id,
            "relationship_type": relationship_type
        }
        relationship_response = supabase.table('user_relationships').insert(relationship_data).execute()
        relationship = relationship_response.data[0] if relationship_response.data else None
        
        # Mark invite as used
        supabase.table('invite_codes').update({'used': True, 'used_by': student_id}).eq('code', code.upper()).execute()
        
        return relationship


# ==================== RELATIONSHIP SERVICES ====================

class RelationshipService:
    """Service for managing user relationships."""
    
    @staticmethod
    def get_linked_students(guardian_id: int) -> List[Dict[str, Any]]:
        """Get all students linked to a teacher/parent."""
        relationships_response = supabase.table('user_relationships').select('*').eq('guardian_id', guardian_id).execute()
        relationships = relationships_response.data
        
        students_data = []
        for rel in relationships:
            student_response = supabase.table('users').select('*').eq('user_id', rel['student_id']).limit(1).execute()
            student = student_response.data[0] if student_response.data else None
            if student:
                students_data.append({
                    "user_id": student['user_id'],
                    "full_name": student['full_name'],
                    "email": student['email'],
                    "grade_level": student.get('grade_level'),
                    "school_name": student.get('school_name'),
                    "profile_picture": student.get('profile_picture'),
                    "relationship_type": rel['relationship_type'],
                    "linked_at": rel['created_at']
                })
        
        return students_data
    
    @staticmethod
    def get_linked_guardians(student_id: int) -> List[Dict[str, Any]]:
        """Get all teachers/parents linked to a student."""
        relationships_response = supabase.table('user_relationships').select('*').eq('student_id', student_id).execute()
        relationships = relationships_response.data
        
        guardians_data = []
        for rel in relationships:
            guardian_response = supabase.table('users').select('*').eq('user_id', rel['guardian_id']).limit(1).execute()
            guardian = guardian_response.data[0] if guardian_response.data else None
            if guardian:
                guardians_data.append({
                    "user_id": guardian['user_id'],
                    "full_name": guardian['full_name'],
                    "email": guardian['email'],
                    "profile_picture": guardian.get('profile_picture'),
                    "user_type": guardian['user_type'],
                    "relationship_type": rel['relationship_type'],
                    "linked_at": rel['created_at']
                })
        
        return guardians_data
    
    @staticmethod
    def verify_relationship(guardian_id: int, student_id: int) -> bool:
        """Verify that a relationship exists between guardian and student."""
        relationship_response = supabase.table('user_relationships').select('*').eq('guardian_id', guardian_id).eq('student_id', student_id).execute()
        return len(relationship_response.data) > 0
    
    @staticmethod
    def get_student_dashboard(guardian_id: int, student_id: int) -> StudentDashboardResponse:
        """Get dashboard data for a student (for teacher/parent view)."""
        # Verify relationship exists
        if not RelationshipService.verify_relationship(guardian_id, student_id):
            raise ValueError("You do not have permission to view this student's data")
        
        # Get student info
        student_response = supabase.table('users').select('*').eq('user_id', student_id).limit(1).execute()
        student = student_response.data[0] if student_response.data else None
        if not student:
            raise ValueError("Student not found")
        
        # Get latest report
        latest_report_response = supabase.table('academic_reports').select('*').eq('user_id', student_id).order('report_date', desc=True).limit(1).execute()
        latest_report = latest_report_response.data[0] if latest_report_response.data else None
        
        if not latest_report:
            return StudentDashboardResponse(
                student_id=student_id,
                student_name=student['full_name'],
                overall_gpa=0.0,
                total_subjects=0,
                strong_subjects=[],
                weak_subjects=[],
                recent_reports=[],
                improving_subjects=[],
                declining_subjects=[]
            )
        
        # Get subject performances
        subject_perfs_response = supabase.table('subject_performance').select('*').eq('user_id', student_id).execute()
        subject_perfs = subject_perfs_response.data
        
        strong_subjects = [sp['subject'] for sp in subject_perfs if sp['strength_score'] >= 70]
        weak_subjects = [sp['subject'] for sp in subject_perfs if sp['strength_score'] < 60]
        improving = [sp['subject'] for sp in subject_perfs if sp['trend'] == "improving"]
        declining = [sp['subject'] for sp in subject_perfs if sp['trend'] == "declining"]
        
        # Get recent reports
        recent_reports_response = supabase.table('academic_reports').select('*').eq('user_id', student_id).order('report_date', desc=True).limit(5).execute()
        recent_reports = recent_reports_response.data
        
        # Convert datetime strings back to datetime objects for validation
        formatted_recent_reports = []
        for report in recent_reports:
            report_copy = report.copy()
            report_copy['report_date'] = datetime.fromisoformat(report['report_date'])
            formatted_recent_reports.append(ReportResponse.model_validate(report_copy))

        return StudentDashboardResponse(
            student_id=student_id,
            student_name=student['full_name'],
            overall_gpa=latest_report.get('overall_gpa', 0.0) or 0.0,
            total_subjects=len(latest_report.get('grades_json', {})),
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            recent_reports=formatted_recent_reports,
            improving_subjects=improving,
            declining_subjects=declining
        )
    
    @staticmethod
    def remove_relationship(guardian_id: int, student_id: int) -> bool:
        """Remove a relationship between guardian and student."""
        relationship_response = supabase.table('user_relationships').delete().eq('guardian_id', guardian_id).eq('student_id', student_id).execute()
        return len(relationship_response.data) > 0


