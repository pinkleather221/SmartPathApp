import asyncio
import os
import sys
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Add parent directory to path to import auth
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env vars
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@smartpath.app")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminSecret123!") # Change this in production!
ADMIN_NAME = "System Administrator"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def seed_admin():
    """Create a default admin user if not exists."""
    from auth import get_password_hash
    
    print(f"Checking for admin user: {ADMIN_EMAIL}...")
    
    # Check if admin exists
    try:
        response = supabase.table('users').select('*').eq('email', ADMIN_EMAIL).execute()
        existing_user = response.data[0] if response.data else None
        
        if existing_user:
            print("Admin user already exists.")
            # Optional: Update password/role if needed
            # supabase.table('users').update({...}).eq('user_id', existing_user['user_id']).execute()
            return

        print("Creating admin user...")
        password_hash = get_password_hash(ADMIN_PASSWORD)
        
        # Explicitly remove ID if present in schema to let DB auto-increment
        user_data = {
            "email": ADMIN_EMAIL,
            "password_hash": password_hash,
            "full_name": ADMIN_NAME,
            "user_type": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            # If your DB schema has NOT NULL constraints on these, provide defaults:
            "grade_level": 12, 
            "curriculum_type": "kcse"
        }
        
        # Using upsert instead of insert to handle conflicts more gracefully if partial record exists
        # Or just insert but ensure email is unique
        supabase.table('users').insert(user_data).execute()
        print(f"Success! Admin user created.")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print("IMPORTANT: Change this password immediately after login!")
        
    except Exception as e:
        print(f"Error seeding admin: {e}")

if __name__ == "__main__":
    asyncio.run(seed_admin())
