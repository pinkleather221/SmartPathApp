# SmartPath Educational Platform
## Complete System Flow and Features Documentation

---

## 1. System Overview

### 1.1 Purpose of the System

SmartPath is an AI-powered educational platform specifically designed for Kenyan students, teachers, and parents. The system addresses the critical need for personalized learning support, academic performance tracking, and career guidance within the context of Kenya's Competency-Based Curriculum (CBC) and 8-4-4 educational systems.

The platform serves as a comprehensive academic companion that:
- Digitizes and analyzes paper-based academic reports using OCR technology
- Generates personalized study materials and learning plans
- Provides AI-powered tutoring and academic support
- Delivers data-driven career recommendations based on academic performance
- Enables collaboration between students, teachers, and parents

### 1.2 Core Problem Addressed

Kenyan students face several educational challenges that SmartPath aims to solve:

1. **Fragmented Academic Records**: Paper-based report cards make tracking academic progress difficult. Parents often lack visibility into their children's performance trends.

2. **Limited Access to Personalized Learning**: Students have varying needs, but traditional classroom settings cannot provide individualized attention to each learner.

3. **Career Guidance Gap**: Many students complete secondary education without adequate exposure to career options aligned with their academic strengths and interests.

4. **Resource Accessibility**: Quality educational resources and tutoring support are often expensive and geographically limited.

SmartPath addresses these problems by providing:
- Automated digitization of academic records with trend analysis
- AI-generated personalized flashcards, study plans, and learning strategies
- Data-driven career recommendations with university and course matching
- 24/7 access to an AI tutor for academic support

### 1.3 High-Level System Architecture

The SmartPath platform consists of three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTPATH ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐  │
│   │   FRONTEND  │────▶│   BACKEND    │────▶│   DATABASE      │  │
│   │ React/TS    │     │   FastAPI    │     │   PostgreSQL    │  │
│   │ shadcn/ui   │◀────│   Python     │◀────│   Supabase      │  │
│   │ Vite        │     │              │     │                 │  │
│   └─────────────┘     └──────┬───────┘     └─────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │   AI SERVICES    │                         │
│                    │  Google Gemini   │                         │
│                    │  (OCR, LLM)      │                         │
│                    └──────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend Layer**: React-based single-page application with TypeScript for type safety, shadcn/ui for consistent design components, and Vite for fast development builds.

**Backend Layer**: FastAPI Python server handling authentication, business logic, data processing, and AI service orchestration.

**Database Layer**: PostgreSQL database (hosted on Supabase) storing user accounts, academic records, generated content, and relationship data.

**AI Services Layer**: Google Gemini integration providing OCR capabilities, content generation, and conversational AI tutoring.

---

## 2. Full System Flow

### 2.1 Application Initialization

```
┌─────────────────────────────────────────────────────────────────┐
│                  APPLICATION STARTUP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Backend Initialization:                                         │
│  ├─▶ Load environment configuration (.env)                      │
│  ├─▶ Initialize database connection pool                        │
│  ├─▶ Configure CORS middleware with allowed origins             │
│  ├─▶ Set up security headers middleware                         │
│  ├─▶ Initialize Google Gemini AI client                         │
│  ├─▶ Mount static file directory for uploads                    │
│  └─▶ Start uvicorn server on port 8000                          │
│                                                                  │
│  Frontend Initialization:                                        │
│  ├─▶ Load React application bundle                              │
│  ├─▶ Initialize React Router for navigation                     │
│  ├─▶ Set up authentication context (token check)                │
│  ├─▶ Initialize React Query for server state                    │
│  ├─▶ Apply theme (light/dark mode from localStorage)            │
│  └─▶ Redirect to login or dashboard based on auth state         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Registration:                                                   │
│  ┌──────────────┐                                               │
│  │ User submits │                                               │
│  │ registration │                                               │
│  │ form         │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐     ┌─────────────────┐                   │
│  │ POST /auth/      │────▶│ Validate data   │                   │
│  │ register         │     │ (Pydantic)      │                   │
│  └──────────────────┘     └────────┬────────┘                   │
│                                    │                             │
│         ┌──────────────────────────┴───────────────────┐        │
│         ▼                                              ▼        │
│  ┌──────────────┐                              ┌────────────┐   │
│  │ Email exists │                              │ Hash pass, │   │
│  │ Return error │                              │ Create user│   │
│  └──────────────┘                              └──────┬─────┘   │
│                                                       │          │
│                                                       ▼          │
│                                               ┌────────────────┐ │
│                                               │ Generate JWT   │ │
│                                               │ Return token   │ │
│                                               └────────────────┘ │
│                                                                  │
│  Login:                                                          │
│  ┌──────────────┐     ┌────────────────┐     ┌────────────────┐ │
│  │ POST /auth/  │────▶│ Verify email & │────▶│ Generate JWT   │ │
│  │ login        │     │ password       │     │ (7-day expiry) │ │
│  └──────────────┘     └────────────────┘     └────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Report Upload and OCR Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              REPORT UPLOAD AND OCR FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: File Upload                                             │
│  ┌────────────────┐                                             │
│  │ User selects   │                                             │
│  │ report image   │                                             │
│  │ or PDF         │                                             │
│  └───────┬────────┘                                             │
│          │                                                       │
│          ▼                                                       │
│  Step 2: Server Processing                                       │
│  ┌────────────────────────────────────────────────────┐         │
│  │ POST /api/v1/reports/upload                        │         │
│  │ ├─▶ Validate file type (image/PDF)                 │         │
│  │ ├─▶ Save file to uploads directory                 │         │
│  │ └─▶ Initiate OCR processing                        │         │
│  └───────────────────────────┬────────────────────────┘         │
│                              │                                   │
│                              ▼                                   │
│  Step 3: Gemini OCR Extraction                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │ LLM Service:                                       │         │
│  │ ├─▶ Send image to Gemini Vision API               │         │
│  │ ├─▶ Prompt: Extract subject names and grades      │         │
│  │ ├─▶ Parse JSON response                           │         │
│  │ └─▶ Validate grade formats (A, B+, C, etc.)       │         │
│  └───────────────────────────┬────────────────────────┘         │
│                              │                                   │
│                              ▼                                   │
│  Step 4: Database Storage                                        │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Save to database:                                  │         │
│  │ ├─▶ academic_reports table (grades_json, term)     │         │
│  │ ├─▶ Update subject_performance records             │         │
│  │ └─▶ Calculate and store GPA                        │         │
│  └───────────────────────────┬────────────────────────┘         │
│                              │                                   │
│                              ▼                                   │
│  Step 5: Response                                                │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Return: Extracted grades, GPA, report_id           │         │
│  │ User can review and manually correct if needed     │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 AI Content Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│             AI CONTENT GENERATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Flashcard Generation:                                           │
│  ┌─────────────┐     ┌──────────────────────────────────────┐   │
│  │ User inputs │     │ POST /api/v1/flashcards/generate     │   │
│  │ - Subject   │────▶│ ├─▶ Build prompt with:               │   │
│  │ - Topic     │     │ │   - Subject, topic, grade level    │   │
│  │ - Count     │     │ │   - Curriculum type (CBC/8-4-4)    │   │
│  │ - Grade     │     │ │   - Request for Q&A pairs          │   │
│  └─────────────┘     │ ├─▶ Call Gemini LLM                  │   │
│                      │ ├─▶ Parse JSON response              │   │
│                      │ └─▶ Save flashcards to database      │   │
│                      └──────────────────────────────────────┘   │
│                                                                  │
│  Study Plan Generation:                                          │
│  ┌─────────────┐     ┌──────────────────────────────────────┐   │
│  │ User inputs │     │ POST /api/v1/study-plans/generate    │   │
│  │ - Subjects  │────▶│ ├─▶ Analyze user's weak subjects     │   │
│  │ - Hours/day │     │ ├─▶ Build scheduling prompt          │   │
│  │ - Exam date │     │ ├─▶ Call Gemini for strategy         │   │
│  │ - Priority  │     │ ├─▶ Generate weekly schedule         │   │
│  └─────────────┘     │ └─▶ Save plan with sessions         │   │
│                      └──────────────────────────────────────┘   │
│                                                                  │
│  Career Recommendation:                                          │
│  ┌─────────────┐     ┌──────────────────────────────────────┐   │
│  │ GET /career │     │ Career Service:                      │   │
│  │ /recommend  │────▶│ ├─▶ Fetch user's grade history       │   │
│  │ ?interests  │     │ ├─▶ Identify strong subjects         │   │
│  │             │     │ ├─▶ Build career matching prompt     │   │
│  └─────────────┘     │ ├─▶ Request Kenyan universities      │   │
│                      │ │   and course requirements          │   │
│                      │ └─▶ Return ranked recommendations    │   │
│                      └──────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 AI Tutor Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                AI TUTOR CHAT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ User sends      │                                            │
│  │ message with    │                                            │
│  │ optional context│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ POST /api/v1/ai-tutor/chat                        │          │
│  │ Body: { message, history[], subject?, grade? }    │          │
│  └───────────────────────────────────────────────────┘          │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ LLM Service - chat_with_tutor():                  │          │
│  │ ├─▶ Build system prompt:                          │          │
│  │ │   "You are a friendly Kenyan tutor helping      │          │
│  │ │    a Grade [X] student with [subject]..."       │          │
│  │ ├─▶ Include conversation history                  │          │
│  │ ├─▶ Set safety parameters                         │          │
│  │ └─▶ Call Gemini with full context                 │          │
│  └───────────────────────────────────────────────────┘          │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ Response Processing:                              │          │
│  │ ├─▶ Validate response is appropriate              │          │
│  │ ├─▶ Format for display (markdown support)         │          │
│  │ └─▶ Return to frontend for rendering              │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 Performance Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              PERFORMANCE DASHBOARD FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ User accesses    │                                           │
│  │ Dashboard page   │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ GET /api/v1/performance/dashboard                 │          │
│  └───────────────────────────────────────────────────┘          │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ Performance Service:                              │          │
│  │ ├─▶ Fetch all academic_reports for user           │          │
│  │ ├─▶ Query subject_performance records             │          │
│  │ ├─▶ Calculate overall GPA                         │          │
│  │ ├─▶ Identify strong subjects (A, A-, B+)          │          │
│  │ ├─▶ Identify weak subjects (C, D, E)              │          │
│  │ ├─▶ Analyze trends (improving/declining)          │          │
│  │ └─▶ Compile dashboard response                    │          │
│  └───────────────────────────────────────────────────┘          │
│           │                                                      │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────┐          │
│  │ Frontend Rendering:                               │          │
│  │ ├─▶ GPA display card                              │          │
│  │ ├─▶ Subject performance bar charts                │          │
│  │ ├─▶ Trend indicators (arrows up/down)             │          │
│  │ ├─▶ Recent reports list                           │          │
│  │ └─▶ Quick action buttons                          │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Interaction Flow

### 3.1 Student Role

Students are the primary users of SmartPath, with access to all learning and tracking features.

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Registration/Login:                                             │
│  ├─▶ Create account with email, password, full name             │
│  ├─▶ Select user type: "Student"                                │
│  ├─▶ Provide grade level (7-12) and curriculum (CBC/8-4-4)      │
│  └─▶ Receive JWT token, redirected to dashboard                 │
│                                                                  │
│  Dashboard View:                                                 │
│  ├─▶ Overall GPA and performance summary                        │
│  ├─▶ Subject-wise grade breakdown                               │
│  ├─▶ Improving and declining subjects highlighted               │
│  ├─▶ Quick links to recent reports and study plans              │
│  └─▶ AI-generated insights and recommendations                  │
│                                                                  │
│  Available Actions:                                              │
│  ├─▶ Upload academic reports (image/PDF)                        │
│  ├─▶ View and analyze report history                            │
│  ├─▶ Generate flashcards for any subject/topic                  │
│  ├─▶ Review flashcards with spaced repetition                   │
│  ├─▶ Create personalized study plans                            │
│  ├─▶ Log study sessions against plans                           │
│  ├─▶ Get AI-powered career recommendations                      │
│  ├─▶ Take career interest quizzes                               │
│  ├─▶ Chat with AI tutor for homework help                       │
│  ├─▶ Use math solver for problem solving                        │
│  ├─▶ Browse resource library                                    │
│  ├─▶ Redeem invite codes from teachers/parents                  │
│  └─▶ Update profile settings                                    │
│                                                                  │
│  Linking with Guardians:                                         │
│  ├─▶ Receive invite code from teacher or parent                 │
│  ├─▶ Enter code in Settings > Link Guardian                     │
│  └─▶ Guardian now has read access to student's data             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Student Capabilities:**
- Full control over personal academic data
- Access to all AI-powered learning tools
- Ability to link with multiple guardians (teachers, parents)
- Progress tracking and goal setting

### 3.2 Teacher Role

Teachers serve as guardians who can monitor linked students and provide academic guidance.

```
┌─────────────────────────────────────────────────────────────────┐
│                     TEACHER WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Registration/Login:                                             │
│  ├─▶ Create account with email, password, full name             │
│  ├─▶ Select user type: "Teacher"                                │
│  ├─▶ Provide school name (optional)                             │
│  └─▶ No grade level required                                    │
│                                                                  │
│  Dashboard View:                                                 │
│  ├─▶ List of linked students with summary cards                 │
│  ├─▶ Overall class performance analytics (if multiple students) │
│  ├─▶ Active invite codes with expiration                        │
│  └─▶ Quick actions for student management                       │
│                                                                  │
│  Available Actions:                                              │
│  ├─▶ Generate invite codes for students                         │
│  ├─▶ View linked students' dashboards                           │
│  ├─▶ Access student academic reports (read-only)                │
│  ├─▶ View student performance trends                            │
│  ├─▶ Create insights/feedback for individual students           │
│  ├─▶ Access student study plans and progress                    │
│  └─▶ Unlink students from guardian relationship                 │
│                                                                  │
│  Student Monitoring:                                             │
│  ├─▶ Click on student card to view detailed dashboard           │
│  ├─▶ See student's grades, trends, and study activity           │
│  ├─▶ Send motivational insights or academic tips                │
│  └─▶ Insights delivered to student's notifications              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Teacher-Specific Features:**
- Generate and manage multiple invite codes
- View aggregated performance across linked students
- Create custom insights delivered to students
- Read-only access to student academic data

### 3.3 Parent Role

Parents have similar monitoring capabilities to teachers, focused on their children's academic progress.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PARENT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Registration/Login:                                             │
│  ├─▶ Create account with email, password, full name             │
│  ├─▶ Select user type: "Parent"                                 │
│  └─▶ No grade level or curriculum required                      │
│                                                                  │
│  Dashboard View:                                                 │
│  ├─▶ Children linked to account with status cards               │
│  ├─▶ Recent academic updates from children                      │
│  ├─▶ Alerts for declining subjects or missed sessions           │
│  └─▶ Invite code management section                             │
│                                                                  │
│  Available Actions:                                              │
│  ├─▶ Generate invite codes for children                         │
│  ├─▶ View children's academic dashboards                        │
│  ├─▶ Access children's report cards and grades                  │
│  ├─▶ Monitor study plan progress                                │
│  ├─▶ See career recommendations for children                    │
│  ├─▶ Send encouragement insights to children                    │
│  └─▶ Manage linked child relationships                          │
│                                                                  │
│  System Response:                                                │
│  ├─▶ Read-only access (cannot modify student data)              │
│  ├─▶ Notifications when child uploads new report                │
│  └─▶ Summary emails (if configured)                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Administrator Role

Administrators manage the platform, including user accounts and curated resources.

```
┌─────────────────────────────────────────────────────────────────┐
│                   ADMINISTRATOR WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Login Process:                                                  │
│  ├─▶ Admin account created via seed script or direct DB         │
│  └─▶ Same authentication flow as other users                    │
│                                                                  │
│  Dashboard View:                                                 │
│  ├─▶ Platform statistics (total users, reports, etc.)           │
│  ├─▶ Resource management panel                                  │
│  └─▶ System health indicators                                   │
│                                                                  │
│  Available Actions:                                              │
│  ├─▶ Create, update, delete curated resources                   │
│  ├─▶ Upload resource files (PDFs, videos)                       │
│  ├─▶ Manage resource library content                            │
│  ├─▶ View all user accounts (if implemented)                    │
│  └─▶ Access platform analytics                                  │
│                                                                  │
│  Resource Management:                                            │
│  ├─▶ POST /api/v1/resources - Create new resource               │
│  ├─▶ PUT /api/v1/resources/{id} - Update resource               │
│  ├─▶ DELETE /api/v1/resources/{id} - Remove resource            │
│  └─▶ POST /api/v1/resources/upload - Upload file                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Features Implemented

### 4.1 Academic Report Processing

**OCR-Powered Grade Extraction:**
- Upload PDF or image-based academic report cards
- Gemini Vision AI extracts subject names and grades
- Supports both CBC and 8-4-4 grade formats
- Automatic GPA calculation based on Kenyan grading scale
- Manual correction interface for OCR errors

**Report Analysis:**
- Subject-by-subject grade breakdown
- Strong and weak subject identification
- Trend analysis comparing across terms
- AI-generated recommendations for improvement

### 4.2 AI-Powered Flashcards

**Generation:**
- Create flashcards for any subject and topic
- Specify count (1-20 cards per generation)
- Automatic difficulty adjustment based on grade level
- Curriculum-aligned content (CBC/8-4-4)

**Review System:**
- Spaced repetition algorithm for optimal retention
- Track times reviewed and accuracy rates
- Mastery level calculation per card
- AI-powered answer evaluation with feedback

### 4.3 Personalized Study Plans

**Plan Creation:**
- Select subjects to focus on
- Specify available hours per day
- Set exam dates for deadline-based planning
- Priority levels for each subject

**Schedule Features:**
- Weekly calendar with study sessions
- Daily duration recommendations
- Strategy suggestions per subject
- Progress tracking via session logging

### 4.4 Career Guidance

**Recommendations:**
- AI-generated career paths based on academic performance
- Match scores showing compatibility with student profile
- Suitable universities in Kenya listed
- Course requirements and qualifications

**Career Quiz:**
- Interactive interest assessment
- Preference questions (indoor/outdoor work, etc.)
- Combined with grades for holistic matching
- Detailed career descriptions with job outlook

### 4.5 AI Tutor (Conversational Assistant)

**Chat Interface:**
- Natural language conversation with AI tutor
- Subject-specific context support
- Maintains conversation history within session
- Age-appropriate responses based on grade level

**Capabilities:**
- Homework help across subjects
- Concept explanations
- Study tips and strategies
- Motivational support

### 4.6 Math Solver

**Problem Input:**
- Text-based math problem entry
- Image upload for handwritten equations
- Support for algebraic, geometric, and arithmetic problems

**Solution Output:**
- Step-by-step solution breakdown
- Explanation of each step
- Practice problem suggestions
- Related concept hints

### 4.7 Performance Analytics Dashboard

**Overview Metrics:**
- Overall GPA prominently displayed
- Total subjects tracked
- Performance trend indicators

**Visualizations:**
- Subject performance bar charts
- Grade trend line graphs
- Improving/declining subject highlights
- Recent activity feed

### 4.8 Resource Library

**Content Types:**
- PDF study materials
- Video lessons (external links)
- Curated notes and toolkits

**Features:**
- Search and filter by subject, grade, type
- Favorite/bookmark resources
- View and download counts
- Admin-curated quality content

### 4.9 Multi-User Collaboration

**Invite Code System:**
- Teachers/parents generate 8-character codes
- Students redeem codes to link accounts
- Codes expire after 7 days

**Guardian Features:**
- View linked students' dashboards (read-only)
- Send insights and feedback to students
- Track multiple students simultaneously

### 4.10 Settings and Profile Management

**Profile Settings:**
- Update name, school, phone number
- Change grade level and curriculum
- Profile picture upload

**Account Settings:**
- Password change
- Session management
- Data export (if implemented)

**Theme Support:**
- Light and dark mode toggle
- Persistent preference storage

---

## 5. Future Features and Improvements

### 5.1 Mobile Application

**Proposed Enhancement:**
Native mobile applications for Android and iOS using React Native or Flutter.

**Expected Benefits:**
- Improved camera integration for report scanning
- Offline flashcard review capability
- Push notifications for study reminders
- Better mobile user experience

**Importance:**
Many Kenyan students access the internet primarily via smartphones. A native app would significantly improve accessibility and user engagement.

### 5.2 Offline Mode

**Proposed Enhancement:**
Progressive Web App (PWA) features enabling offline access to downloaded content.

**Technical Approach:**
- Service worker for caching flashcards and study plans
- IndexedDB for local data storage
- Sync mechanism when connectivity returns

**Expected Benefits:**
- Studying without internet connectivity
- Reduced data usage
- Improved performance via cached resources

**Importance:**
Internet access can be inconsistent in some areas. Offline capability ensures students can continue learning regardless of connectivity.

### 5.3 AI-Powered Study Session Recommendations

**Proposed Enhancement:**
Intelligent recommendations for optimal study times and subjects based on performance patterns.

**Technical Approach:**
- Analyze past study session logs
- Identify high-productivity time patterns
- Correlate study habits with grade improvements
- Machine learning model for personalized suggestions

**Expected Benefits:**
- Optimized study schedules
- Improved academic outcomes
- Better time management

**Importance:**
Personalized timing recommendations would further differentiate SmartPath's AI capabilities and provide measurable value.

### 5.4 Teacher Class Management Dashboard

**Proposed Enhancement:**
Expanded teacher features for managing entire classes rather than individual student links.

**Features:**
- Bulk invite code generation
- Class-wide performance analytics
- Assignment tracking
- Announcement broadcasts

**Importance:**
Teachers could more efficiently use SmartPath as a classroom supplement, increasing adoption in schools.

### 5.5 Gamification and Rewards

**Proposed Enhancement:**
Points, badges, streaks, and leaderboards to increase engagement.

**Features:**
- Earn points for flashcard reviews, study sessions, report uploads
- Achievement badges (e.g., "7-Day Streak", "Math Master")
- Weekly/monthly leaderboards
- Unlockable themes or features

**Importance:**
Gamification has proven effective in educational apps for maintaining student motivation and engagement.

### 5.6 Parent Communication Features

**Proposed Enhancement:**
Direct messaging between parents and teachers through the platform.

**Features:**
- In-app messaging system
- Scheduled parent-teacher meeting requests
- Report card acknowledgment
- Progress report sharing

**Importance:**
Enhanced communication would make SmartPath valuable for schools as a comprehensive education platform.

### 5.7 Integration with School Systems

**Proposed Enhancement:**
APIs for direct integration with school management systems.

**Technical Approach:**
- Standardized API endpoints for grade import
- Webhook support for real-time updates
- Authentication via school credentials

**Expected Benefits:**
- Automatic grade syncing
- Reduced manual data entry
- Seamless adoption for schools

### 5.8 Advanced Analytics and Reporting

**Proposed Enhancement:**
Detailed analytics reports exportable as PDFs or spreadsheets.

**Features:**
- Term-by-term performance reports
- Comparative analysis with previous years
- Projected grade trajectories
- Printable report cards

**Importance:**
Exportable reports would be valuable for school documentation and parent meetings.

---

## 6. System Limitations

### 6.1 Current Technical Limitations

**OCR Accuracy for Handwritten Reports:**
- Current accuracy around 72% for handwritten text
- Requires user correction or manual entry
- Improvement requires additional training data or model fine-tuning

**No Offline Functionality:**
- Requires internet connection for all features
- Content cannot be pre-downloaded for offline use
- Problematic in low-connectivity environments

**Single Language Support:**
- Interface currently only in English
- No Kiswahili translation yet
- Limits accessibility for some users

**Limited File Size Support:**
- Maximum 10MB upload limit for reports
- High-resolution images may need compression
- Large documents may timeout during processing

### 6.2 AI Service Constraints

**API Rate Limits:**
- Google Gemini API has request limits
- Peak usage may cause temporary slowdowns
- Cost scales with usage

**Content Generation Latency:**
- AI features require 2-6 seconds per request
- Not instant like database queries
- May feel slow to users expecting immediacy

**Occasional Hallucinations:**
- AI may generate factually incorrect content
- Requires user review of generated flashcards
- Career data should be verified externally

### 6.3 Data and Privacy Considerations

**User Data Storage:**
- Academic records stored in cloud database
- Requires trust in platform security
- GDPR/data protection compliance needed for scale

**Limited Data Export:**
- Users cannot easily export all their data
- Data portability features not yet implemented

### 6.4 Areas Requiring Further Research

**Improved OCR Models:**
- Training specialized models for Kenyan report formats
- Handling diverse school template layouts

**Predictive Analytics:**
- More sophisticated grade prediction algorithms
- Long-term academic trajectory modeling

**Accessibility:**
- Screen reader compatibility improvements
- Support for visual impairments

**Localization:**
- Kiswahili language interface
- Regional education system variations

---

## Appendix: API Endpoint Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/v1/auth/register` | POST | Create new user account |
| **Auth** | `/api/v1/auth/login` | POST | Authenticate and get JWT |
| **Auth** | `/api/v1/auth/profile` | GET | Get current user profile |
| **Reports** | `/api/v1/reports/upload` | POST | Upload and process report |
| **Reports** | `/api/v1/reports/{id}` | GET | Get specific report |
| **Performance** | `/api/v1/performance/dashboard` | GET | Get performance overview |
| **Performance** | `/api/v1/performance/trends` | GET | Get grade trends |
| **Flashcards** | `/api/v1/flashcards/generate` | POST | Generate new flashcards |
| **Flashcards** | `/api/v1/flashcards/{id}/review` | POST | Submit flashcard review |
| **Study Plans** | `/api/v1/study-plans/generate` | POST | Create new study plan |
| **Study Plans** | `/api/v1/study-plans/{id}` | GET/PUT | Manage study plan |
| **Career** | `/api/v1/career/recommendations` | GET | Get career recommendations |
| **AI Tutor** | `/api/v1/ai-tutor/chat` | POST | Chat with AI tutor |
| **Math** | `/api/v1/math/solve` | POST | Solve math problem |
| **Resources** | `/api/v1/resources` | GET | Browse resource library |

---

*Documentation prepared for the SmartPath Educational Platform, designed for Kenyan students and educators.*
