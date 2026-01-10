"""
Core business logic services for SmartPath.
Handles grade analysis, career matching, study planning, and more.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import (
    User, AcademicReport, SubjectPerformance, Flashcard, FlashcardReview,
    CareerRecommendation, StudyPlan, StudySession, LearningInsight,
    DifficultyLevel, PlanStatus, InsightType, InviteCode, UserRelationship, UserType
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


# ==================== REPORT SERVICES ====================

class ReportService:
    """Service for handling academic reports."""
    
    @staticmethod
    def create_report(
        db: Session,
        user_id: int,
        report_date: datetime,
        term: str,
        year: int,
        grades_json: Dict[str, str],
        file_path: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> AcademicReport:
        """Create a new academic report."""
        overall_gpa = calculate_gpa(grades_json)
        
        report = AcademicReport(
            user_id=user_id,
            report_date=report_date,
            term=term,
            year=year,
            grades_json=grades_json,
            overall_gpa=overall_gpa,
            file_path=file_path,
            file_type=file_type,
            processed=True
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # Update subject performance
        ReportService._update_subject_performance(db, user_id, grades_json)
        
        return report
    
    @staticmethod
    def _update_subject_performance(db: Session, user_id: int, grades: Dict[str, str]):
        """Update subject performance records."""
        # Get historical grades for trend analysis
        reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).limit(5).all()
        
        for subject, grade in grades.items():
            subject_normalized = normalize_subject_name(subject)
            
            # Get existing performance record
            perf = db.query(SubjectPerformance).filter(
                SubjectPerformance.user_id == user_id,
                SubjectPerformance.subject == subject_normalized
            ).first()
            
            # Get grade history for trend
            grade_history = []
            for report in reports:
                if subject in report.grades_json:
                    grade_history.append(grade_to_numeric(report.grades_json[subject]))
            
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
            
            if perf:
                perf.current_grade = grade
                perf.grade_numeric = current_numeric
                perf.trend = trend
                perf.strength_score = strength_score
                perf.weakness_areas = weakness_areas
            else:
                perf = SubjectPerformance(
                    user_id=user_id,
                    subject=subject_normalized,
                    current_grade=grade,
                    grade_numeric=current_numeric,
                    trend=trend,
                    strength_score=strength_score,
                    weakness_areas=weakness_areas
                )
                db.add(perf)
        
        db.commit()
    
    @staticmethod
    async def analyze_report(db: Session, report_id: int) -> ReportAnalysis:
        """Analyze a report and generate insights."""
        report = db.query(AcademicReport).filter(AcademicReport.report_id == report_id).first()
        if not report:
            raise ValueError("Report not found")
        
        grades = report.grades_json
        strong_subjects = identify_strong_subjects(grades, "B+")
        weak_subjects = identify_weak_subjects(grades, "C")
        
        # Get previous report for trend
        prev_report = db.query(AcademicReport).filter(
            AcademicReport.user_id == report.user_id,
            AcademicReport.report_id != report_id,
            AcademicReport.report_date < report.report_date
        ).order_by(desc(AcademicReport.report_date)).first()
        
        trend_analysis = {}
        if prev_report:
            for subject in grades.keys():
                current = grade_to_numeric(grades.get(subject, "E"))
                previous = grade_to_numeric(prev_report.grades_json.get(subject, "E"))
                if current > previous:
                    trend_analysis[subject] = "improving"
                elif current < previous:
                    trend_analysis[subject] = "declining"
                else:
                    trend_analysis[subject] = "stable"
        
        # Generate AI-powered recommendations using Gemini
        try:
            recommendations = await llm_service.generate_study_recommendations(
                grades=grades,
                strong_subjects=strong_subjects,
                weak_subjects=weak_subjects,
                overall_gpa=report.overall_gpa or 0.0,
                trend_analysis=trend_analysis if prev_report else None
            )
        except Exception as e:
            print(f"Error generating AI recommendations: {e}")
            # Fallback recommendations
            recommendations = []
            if weak_subjects:
                recommendations.append(f"Focus on improving {', '.join(weak_subjects[:3])}")
            if strong_subjects:
                recommendations.append(f"Maintain excellence in {', '.join(strong_subjects[:2])}")
            if not recommendations:
                recommendations.append("Keep up the consistent study habits for continued success")
        
        return ReportAnalysis(
            report_id=report_id,
            overall_gpa=report.overall_gpa or 0.0,
            subject_count=len(grades),
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            trend_analysis=trend_analysis,
            recommendations=recommendations
        )
    
    @staticmethod
    def get_report_history(db: Session, user_id: int, limit: int = 10) -> List[AcademicReport]:
        """Get user's report history."""
        return db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).limit(limit).all()


# ==================== PERFORMANCE SERVICES ====================

class PerformanceService:
    """Service for performance analytics."""
    
    @staticmethod
    def get_dashboard(db: Session, user_id: int) -> PerformanceDashboard:
        """Get performance dashboard data."""
        # Get latest report
        latest_report = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).first()
        
        if not latest_report:
            return PerformanceDashboard(
                overall_gpa=0.0,
                total_subjects=0,
                strong_subjects=[],
                weak_subjects=[],
                improving_subjects=[],
                declining_subjects=[],
                recent_reports=[]
            )
        
        # Get subject performances
        subject_perfs = db.query(SubjectPerformance).filter(
            SubjectPerformance.user_id == user_id
        ).all()
        
        strong_subjects = [sp for sp in subject_perfs if sp.strength_score >= 70]
        weak_subjects = [sp for sp in subject_perfs if sp.strength_score < 60]
        improving = [sp.subject for sp in subject_perfs if sp.trend == "improving"]
        declining = [sp.subject for sp in subject_perfs if sp.trend == "declining"]
        
        # Get recent reports
        recent_reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).limit(5).all()
        
        # Convert recent reports to ReportResponse format (simplified)
        from models import ReportResponse
        recent_reports_response = [ReportResponse.model_validate(r) for r in recent_reports]
        
        return PerformanceDashboard(
            overall_gpa=latest_report.overall_gpa or 0.0,
            total_subjects=len(latest_report.grades_json),
            strong_subjects=[SubjectPerformanceResponse.model_validate(sp) for sp in strong_subjects],
            weak_subjects=[SubjectPerformanceResponse.model_validate(sp) for sp in weak_subjects],
            improving_subjects=improving,
            declining_subjects=declining,
            recent_reports=recent_reports_response
        )
    
    @staticmethod
    def get_grade_trends(db: Session, user_id: int, subject: Optional[str] = None) -> List[GradeTrend]:
        """Get grade trends for subjects."""
        reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(AcademicReport.report_date).all()
        
        if not reports:
            return []
        
        # Group by subject
        subject_data: Dict[str, List[Tuple[datetime, float]]] = {}
        for report in reports:
            for subj, grade in report.grades_json.items():
                if subject and subj != subject:
                    continue
                if subj not in subject_data:
                    subject_data[subj] = []
                subject_data[subj].append((report.report_date, grade_to_numeric(grade)))
        
        trends = []
        for subj, data in subject_data.items():
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
    async def get_predictions(db: Session, user_id: int) -> List[PerformancePrediction]:
        """Get performance predictions using LLM."""
        # Get grade history
        reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(AcademicReport.report_date).all()
        
        if not reports:
            return []
        
        # Build grade history by subject
        grade_history: Dict[str, List[float]] = {}
        for report in reports:
            for subject, grade in report.grades_json.items():
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
        db: Session,
        user_id: int,
        subject: str,
        topic: Optional[str],
        count: int,
        grade_level: int,
        curriculum: str
    ) -> List[Flashcard]:
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
            difficulty = DifficultyLevel(card_data.get("difficulty", "medium"))
            flashcard = Flashcard(
                user_id=user_id,
                subject=subject,
                topic=topic,
                question=card_data.get("question", ""),
                answer=card_data.get("answer", ""),
                difficulty=difficulty
            )
            db.add(flashcard)
            flashcards.append(flashcard)
        
        db.commit()
        return flashcards
    
    @staticmethod
    def review_flashcard(
        db: Session,
        card_id: int,
        user_id: int,
        correct: bool,
        user_answer: Optional[str] = None
    ) -> FlashcardReview:
        """Record a flashcard review."""
        flashcard = db.query(Flashcard).filter(
            Flashcard.card_id == card_id,
            Flashcard.user_id == user_id
        ).first()
        
        if not flashcard:
            raise ValueError("Flashcard not found")
        
        # Update flashcard stats
        flashcard.times_reviewed += 1
        if correct:
            flashcard.times_correct += 1
        flashcard.last_reviewed = datetime.utcnow()
        
        # Calculate and update mastery level
        mastery = calculate_mastery_level(
            flashcard.times_reviewed,
            flashcard.times_correct,
            flashcard.difficulty.value
        )
        # Store mastery as percentage (0-100) in a computed property or calculate on-the-fly
        # Since database doesn't have mastery_level column, we calculate it when needed
        
        # Calculate next review date
        flashcard.next_review_date = calculate_next_review_date(
            flashcard.last_reviewed,
            flashcard.difficulty.value,
            correct,
            flashcard.times_reviewed
        )
        
        # Adjust difficulty
        flashcard.difficulty = DifficultyLevel(adjust_difficulty(
            flashcard.difficulty.value,
            flashcard.times_reviewed,
            flashcard.times_correct
        ))
        
        # Create review record
        review = FlashcardReview(
            card_id=card_id,
            user_id=user_id,
            correct=correct,
            user_answer=user_answer
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        return review
    
    @staticmethod
    async def evaluate_answer(
        db: Session,
        card_id: int,
        user_id: int,
        user_answer: str
    ) -> Dict:
        """Evaluate student's answer using LLM."""
        flashcard = db.query(Flashcard).filter(
            Flashcard.card_id == card_id,
            Flashcard.user_id == user_id
        ).first()
        
        if not flashcard:
            raise ValueError("Flashcard not found")
        
        evaluation = await llm_service.evaluate_answer(
            question=flashcard.question,
            correct_answer=flashcard.answer,
            student_answer=user_answer,
            subject=flashcard.subject
        )
        
        # Record review
        FlashcardService.review_flashcard(
            db, card_id, user_id, evaluation.get("correct", False), user_answer
        )
        
        return evaluation


# ==================== CAREER SERVICES ====================

class CareerService:
    """Service for career recommendations."""
    
    @staticmethod
    async def generate_recommendations(
        db: Session,
        user_id: int,
        interests: Optional[List[str]] = None
    ) -> List[CareerRecommendation]:
        """Generate career recommendations using LLM."""
        # Get user's latest grades
        latest_report = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).first()
        
        if not latest_report:
            raise ValueError("No academic reports found. Please upload a report first.")
        
        user = db.query(User).filter(User.user_id == user_id).first()
        grades = latest_report.grades_json
        subjects = list(grades.keys())
        
        # Get LLM recommendations
        recommendations_data = await llm_service.generate_career_recommendations(
            subjects=subjects,
            grades=grades,
            interests=interests,
            grade_level=user.grade_level or 10
        )
        
        # Delete old recommendations
        db.query(CareerRecommendation).filter(
            CareerRecommendation.user_id == user_id
        ).delete()
        
        # Create new recommendations
        recommendations = []
        for rec_data in recommendations_data:
            rec = CareerRecommendation(
                user_id=user_id,
                career_path=rec_data.get("career_path", ""),
                career_description=rec_data.get("career_description"),
                suitable_universities=rec_data.get("suitable_universities", []),
                course_requirements=rec_data.get("course_requirements", {}),
                match_score=rec_data.get("match_score", 0.0),
                reasoning=rec_data.get("reasoning"),
                job_market_outlook=rec_data.get("job_market_outlook")
            )
            db.add(rec)
            recommendations.append(rec)
        
        db.commit()
        return recommendations


# ==================== STUDY PLAN SERVICES ====================

class StudyPlanService:
    """Service for study planning."""
    
    @staticmethod
    async def generate_study_plan(
        db: Session,
        user_id: int,
        subjects: List[str],
        available_hours: float,
        exam_date: Optional[datetime] = None,
        focus_areas: Optional[Dict[str, List[str]]] = None
    ) -> List[StudyPlan]:
        """Generate study plans using LLM."""
        # Get weak subjects
        weak_subjects = db.query(SubjectPerformance).filter(
            SubjectPerformance.user_id == user_id,
            SubjectPerformance.subject.in_(subjects),
            SubjectPerformance.strength_score < 60
        ).all()
        
        weak_subject_names = [sp.subject for sp in weak_subjects] if weak_subjects else subjects
        
        # Get user's grade level for better LLM context
        user = db.query(User).filter(User.user_id == user_id).first()
        grade_level = user.grade_level if user and user.grade_level else 10
        
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
            weekly_schedule = []
            for i, day in enumerate(days):
                # Distribute subjects across the week
                subject_index = i % len(subjects) if subjects else 0
                if subjects:
                    weekly_schedule.append({
                        "day": day,
                        "subjects": [{
                            "subject": subjects[subject_index],
                            "duration_minutes": int((available_hours * 60) / len(subjects)),
                            "focus": f"Review key concepts and practice problems",
                            "priority": 8 if subjects[subject_index] in weak_subject_names else 5
                        }]
                    })

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

            plan = StudyPlan(
                user_id=user_id,
                subject=subject,
                focus_area=focus_area,
                start_date=datetime.utcnow(),
                end_date=exam_date if exam_date else (datetime.utcnow() + timedelta(days=90)),
                daily_duration_minutes=daily_duration,
                priority=priority,
                status=PlanStatus.ACTIVE,
                study_strategy=study_strategy,
                weekly_schedule_json=weekly_schedule  # Persist the weekly schedule
            )
            db.add(plan)
            plans.append(plan)

        db.commit()
        return plans

    @staticmethod
    def get_plan_by_id(db: Session, plan_id: int) -> StudyPlanResponse:
        """Get study plan by ID with sessions and weekly schedule."""
        plan = db.query(StudyPlan).filter(StudyPlan.plan_id == plan_id).first()
        if not plan:
            raise ValueError("Study plan not found")
        
        # Get sessions
        sessions = db.query(StudySession).filter(StudySession.plan_id == plan_id).all()
        
        # Convert to response models
        weekly_schedule = plan.weekly_schedule_json or []
        session_responses = [StudySessionResponse.model_validate(s) for s in sessions]
        
        # Create response with additional fields
        response_data = {
            **plan.__dict__,
            "weekly_schedule": weekly_schedule,
            "sessions": session_responses
        }
        
        return StudyPlanResponse.model_validate(response_data)


# ==================== INSIGHT SERVICES ====================

class InsightService:
    """Service for learning insights."""
    
    @staticmethod
    async def generate_feedback(
        db: Session,
        user_id: int
    ) -> AcademicFeedback:
        """Generate academic feedback using LLM."""
        # Get latest reports
        reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == user_id
        ).order_by(desc(AcademicReport.report_date)).limit(2).all()
        
        if not reports:
            return AcademicFeedback(
                strengths=[],
                weaknesses=[],
                recommendations=["Upload your first report to get personalized feedback."],
                motivational_message="Start your learning journey today!",
                next_steps=["Upload academic report"]
            )
        
        current = reports[0].grades_json
        previous = reports[1].grades_json if len(reports) > 1 else None
        
        user = db.query(User).filter(User.user_id == user_id).first()
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
            grade_level=user.grade_level or 10,
            curriculum=user.curriculum_type.value if user.curriculum_type else "CBE"
        )
        
        # Save as insight
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Create feedback insight
            feedback_insight = LearningInsight(
                user_id=user_id,
                insight_type=InsightType.FEEDBACK,
                title="Academic Feedback",
                content=feedback.get("motivational_message", "Academic feedback generated."),
                metadata_json=feedback
            )
            db.add(feedback_insight)
            
            # Create additional insights from recommendations
            if feedback.get("recommendations"):
                for i, rec in enumerate(feedback.get("recommendations", [])[:5]):  # Limit to 5
                    rec_insight = LearningInsight(
                        user_id=user_id,
                        insight_type=InsightType.RECOMMENDATION,
                        title=f"Study Recommendation {i+1}",
                        content=rec,
                        metadata_json={"source": "academic_feedback", "related_feedback": feedback_insight.insight_id}
                    )
                    db.add(rec_insight)
            
            # Create insights from strengths
            if feedback.get("strengths"):
                strengths_text = "Your academic strengths:\n" + "\n".join(f"• {s}" for s in feedback.get("strengths", []))
                strength_insight = LearningInsight(
                    user_id=user_id,
                    insight_type=InsightType.ANALYSIS,
                    title="Academic Strengths",
                    content=strengths_text,
                    metadata_json={"source": "academic_feedback", "type": "strengths"}
                )
                db.add(strength_insight)
            
            # Create insights from weaknesses
            if feedback.get("weaknesses"):
                weaknesses_text = "Areas for improvement:\n" + "\n".join(f"• {w}" for w in feedback.get("weaknesses", []))
                weakness_insight = LearningInsight(
                    user_id=user_id,
                    insight_type=InsightType.ANALYSIS,
                    title="Areas for Improvement",
                    content=weaknesses_text,
                    metadata_json={"source": "academic_feedback", "type": "weaknesses"}
                )
                db.add(weakness_insight)
            
            # Create tips insight from next steps
            if feedback.get("next_steps"):
                tips_text = "Recommended next steps:\n" + "\n".join(f"• {step}" for step in feedback.get("next_steps", []))
                tips_insight = LearningInsight(
                    user_id=user_id,
                    insight_type=InsightType.TIP,
                    title="Learning Tips",
                    content=tips_text,
                    metadata_json={"source": "academic_feedback", "type": "next_steps"}
                )
                db.add(tips_insight)
            
            db.commit()
            logger.info(f"Successfully created insights for user {user_id}")
        except Exception as e:
            # Log error but don't fail the request
            logger.warning(f"Could not save insights: {e}", exc_info=True)
            db.rollback()
        
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
    def create_invite_code(db: Session, creator_id: int, creator_type: UserType) -> InviteCode:
        """Create a new invite code for a teacher or parent."""
        # Validate creator type
        if creator_type not in [UserType.TEACHER, UserType.PARENT]:
            raise ValueError("Only teachers and parents can create invite codes")
        
        # Generate unique code
        code = InviteService.generate_code()
        while db.query(InviteCode).filter(InviteCode.code == code).first():
            code = InviteService.generate_code()
        
        # Create invite code (expires in 7 days)
        invite = InviteCode(
            code=code,
            creator_id=creator_id,
            creator_type=creator_type,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        db.add(invite)
        db.commit()
        db.refresh(invite)
        
        return invite
    
    @staticmethod
    def get_my_codes(db: Session, user_id: int) -> List[InviteCode]:
        """Get all invite codes created by a user."""
        return db.query(InviteCode).filter(
            InviteCode.creator_id == user_id
        ).order_by(InviteCode.created_at.desc()).all()
    
    @staticmethod
    def redeem_code(db: Session, code: str, student_id: int) -> UserRelationship:
        """Redeem an invite code and create a relationship."""
        # Find the invite code
        invite = db.query(InviteCode).filter(
            InviteCode.code == code.upper()
        ).first()
        
        if not invite:
            raise ValueError("Invalid invite code")
        
        if invite.used:
            raise ValueError("This invite code has already been used")
        
        if invite.expires_at < datetime.utcnow():
            raise ValueError("This invite code has expired")
        
        # Verify the redeemer is a student
        student = db.query(User).filter(User.user_id == student_id).first()
        if not student or student.user_type != UserType.STUDENT:
            raise ValueError("Only students can redeem invite codes")
        
        # Check if relationship already exists
        existing = db.query(UserRelationship).filter(
            UserRelationship.guardian_id == invite.creator_id,
            UserRelationship.student_id == student_id
        ).first()
        
        if existing:
            raise ValueError("You are already linked to this teacher/parent")
        
        # Determine relationship type
        relationship_type = "teacher-student" if invite.creator_type == UserType.TEACHER else "parent-child"
        
        # Create relationship
        relationship = UserRelationship(
            guardian_id=invite.creator_id,
            student_id=student_id,
            relationship_type=relationship_type
        )
        
        # Mark invite as used
        invite.used = True
        invite.used_by = student_id
        
        db.add(relationship)
        db.commit()
        db.refresh(relationship)
        
        return relationship


# ==================== RELATIONSHIP SERVICES ====================

class RelationshipService:
    """Service for managing user relationships."""
    
    @staticmethod
    def get_linked_students(db: Session, guardian_id: int) -> List[LinkedStudentResponse]:
        """Get all students linked to a teacher/parent."""
        relationships = db.query(UserRelationship).filter(
            UserRelationship.guardian_id == guardian_id
        ).all()
        
        students = []
        for rel in relationships:
            student = db.query(User).filter(User.user_id == rel.student_id).first()
            if student:
                students.append(LinkedStudentResponse(
                    user_id=student.user_id,
                    full_name=student.full_name,
                    email=student.email,
                    grade_level=student.grade_level,
                    school_name=student.school_name,
                    relationship_type=rel.relationship_type,
                    linked_at=rel.created_at
                ))
        
        return students
    
    @staticmethod
    def get_linked_guardians(db: Session, student_id: int) -> List[LinkedGuardianResponse]:
        """Get all teachers/parents linked to a student."""
        relationships = db.query(UserRelationship).filter(
            UserRelationship.student_id == student_id
        ).all()
        
        guardians = []
        for rel in relationships:
            guardian = db.query(User).filter(User.user_id == rel.guardian_id).first()
            if guardian:
                guardians.append(LinkedGuardianResponse(
                    user_id=guardian.user_id,
                    full_name=guardian.full_name,
                    email=guardian.email,
                    user_type=guardian.user_type,
                    relationship_type=rel.relationship_type,
                    linked_at=rel.created_at
                ))
        
        return guardians
    
    @staticmethod
    def verify_relationship(db: Session, guardian_id: int, student_id: int) -> bool:
        """Verify that a relationship exists between guardian and student."""
        relationship = db.query(UserRelationship).filter(
            UserRelationship.guardian_id == guardian_id,
            UserRelationship.student_id == student_id
        ).first()
        return relationship is not None
    
    @staticmethod
    def get_student_dashboard(db: Session, guardian_id: int, student_id: int) -> StudentDashboardResponse:
        """Get dashboard data for a student (for teacher/parent view)."""
        # Verify relationship exists
        if not RelationshipService.verify_relationship(db, guardian_id, student_id):
            raise ValueError("You do not have permission to view this student's data")
        
        # Get student info
        student = db.query(User).filter(User.user_id == student_id).first()
        if not student:
            raise ValueError("Student not found")
        
        # Get latest report
        latest_report = db.query(AcademicReport).filter(
            AcademicReport.user_id == student_id
        ).order_by(AcademicReport.report_date.desc()).first()
        
        if not latest_report:
            return StudentDashboardResponse(
                student_id=student_id,
                student_name=student.full_name,
                overall_gpa=0.0,
                total_subjects=0,
                strong_subjects=[],
                weak_subjects=[],
                recent_reports=[],
                improving_subjects=[],
                declining_subjects=[]
            )
        
        # Get subject performances
        subject_perfs = db.query(SubjectPerformance).filter(
            SubjectPerformance.user_id == student_id
        ).all()
        
        strong_subjects = [sp.subject for sp in subject_perfs if sp.strength_score >= 70]
        weak_subjects = [sp.subject for sp in subject_perfs if sp.strength_score < 60]
        improving = [sp.subject for sp in subject_perfs if sp.trend == "improving"]
        declining = [sp.subject for sp in subject_perfs if sp.trend == "declining"]
        
        # Get recent reports
        recent_reports = db.query(AcademicReport).filter(
            AcademicReport.user_id == student_id
        ).order_by(AcademicReport.report_date.desc()).limit(5).all()
        
        return StudentDashboardResponse(
            student_id=student_id,
            student_name=student.full_name,
            overall_gpa=latest_report.overall_gpa or 0.0,
            total_subjects=len(latest_report.grades_json),
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            recent_reports=[ReportResponse.model_validate(r) for r in recent_reports],
            improving_subjects=improving,
            declining_subjects=declining
        )
    
    @staticmethod
    def remove_relationship(db: Session, guardian_id: int, student_id: int) -> bool:
        """Remove a relationship between guardian and student."""
        relationship = db.query(UserRelationship).filter(
            UserRelationship.guardian_id == guardian_id,
            UserRelationship.student_id == student_id
        ).first()
        
        if not relationship:
            return False
        
        db.delete(relationship)
        db.commit()
        return True



