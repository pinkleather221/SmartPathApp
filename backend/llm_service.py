import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from config import settings
import logging
logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with Gemini LLM."""
    
    def __init__(self):
        """Initialize LLM service with Gemini."""
        self.provider = settings.LLM_PROVIDER.lower()
        self.model_name = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens = settings.LLM_MAX_TOKENS
        
        # Initialize Gemini client
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            try:
                self.model = genai.GenerativeModel(self.model_name)
                self.client_available = True
            except Exception as e:
                logger.warning(f"Gemini initialization error: {e}")
                self.client_available = False
        else:
            self.client_available = False
            logger.warning("No Gemini API key configured. LLM features will be disabled.")
    
    def _generate_cache_key(self, prompt: str, context: Dict) -> str:
        """Generate cache key for prompt."""
        content = f"{prompt}{json.dumps(context, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _call_gemini(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call Gemini API."""
        if not self.client_available:
            raise ValueError("Gemini client not initialized")
        
        try:
            # Combine system prompt and user prompt
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            
            # Default safety settings; relatively permissive but safe for edu content
            # Use a conservative set of safety settings with categories known to be widely supported
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
            ]

            # Generate content
            try:
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=self.max_tokens,
                    ),
                    safety_settings=safety_settings,
                )
            except Exception:
                # Fallback: retry without safety_settings if the SDK rejects categories
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=self.max_tokens,
                    ),
                )

            # Prefer quick accessor, but fall back to stitching from candidates when absent
            text = getattr(response, "text", None)
            if text and text.strip():
                return text.strip()

            # Try to collect text from candidates/parts
            collected: List[str] = []
            for cand in getattr(response, "candidates", []) or []:
                parts = getattr(getattr(cand, "content", None), "parts", []) or []
                for p in parts:
                    # Parts often expose .text; fallback to str
                    part_text = getattr(p, "text", None)
                    if part_text:
                        collected.append(part_text)
            stitched = "\n".join([t for t in collected if t and t.strip()])
            if stitched.strip():
                return stitched.strip()

            # No usable text: attempt a second pass with even more permissive thresholds
            relaxed_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
            try:
                response2 = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=self.max_tokens,
                    ),
                    safety_settings=relaxed_settings,
                )
            except Exception:
                response2 = self.model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=self.temperature,
                        max_output_tokens=self.max_tokens,
                    ),
                )
            text2 = getattr(response2, "text", None)
            if text2 and text2.strip():
                return text2.strip()
            collected2: List[str] = []
            for cand in getattr(response2, "candidates", []) or []:
                parts = getattr(getattr(cand, "content", None), "parts", []) or []
                for p in parts:
                    part_text = getattr(p, "text", None)
                    if part_text:
                        collected2.append(part_text)
            stitched2 = "\n".join([t for t in collected2 if t and t.strip()])
            if stitched2.strip():
                return stitched2.strip()

            # Still nothing: raise to trigger fallback
            raise RuntimeError("No text returned from Gemini response")
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    async def generate(self, prompt: str, context: Optional[Dict] = None, system_prompt: Optional[str] = None, json_mode: bool = False) -> str:
        """Generate text using Gemini LLM."""
        if not self.client_available:
            return self._get_fallback_response(prompt)
        
        context = context or {}
        system_prompt = system_prompt or "You are a helpful AI assistant for SmartPath, an educational platform for Kenyan high school students. Always respond in JSON format when requested."
        
        # Add context to prompt if provided
        if context:
            context_str = json.dumps(context, indent=2)
            prompt = f"{prompt}\n\nContext:\n{context_str}"
        
        # Request JSON format if needed
        if json_mode:
            prompt = f"{prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or explanatory text. Just the raw JSON."
        
        try:
            response = await self._call_gemini(prompt, system_prompt)
            
            # Clean JSON response if json_mode
            if json_mode:
                # Remove markdown code blocks if present
                response = response.strip()
                if response.startswith("```json"):
                    response = response[7:]
                elif response.startswith("```"):
                    response = response[3:]
                if response.endswith("```"):
                    response = response[:-3]
                response = response.strip()
            
            return response
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return self._get_fallback_response(prompt)
    
    def _get_fallback_response(self, prompt: str) -> str:
        """Return fallback response when LLM is unavailable."""
        # For study plan generation, return a basic structure
        if "study plan" in prompt.lower():
            # Extract subjects from prompt if possible
            subjects = []
            if "Subjects to Study:" in prompt:
                subjects_part = prompt.split("Subjects to Study:")[1].split("\n")[0]
                subjects = [s.strip() for s in subjects_part.split(",")]
            if not subjects:
                subjects = ["Mathematics", "Physics"]  # Default fallback

            # Create basic focus areas
            focus_areas = {}
            strategies = {}
            for subject in subjects:
                focus_areas[subject] = f"Core concepts and fundamentals of {subject}"
                strategies[subject] = f"Study {subject} regularly with practice exercises and review sessions."

            return json.dumps({
                "weekly_schedule": [],
                "focus_areas": focus_areas,
                "strategies": strategies,
                "recommendations": ["Study regularly for consistent progress"]
            })
        return json.dumps({"error": "LLM service temporarily unavailable", "message": "Please try again later"})
    
    # ==================== FLASHCARD GENERATION ====================
    
    async def generate_flashcards(
        self,
        subject: str,
        topic: Optional[str],
        grade_level: int,
        count: int = 5,
        curriculum: str = "CBE"
    ) -> List[Dict[str, str]]:
        """Generate flashcards for a subject and topic."""
        prompt = f"""Generate {count} educational flashcards for a Kenyan high school student in Grade {grade_level} studying {subject}.
{f"Focus on the topic: {topic}." if topic else ""}
Curriculum: {curriculum}

For each flashcard, provide:
1. A clear, age-appropriate question
2. A comprehensive answer suitable for Grade {grade_level} level

Return ONLY a JSON array with this exact format:
[
  {{
    "question": "Question text here",
    "answer": "Answer text here",
    "difficulty": "easy|medium|hard"
  }},
  ...
]

Make questions progressively more challenging. Ensure content is relevant to Kenyan curriculum."""
        
        try:
            response = await self.generate(prompt, json_mode=True)
            data = json.loads(response)
            
            if isinstance(data, list):
                return data[:count]
            elif isinstance(data, dict) and "flashcards" in data:
                return data["flashcards"][:count]
            else:
                return []
        except Exception as e:
            logger.error(f"Flashcard generation error: {e}")
            return []
    
    # ==================== ACADEMIC FEEDBACK ====================
    
    async def generate_academic_feedback(
        self,
        current_grades: Dict[str, str],
        previous_grades: Optional[Dict[str, str]],
        grade_level: int,
        curriculum: str = "CBE"
    ) -> Dict[str, Any]:
        """Generate personalized academic feedback."""
        prompt = f"""Analyze the academic performance of a Grade {grade_level} Kenyan student (Curriculum: {curriculum}).

Current Grades:
{json.dumps(current_grades, indent=2)}

{f"Previous Grades:\n{json.dumps(previous_grades, indent=2)}" if previous_grades else "No previous grades available."}

Provide a comprehensive analysis in JSON format:
{{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "motivational_message": "Encouraging message here",
  "next_steps": ["step1", "step2", ...]
}}

Be specific, constructive, and culturally appropriate for Kenyan students."""
        
        try:
            response = await self.generate(prompt, json_mode=True)
            # Try to parse JSON response
            try:
                feedback_data = json.loads(response)
            except json.JSONDecodeError:
                # If response is not valid JSON, try to extract JSON from markdown
                import re
                feedback_data = None
                
                # Try to find JSON object
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    try:
                        feedback_data = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                
                # If still no data, use empty dict (fallback will handle it)
                if feedback_data is None:
                    feedback_data = {}
            
            # Ensure all required fields exist
            return {
                "strengths": feedback_data.get("strengths", []),
                "weaknesses": feedback_data.get("weaknesses", []),
                "recommendations": feedback_data.get("recommendations", ["Continue working hard and seek help when needed."]),
                "motivational_message": feedback_data.get("motivational_message", "Keep up the good work!"),
                "next_steps": feedback_data.get("next_steps", ["Review weak areas", "Practice regularly"])
            }
        except Exception as e:
            logger.error(f"Feedback generation error: {e}", exc_info=True)
            return {
                "strengths": [],
                "weaknesses": [],
                "recommendations": ["Continue working hard and seek help when needed."],
                "motivational_message": "Keep up the good work!",
                "next_steps": ["Review weak areas", "Practice regularly"]
            }
    
    # ==================== CAREER RECOMMENDATIONS ====================
    
    async def generate_study_recommendations(
        self,
        grades: Dict[str, str],
        strong_subjects: List[str],
        weak_subjects: List[str],
        overall_gpa: float,
        trend_analysis: Optional[Dict[str, str]] = None
    ) -> List[str]:
        """Generate personalized study recommendations based on academic performance."""
        if not self.client_available:
            # Fallback recommendations
            recs = []
            if weak_subjects:
                recs.append(f"Focus on improving {', '.join(weak_subjects[:2])} - these subjects need more attention")
            if strong_subjects:
                recs.append(f"Maintain your excellent performance in {', '.join(strong_subjects[:2])}")
            return recs if recs else ["Keep up the good work! Consistent study habits lead to success."]
        
        # Build comprehensive prompt for Gemini
        prompt = f"""As an educational advisor for Kenyan high school students, analyze this student's academic report and provide 5 specific, actionable study recommendations.

**Academic Performance:**
Overall GPA: {overall_gpa:.2f}/4.0

**Subject Grades:**
{json.dumps(grades, indent=2)}

**Strong Subjects:** {', '.join(strong_subjects) if strong_subjects else 'None identified'}
**Weak Subjects:** {', '.join(weak_subjects) if weak_subjects else 'None identified'}

{f"**Performance Trends:**\n" + json.dumps(trend_analysis, indent=2) if trend_analysis else ""}

**Instructions:**
1. Provide 5 specific, actionable recommendations
2. Focus on study strategies, time management, and improvement areas
3. Be encouraging but realistic
4. Consider the Kenyan education system (8-4-4 or CBC)
5. Each recommendation should be a single sentence (max 120 characters)
6. Return ONLY a JSON array of strings, no other text

Example format:
["Allocate 2 extra hours weekly to Mathematics practice problems", "Create flashcards for Chemistry formulas and review daily", "Join a study group for History to improve comprehension"]

Return your response as a JSON array:"""

        try:
            response_text = await self._call_gemini(prompt)
            
            # Clean response
            response_text = response_text.strip()
            if response_text.startswith('```'):
                # Remove markdown code blocks
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            # Parse JSON
            recommendations = json.loads(response_text)
            
            # Validate
            if isinstance(recommendations, list) and all(isinstance(r, str) for r in recommendations):
                return recommendations[:5]  # Return max 5
            else:
                raise ValueError("Invalid response format")
                
        except Exception as e:
            logger.error(f"Error generating AI recommendations: {e}")
            # Fallback recommendations
            recs = []
            if weak_subjects:
                recs.append(f"Dedicate extra study time to {weak_subjects[0]} - create a daily practice schedule")
                if len(weak_subjects) > 1:
                    recs.append(f"Seek help from a tutor or study group for {weak_subjects[1]}")
            if strong_subjects:
                recs.append(f"Use your strength in {strong_subjects[0]} to build confidence in other subjects")
            if overall_gpa < 2.5:
                recs.append("Set specific, measurable goals for each subject and track your progress weekly")
            elif overall_gpa < 3.5:
                recs.append("Focus on consistency - review notes daily and complete all homework assignments")
            else:
                recs.append("Challenge yourself with advanced materials to maintain your excellence")
            
            recs.append("Balance study time with adequate rest - aim for 7-8 hours of sleep nightly")
            
            return recs[:5]
    
    async def generate_career_recommendations(
        self,
        subjects: List[str],
        grades: Dict[str, str],
        interests: Optional[List[str]] = None,
        grade_level: int = 10
    ) -> List[Dict[str, Any]]:
        """Generate career recommendations based on subjects and grades."""
        # Create compact grades summary
        grades_summary = ", ".join([f"{s}:{grades.get(s, 'N/A')}" for s in subjects[:6]])
        interests_str = f" Interests: {', '.join(interests[:3])}" if interests else ""
        
        prompt = f"""Suggest 3 careers for a Kenyan Grade {grade_level} student. Grades: {grades_summary}.{interests_str}

Return JSON array with 3 careers. Each career has: career_path, career_description (1 sentence), suitable_universities (2 names), match_score (0-100), reasoning (1 sentence).

Example format:
[{{"career_path":"Engineer","career_description":"Designs systems","suitable_universities":["UoN","JKUAT"],"match_score":85,"reasoning":"Strong math skills"}}]

Return ONLY the JSON array, no other text:"""

        try:
            response = await self.generate(prompt, json_mode=True)
            
            # Clean response - remove markdown code blocks and extra whitespace
            import re
            cleaned_response = response.strip()
            
            # Remove markdown code blocks (```json ... ``` or ``` ... ```)
            cleaned_response = re.sub(r'^```(?:json)?\s*\n?', '', cleaned_response)
            cleaned_response = re.sub(r'\n?```\s*$', '', cleaned_response)
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON response
            data = None
            parse_error = None
            
            # Try direct parsing first
            try:
                data = json.loads(cleaned_response)
            except json.JSONDecodeError:
                # Try to find JSON array using bracket matching
                if cleaned_response.strip().startswith('['):
                    bracket_count = 0
                    end_pos = 0
                    in_string = False
                    escape_next = False
                    
                    for i, char in enumerate(cleaned_response):
                        if escape_next:
                            escape_next = False
                            continue
                        if char == '\\' and in_string:
                            escape_next = True
                            continue
                        if char == '"' and not escape_next:
                            in_string = not in_string
                            continue
                        if in_string:
                            continue
                        if char == '[':
                            bracket_count += 1
                        elif char == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                end_pos = i + 1
                                break
                    
                    if end_pos > 0:
                        try:
                            data = json.loads(cleaned_response[:end_pos])
                        except json.JSONDecodeError:
                            pass
                
                # Fallback: try regex extraction
                if data is None:
                    json_match = re.search(r'\[[\s\S]*?\](?=\s*$)', cleaned_response)
                    if json_match:
                        try:
                            data = json.loads(json_match.group())
                        except json.JSONDecodeError:
                            pass
            
            # If still no data, use empty list (fallback will handle it)
            if data is None:
                data = []

            if isinstance(data, list):
                parsed = data
            elif isinstance(data, dict) and "recommendations" in data:
                parsed = data.get("recommendations", [])
            else:
                parsed = []

            # Normalize and validate recommendations
            normalized: List[Dict[str, Any]] = []
            for item in parsed[:5]:
                if isinstance(item, dict):
                    normalized.append({
                        "career_path": item.get("career_path", item.get("career", "Career Path")),
                        "career_description": item.get("career_description", item.get("description", "Professional career option")),
                        "suitable_universities": item.get("suitable_universities", item.get("universities", ["University of Nairobi"])),
                        "course_requirements": item.get("course_requirements", {}),
                        "match_score": float(item.get("match_score", 75)),
                        "reasoning": item.get("reasoning", "Based on academic performance"),
                        "job_market_outlook": item.get("job_market_outlook", "Good employment opportunities in Kenya")
                    })

            # Ensure we have at least some recommendations
            if not normalized:
                # Fallback recommendations
                normalized = [
                    {
                        "career_path": "Software Developer",
                        "career_description": "Create computer programs and applications",
                        "suitable_universities": ["University of Nairobi", "Jomo Kenyatta University"],
                        "course_requirements": {"Mathematics": "B", "English": "C+"},
                        "match_score": 85.0,
                        "reasoning": "Strong performance in Mathematics and logical subjects",
                        "job_market_outlook": "High demand in Kenya's growing tech sector"
                    },
                    {
                        "career_path": "Medical Doctor",
                        "career_description": "Provide healthcare and treat patients",
                        "suitable_universities": ["University of Nairobi", "Moi University"],
                        "course_requirements": {"Biology": "B", "Chemistry": "B", "Mathematics": "C+"},
                        "match_score": 80.0,
                        "reasoning": "Good performance in science subjects",
                        "job_market_outlook": "Stable demand for healthcare professionals"
                    }
                ]

            return normalized[:5]
        except Exception as e:
            logger.error(f"Career recommendation error: {e}")
            # Enhanced fallback based on subjects
            fallback_careers = {
                "Mathematics": {
                    "career_path": "Data Analyst",
                    "career_description": "Analyze data to help businesses make decisions",
                    "suitable_universities": ["University of Nairobi", "Strathmore University"],
                    "course_requirements": {"Mathematics": "B"},
                    "match_score": 82.0,
                    "reasoning": "Excellent mathematical skills",
                    "job_market_outlook": "Growing field in Kenya"
                },
                "English": {
                    "career_path": "Journalist",
                    "career_description": "Research and write news stories",
                    "suitable_universities": ["University of Nairobi", "Daystar University"],
                    "course_requirements": {"English": "B"},
                    "match_score": 78.0,
                    "reasoning": "Strong communication skills",
                    "job_market_outlook": "Opportunities in media and communications"
                },
                "Biology": {
                    "career_path": "Biotechnologist",
                    "career_description": "Work with biological systems and research",
                    "suitable_universities": ["Jomo Kenyatta University", "Kenyatta University"],
                    "course_requirements": {"Biology": "B", "Chemistry": "C+"},
                    "match_score": 80.0,
                    "reasoning": "Interest in biological sciences",
                    "job_market_outlook": "Growing biotechnology sector"
                },
                "Chemistry": {
                    "career_path": "Pharmacist",
                    "career_description": "Prepare and dispense medications",
                    "suitable_universities": ["University of Nairobi", "Kenyatta University"],
                    "course_requirements": {"Chemistry": "B", "Biology": "C+"},
                    "match_score": 79.0,
                    "reasoning": "Strong foundation in chemistry",
                    "job_market_outlook": "Essential healthcare role"
                },
                "Physics": {
                    "career_path": "Electrical Engineer",
                    "career_description": "Design electrical systems and equipment",
                    "suitable_universities": ["University of Nairobi", "Jomo Kenyatta University"],
                    "course_requirements": {"Physics": "B", "Mathematics": "B"},
                    "match_score": 81.0,
                    "reasoning": "Good understanding of physical principles",
                    "job_market_outlook": "Strong demand in engineering"
                }
            }

            suggestions = []
            # Sort subjects by grade performance
            sorted_subjects = sorted(subjects, key=lambda s: self._grade_to_score(grades.get(s, "E")), reverse=True)

            for subject in sorted_subjects[:5]:
                if subject in fallback_careers:
                    suggestions.append(fallback_careers[subject])

            # Fill remaining slots with general careers
            general_careers = [
                {
                    "career_path": "Business Administrator",
                    "career_description": "Manage business operations and teams",
                    "suitable_universities": ["Strathmore University", "United States International University"],
                    "course_requirements": {"English": "C+", "Mathematics": "C"},
                    "match_score": 75.0,
                    "reasoning": "Good academic foundation for business studies",
                    "job_market_outlook": "Many opportunities in business sector"
                },
                {
                    "career_path": "Teacher",
                    "career_description": "Educate and mentor students",
                    "suitable_universities": ["Kenyatta University", "Mount Kenya University"],
                    "course_requirements": {"English": "C+", "subject_of_interest": "C"},
                    "match_score": 76.0,
                    "reasoning": "Interest in sharing knowledge",
                    "job_market_outlook": "Stable employment in education"
                }
            ]

            while len(suggestions) < 5:
                for career in general_careers:
                    if career not in suggestions:
                        suggestions.append(career)
                        break

            return suggestions[:5]

    def _grade_to_score(self, grade: str) -> int:
        """Convert grade to numeric score for sorting."""
        grade_scores = {"A": 12, "A-": 11, "B+": 10, "B": 9, "B-": 8, "C+": 7, "C": 6, "C-": 5, "D+": 4, "D": 3, "E": 1}
        return grade_scores.get(grade, 1)
    
    # ==================== STUDY PLAN GENERATION ====================
    
    async def generate_study_plan(
        self,
        weak_subjects: List[str],
        available_hours: float,
        exam_date: Optional[datetime] = None,
        grade_level: int = 10,
        focus_areas: Optional[Dict[str, List[str]]] = None
    ) -> Dict[str, Any]:
        """Generate personalized study plan."""
        if exam_date:
            # Normalize both datetimes to UTC-aware for comparison
            now = datetime.now(timezone.utc)
            # If exam_date is naive, assume it's UTC; if aware, keep as is
            if exam_date.tzinfo is None:
                exam_date_utc = exam_date.replace(tzinfo=timezone.utc)
            else:
                exam_date_utc = exam_date.astimezone(timezone.utc)
            days_until_exam = (exam_date_utc - now).days
        else:
            days_until_exam = 90
        
        # Build focus areas section for prompt
        focus_areas_text = ""
        if focus_areas and len(focus_areas) > 0:
            focus_areas_list = []
            for subject, topics in focus_areas.items():
                if topics and len(topics) > 0:
                    topics_str = ", ".join(topics)
                    focus_areas_list.append(f"{subject}: {topics_str}")
            if focus_areas_list:
                focus_areas_text = f"\n\nSpecific Focus Areas Requested by Student:\n" + "\n".join(f"- {item}" for item in focus_areas_list)
                focus_areas_text += "\n\nIMPORTANT: The study plan MUST prioritize and include these specific topics. Allocate more time to these focus areas in the weekly schedule."
        
        prompt = f"""Create a detailed weekly study plan for a Grade {grade_level} Kenyan student.

Subjects to Study: {', '.join(weak_subjects)}
Available Hours per Day: {available_hours}
Days until Exam: {days_until_exam}{focus_areas_text}

Provide a study plan in JSON format:
{{
  "weekly_schedule": [
    {{
      "day": "Monday",
      "subjects": [
        {{"subject": "Mathematics", "duration_minutes": 60, "focus": "Calculus - Derivatives and Limits", "priority": 8}}
      ]
    }},
    ...
  ],
  "focus_areas": {{
    "Mathematics": "Specific focus areas for Mathematics (e.g., Calculus, Algebra, Geometry)"
  }},
  "strategies": {{
    "Mathematics": "Detailed study strategy focusing on the requested topics (e.g., Calculus). Include specific techniques, practice methods, and review schedules."
  }},
  "recommendations": ["tip1", "tip2", ...]
}}

CRITICAL REQUIREMENTS:
1. If specific focus areas are provided, you MUST prioritize and explicitly mention those topics in:
   - The "focus_areas" field for that subject
   - The "strategies" field for that subject  
   - The "focus" field in weekly_schedule entries for that subject

2. For focus_areas field: 
   - If user specified topics (e.g., "Calculus, Derivatives"), your focus_areas should expand on these
   - Example: If user says "Calculus, Derivatives", your focus_areas["Mathematics"] should be something like:
     "Calculus (Derivatives, Limits, Applications), Algebra fundamentals, Problem-solving techniques"
   - DO NOT use generic phrases like "Core concepts and fundamentals" - be SPECIFIC

3. For strategies field:
   - Must explicitly mention the requested focus topics
   - Provide specific study techniques for those topics
   - Example: "Focus on mastering Calculus derivatives through daily practice problems. Start with basic derivative rules, then progress to chain rule and product rule. Use visual aids to understand limits and continuity concepts."

4. For weekly_schedule:
   - Each subject entry should have a "focus" field that mentions the specific topics
   - Example: "Calculus - Derivatives and Chain Rule" or "Algebra - Quadratic Equations and Factoring"

5. Allocate more time to weaker subjects
6. Distribute study time across the week for balanced learning
7. Ensure each subject gets adequate time based on priority
8. For the subject "Kiswahili", the ENTIRE content in the "focus_areas" field MUST be written in the Swahili language. This includes the explanations and descriptions. Do not mix English. Example: Instead of "Alphabet recognition", use "Kutambua herufi". Instead of "comprehension", use "Ufahamu". Ensure the whole sentence is in Swahili.

Example Response Format:
If Mathematics with focus on "Calculus, Derivatives" is requested:
{{
  "focus_areas": {{
    "Mathematics": "Calculus (Derivatives, Limits, Continuity), Advanced Algebra, Problem-solving strategies"
  }},
  "strategies": {{
    "Mathematics": "Master Calculus derivatives through systematic practice. Day 1-2: Basic derivative rules (power, product, quotient). Day 3-4: Chain rule and composite functions. Day 5-6: Applications of derivatives (optimization, related rates). Review limits and continuity weekly. Practice 10-15 derivative problems daily."
  }},
  "weekly_schedule": [
    {{
      "day": "Monday",
      "subjects": [
        {{"subject": "Mathematics", "duration_minutes": 90, "focus": "Calculus - Basic Derivative Rules", "priority": 8}}
      ]
    }}
  ]
}}"""
        
        import logging
        logger = logging.getLogger(__name__)
        
        # Log the request details
        logger.info(f"Generating study plan for subjects: {weak_subjects}, focus_areas: {focus_areas}")
        
        try:
            response = await self.generate(prompt, json_mode=True)
            if not response:
                logger.warning("Empty response from LLM, using fallback")
                raise ValueError("Empty response from LLM")
            
            # Log raw response for debugging (first 500 chars)
            logger.debug(f"LLM raw response (first 500 chars): {response[:500]}")
            
            parsed_response = json.loads(response)
            if not isinstance(parsed_response, dict):
                logger.warning(f"Invalid response format from LLM: {type(parsed_response)}")
                raise ValueError("Invalid response format from LLM")
            
            # Validate that we got AI-generated content, not just empty structures
            has_weekly_schedule = bool(parsed_response.get("weekly_schedule"))
            has_focus_areas = bool(parsed_response.get("focus_areas"))
            has_strategies = bool(parsed_response.get("strategies"))

            logger.info(f"LLM response validation - weekly_schedule: {has_weekly_schedule}, focus_areas: {has_focus_areas}, strategies: {has_strategies}")

            # If we have focus_areas from user, ensure LLM addressed them
            if focus_areas and has_focus_areas:
                for subject, topics in focus_areas.items():
                    llm_focus = parsed_response.get("focus_areas", {}).get(subject, "")
                    if topics and subject in parsed_response.get("focus_areas", {}):
                        logger.info(f"LLM generated focus_areas for {subject}: {llm_focus[:100]}")
                    else:
                        logger.warning(f"LLM did not generate focus_areas for {subject} with requested topics: {topics}")

            return parsed_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Study plan JSON decode error: {e}")
            logger.error(f"Response (first 500 chars): {response[:500] if 'response' in locals() else 'No response'}")
            
            # Try to extract JSON from the response if it's wrapped in markdown
            if 'response' in locals() and response:
                try:
                    import re
                    # Try to find JSON object or array
                    json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', response)
                    if json_match:
                        parsed_response = json.loads(json_match.group())
                        logger.info("Successfully extracted JSON from markdown-wrapped response")
                        return parsed_response
                except Exception as extract_error:
                    logger.error(f"Failed to extract JSON from response: {extract_error}")
            
            # Only use fallback if we truly can't parse the response
            logger.warning("Using fallback response due to JSON decode error")
            raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}")
            
        except Exception as e:
            logger.error(f"Study plan generation error: {e}", exc_info=True)
            # Re-raise to let the service layer handle it
            raise
    
    # ==================== LEARNING STRATEGIES ====================
    
    async def generate_learning_strategy(
        self,
        subject: str,
        topic: str,
        grade_level: int,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """Generate learning strategy for a specific topic."""
        prompt = f"""Create a comprehensive learning strategy for a Grade {grade_level} student struggling with {topic} in {subject}.

Difficulty Level: {difficulty}

Provide in JSON format:
{{
  "explanation": "Clear explanation of the topic",
  "examples": ["example1", "example2", ...],
  "common_misconceptions": ["misconception1", ...],
  "practice_problems": ["problem1", ...],
  "resources": ["resource1", ...],
  "study_tips": ["tip1", "tip2", ...]
}}

Make it age-appropriate and aligned with Kenyan curriculum."""
        
        try:
            response = await self.generate(prompt, json_mode=True)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Learning strategy error: {e}")
            return {
                "explanation": f"Study {topic} in {subject} regularly.",
                "examples": [],
                "common_misconceptions": [],
                "practice_problems": [],
                "resources": [],
                "study_tips": ["Practice regularly", "Ask for help when needed"]
            }
    
    # ==================== ANSWER EVALUATION ====================
    
    async def evaluate_answer(
        self,
        question: str,
        correct_answer: str,
        student_answer: str,
        subject: str
    ) -> Dict[str, Any]:
        """Evaluate student's answer and provide feedback."""
        prompt = f"""Evaluate a student's answer to a question in {subject}.

Question: {question}
Correct Answer: {correct_answer}
Student's Answer: {student_answer}

Provide evaluation in JSON format:
{{
  "correct": true/false,
  "score": 0.0-1.0,
  "feedback": "Detailed feedback on the answer",
  "suggestions": ["suggestion1", "suggestion2", ...],
  "key_points": ["point1", "point2", ...]
}}

Be encouraging and constructive. Highlight what the student got right and what needs improvement."""
        
        try:
            response = await self.generate(prompt, json_mode=True)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Answer evaluation error: {e}")
            # Simple keyword-based fallback
            is_correct = student_answer.lower() in correct_answer.lower() or correct_answer.lower() in student_answer.lower()
            return {
                "correct": is_correct,
                "score": 0.5 if is_correct else 0.0,
                "feedback": "Review the correct answer and try again.",
                "suggestions": ["Study the topic more", "Practice similar questions"],
                "key_points": []
            }
    
    # ==================== PERFORMANCE ANALYSIS ====================
    
    async def analyze_performance_trends(
        self,
        grade_history: Dict[str, List[float]],
        subjects: List[str]
    ) -> Dict[str, Any]:
        """Analyze performance trends and predict future grades."""
        prompt = f"""Analyze academic performance trends for a Kenyan high school student.

Grade History (numeric values 0-12):
{json.dumps(grade_history, indent=2)}

Subjects: {', '.join(subjects)}

Provide analysis in JSON format:
{{
  "trends": {{
    "subject": {{
      "trend": "improving|declining|stable",
      "predicted_next": 8.5,
      "confidence": 0.85,
      "factors": ["factor1", "factor2"]
    }}
  }},
  "overall_assessment": "Overall performance assessment",
  "interventions": ["intervention1", "intervention2", ...]
}}"""
        
        try:
            response = await self.generate(prompt, json_mode=True)
            return json.loads(response)
        except Exception as e:
            logger.error(f"Performance analysis error: {e}")
            return {
                "trends": {},
                "overall_assessment": "Continue monitoring performance.",
                "interventions": []
            }


# Global LLM service instance
llm_service = LLMService()
