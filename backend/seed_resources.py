"""
Seed script to populate the resources table with educational content.
Run: python seed_resources.py
"""
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import supabase
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CBE Subjects for Grades 7-12
CBE_SUBJECTS = [
    "Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies",
    "Physics", "Chemistry", "Biology", "History", "Geography", "CRE", "IRE",
    "Business Studies", "Agriculture", "Computer Science", "Home Science",
    "French", "German", "Arabic", "Mandarin", "Music", "Art & Design", "Physical Education"
]

# 8-4-4 Subjects for Forms 3-4
KCSE_SUBJECTS = [
    "Mathematics", "English", "Kiswahili", "Physics", "Chemistry", "Biology",
    "History", "Geography", "CRE", "IRE", "HRE", "Business Studies",
    "Agriculture", "Computer Studies", "Home Science", "French", "German",
    "Arabic", "Music", "Art & Design"
]

# Base educational resource URLs (external free resources)
RESOURCE_SOURCES = {
    "pdf": {
        "base_urls": [
            "https://www.kicd.ac.ke/curriculum-resources/",
            "https://elimu.ng/resources/",
        ],
        "description_template": "Comprehensive {subject} study notes and past papers for {grade_label}. Aligned with Kenya {curriculum} curriculum."
    },
    "video": {
        "base_urls": [
            "https://www.youtube.com/watch?v=",
            "https://www.khanacademy.org/",
        ],
        "description_template": "Video lessons covering key {subject} topics for {grade_label}. Visual explanations and worked examples."
    },
    "note": {
        "base_urls": [
            "https://www.elimu.ng/notes/",
        ],
        "description_template": "Detailed study notes for {subject} {grade_label}. Covers syllabus topics with examples and exercises."
    }
}

# Subject-specific YouTube video IDs (educational channels)
YOUTUBE_VIDEOS = {
    "Mathematics": ["3vjkMoANxgc", "pTnEG_WGd2Q", "Qy6h-yjQzuY"],
    "Physics": ["XQr4Xb-mDKE", "b1t41Q3xRM8", "PH5v2Lf-6ug"],
    "Chemistry": ["FSyAehMdpyI", "5DP3kDqOFx8", "QpBTM0IF19g"],
    "Biology": ["2T7cDY7YDsg", "8IlzKri08kk", "VrMsZ7--rTY"],
    "English": ["KMYrIi_Mt3A", "dVJOSPtEeTA"],
    "Kiswahili": ["Rq9ewQXNGNE", "0Qy5hQ5HKak"],
    "History": ["xuCn8ux2gbs", "XAVfeEpDhro"],
    "Geography": ["6Ra3_0lLNaI", "Y6Xbq71YCA4"],
}


def generate_resources():
    """Generate resources for all subjects and grades."""
    resources = []
    
    # CBE Resources (Grades 7-12)
    for grade in range(7, 13):
        grade_label = f"Grade {grade}"
        for subject in CBE_SUBJECTS:
            # Add PDF resource
            resources.append({
                "title": f"{subject} Study Guide - {grade_label}",
                "description": RESOURCE_SOURCES["pdf"]["description_template"].format(
                    subject=subject, grade_label=grade_label, curriculum="CBE"
                ),
                "subject": subject,
                "grade_level": grade,
                "type": "pdf",
                "tags": [subject.lower(), f"grade-{grade}", "cbe", "study-guide"],
                "content_url": f"https://www.kicd.ac.ke/curriculum/{subject.lower().replace(' ', '-')}/grade-{grade}/",
                "source": "KICD",
                "is_curated": True,
            })
            
            # Add Video resource
            video_id = YOUTUBE_VIDEOS.get(subject, ["dQw4w9WgXcQ"])[0]
            resources.append({
                "title": f"{subject} Video Lessons - {grade_label}",
                "description": RESOURCE_SOURCES["video"]["description_template"].format(
                    subject=subject, grade_label=grade_label
                ),
                "subject": subject,
                "grade_level": grade,
                "type": "video",
                "tags": [subject.lower(), f"grade-{grade}", "cbe", "video-lesson"],
                "content_url": f"https://www.youtube.com/watch?v={video_id}",
                "source": "YouTube",
                "is_curated": True,
            })
            
            # Add Note resource
            resources.append({
                "title": f"{subject} Revision Notes - {grade_label}",
                "description": RESOURCE_SOURCES["note"]["description_template"].format(
                    subject=subject, grade_label=grade_label
                ),
                "subject": subject,
                "grade_level": grade,
                "type": "note",
                "tags": [subject.lower(), f"grade-{grade}", "cbe", "revision-notes"],
                "content_url": f"https://elimu.ng/{subject.lower().replace(' ', '-')}/grade-{grade}/",
                "source": "Elimu NG",
                "is_curated": True,
            })
    
    # 8-4-4 Resources (Forms 3-4)
    for grade in [3, 4]:  # Form 3 and Form 4
        grade_label = f"Form {grade}"
        db_grade = grade  # Use 3 and 4 directly (matching frontend filter values)
        
        for subject in KCSE_SUBJECTS:
            # Add PDF resource
            resources.append({
                "title": f"{subject} KCSE Revision - {grade_label}",
                "description": f"KCSE {subject} revision materials for {grade_label}. Past papers and marking schemes included.",
                "subject": subject,
                "grade_level": db_grade,
                "type": "pdf",
                "tags": [subject.lower(), f"form-{grade}", "kcse", "8-4-4", "revision"],
                "content_url": f"https://www.kcse.online/{subject.lower().replace(' ', '-')}/form-{grade}/",
                "source": "KCSE Online",
                "is_curated": True,
            })
            
            # Add Video resource
            video_id = YOUTUBE_VIDEOS.get(subject, ["dQw4w9WgXcQ"])[0]
            resources.append({
                "title": f"{subject} KCSE Video Tutorials - {grade_label}",
                "description": f"Video tutorials covering {subject} KCSE syllabus for {grade_label}. Step-by-step explanations.",
                "subject": subject,
                "grade_level": db_grade,
                "type": "video",
                "tags": [subject.lower(), f"form-{grade}", "kcse", "8-4-4", "tutorial"],
                "content_url": f"https://www.youtube.com/watch?v={video_id}",
                "source": "YouTube",
                "is_curated": True,
            })
    
    return resources


def seed_resources():
    """Insert resources into the database."""
    resources = generate_resources()
    
    logger.info(f"Generated {len(resources)} resources to seed")
    
    # Check if resources already exist
    existing = supabase.table('resources').select('resource_id', count='exact').execute()
    if existing.count and existing.count > 0:
        logger.info(f"Found {existing.count} existing resources. Clearing...")
        # Delete existing resources to avoid duplicates
        supabase.table('resources').delete().neq('resource_id', 0).execute()
        logger.info("Cleared existing resources")
    
    # Insert in batches of 50
    batch_size = 50
    inserted = 0
    
    for i in range(0, len(resources), batch_size):
        batch = resources[i:i + batch_size]
        for res in batch:
            res["created_at"] = datetime.utcnow().isoformat()
        
        try:
            result = supabase.table('resources').insert(batch).execute()
            inserted += len(result.data) if result.data else 0
            logger.info(f"Inserted batch {i // batch_size + 1}: {len(batch)} resources")
        except Exception as e:
            logger.error(f"Error inserting batch: {e}")
    
    logger.info(f"Successfully seeded {inserted} resources")
    return inserted


if __name__ == "__main__":
    print("=" * 50)
    print("SmartPath Resource Seeder")
    print("=" * 50)
    print(f"\nThis will populate the database with educational resources for:")
    print(f"  - CBE: {len(CBE_SUBJECTS)} subjects x 6 grades x 3 types = {len(CBE_SUBJECTS) * 6 * 3} resources")
    print(f"  - 8-4-4: {len(KCSE_SUBJECTS)} subjects x 2 forms x 2 types = {len(KCSE_SUBJECTS) * 2 * 2} resources")
    print(f"  - Total: {len(CBE_SUBJECTS) * 6 * 3 + len(KCSE_SUBJECTS) * 2 * 2} resources\n")
    
    confirm = input("Proceed? (y/n): ")
    if confirm.lower() == 'y':
        count = seed_resources()
        print(f"\nDone! Seeded {count} educational resources.")
    else:
        print("Cancelled.")
