#!/usr/bin/env python3
"""
Check Plan 5 (Physics) progress and sessions
"""

from database import engine
from sqlalchemy import text

def check_plan5():
    print('Checking Physics plan (Plan 5) sessions...')
    try:
        with engine.connect() as conn:
            # Check Plan 5 specifically
            result = conn.execute(text("""
                SELECT sp.plan_id, sp.subject, sp.start_date, sp.end_date,
                       sp.daily_duration_minutes,
                       COUNT(s.session_id) as session_count,
                       COALESCE(SUM(s.duration_minutes), 0) as total_minutes_logged
                FROM study_plans sp
                LEFT JOIN study_sessions s ON sp.plan_id = s.plan_id
                WHERE sp.plan_id = 5
                GROUP BY sp.plan_id, sp.subject, sp.start_date, sp.end_date, sp.daily_duration_minutes
            """))

            plan = result.fetchone()

            if plan:
                plan_id, subject, start_date, end_date, daily_minutes, session_count, total_minutes = plan

                if start_date and end_date and daily_minutes:
                    days_diff = (end_date - start_date).days + 1
                    planned_hours = (days_diff * daily_minutes) / 60
                    actual_hours = total_minutes / 60

                    if planned_hours > 0:
                        progress = min(100.0, (actual_hours / planned_hours) * 100)
                    else:
                        progress = 0.0

                    print(f'Plan {plan_id} ({subject}):')
                    print(f'  Duration: {days_diff} days, {daily_minutes}min/day = {planned_hours:.1f}h planned')
                    print(f'  Sessions: {session_count}, Total time: {total_minutes}min = {actual_hours:.1f}h logged')
                    print(f'  Progress: {progress:.1f}%')

                    if actual_hours >= 16 and progress == 0:
                        print('  ERROR: Should show progress but shows 0%!')
                    elif actual_hours > 0 and progress > 0:
                        print('  Progress calculation working correctly')
                    elif actual_hours == 0:
                        print('  No sessions logged yet')

            # Check all sessions for Plan 5
            result = conn.execute(text("""
                SELECT session_id, duration_minutes, date, completed
                FROM study_sessions
                WHERE plan_id = 5
                ORDER BY date DESC
            """))

            sessions = result.fetchall()

            if sessions:
                print(f'\nSessions for Plan 5:')
                for session in sessions:
                    session_id, duration, date, completed = session
                    hours = duration / 60
                    print(f'  Session {session_id}: {duration}min ({hours:.1f}h), {date}, completed={completed}')
            else:
                print('\nNo sessions found for Plan 5')

    except Exception as e:
        print('Error:', e)

if __name__ == "__main__":
    check_plan5()
