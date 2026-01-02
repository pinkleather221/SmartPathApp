# SmartPath App

![SmartPath Logo](https://img.shields.io/badge/SmartPath-Learning%20Platform-blue?style=for-the-badge&logo=react&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

## 🎓 Empowering Kenyan Students Through AI-Driven Learning

SmartPath is a comprehensive educational platform designed specifically for Kenyan students, teachers, and parents. Built on the foundation of Kenya's Competency-Based Curriculum (CBC) and 8-4-4 systems, SmartPath leverages artificial intelligence to provide personalized learning experiences, performance analytics, and career guidance.

## 🌟 Key Features

### 📊 Academic Performance Tracking
- **OCR-Powered Report Processing**: Automatically extract grades from PDF and image-based academic reports
- **Real-time Analytics**: Visualize performance trends across subjects and terms
- **Predictive Insights**: AI-powered performance predictions and improvement recommendations
- **Grade Normalization**: Standardized grade processing for different Kenyan curricula

### 🧠 AI-Powered Learning Tools
- **Smart Flashcards**: Generate personalized flashcards using Google's Gemini AI
- **Intelligent Study Plans**: Create customized study schedules based on performance data
- **Career Recommendations**: AI-driven career guidance based on academic performance and interests
- **Learning Insights**: Automated feedback and study tips

### 👥 Multi-User Collaboration
- **Role-Based Access**: Separate interfaces for Students, Teachers, and Parents
- **Guardian-Student Linking**: Parents and teachers can monitor student progress
- **Invite System**: Secure relationship management between students and guardians
- **Shared Resources**: Collaborative learning materials and insights

### 🎯 Curriculum Support
- **CBC & 8-4-4 Compatible**: Full support for both Kenyan curriculum systems
- **Grade-Level Adaptation**: Content tailored for students from Grade 7-12
- **Subject-Specific Tools**: Specialized features for different subjects and topics

## 🏗️ Architecture

```
SmartPath App
├── frontend/          # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/# Reusable UI Components (shadcn/ui)
│   │   ├── pages/     # Route Components
│   │   ├── hooks/     # Custom React Hooks
│   │   ├── lib/       # Utilities & API Clients
│   │   └── types/     # TypeScript Definitions
│   └── public/        # Static Assets
└── backend/           # FastAPI Backend
    ├── main.py        # API Routes & Application
    ├── models.py      # Pydantic Models
    ├── database.py    # Database Configuration
    ├── auth.py        # Authentication Logic
    ├── services/      # Business Logic Services
    └── config.py      # Environment Configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm)
- **Python** (v3.12 or higher) - [Download here](https://python.org)
- **PostgreSQL** (v12 or higher) - [Install locally](https://postgresql.org/download/)
- **Git** - [Install here](https://git-scm.com/)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd SmartPathApp/backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL database**
   ```sql
   -- Create database
   CREATE DATABASE smartpath;

   -- Run schema (from local_postgres_schema.sql)
   psql -U postgres -d smartpath -f local_postgres_schema.sql
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env  # Create from template if available
   # Edit .env with your settings:
   # - DATABASE_URL
   # - SECRET_KEY
   # - GOOGLE_AI_API_KEY (for Gemini)
   ```

6. **Run the backend**
   ```bash
   python main.py
   # Server starts at http://localhost:8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   ```bash
   # Edit src/lib/api.ts to point to your backend
   const API_BASE_URL = 'http://localhost:8000/api/v1';
   ```

4. **Start development server**
   ```bash
   npm run dev
   # Frontend available at http://localhost:5173
   ```

## 🐳 Docker Deployment

### Backend Container
```bash
cd backend
docker build -t smartpath-backend .
docker run -p 8000:8000 --env-file .env smartpath-backend
```

### Full Stack with Docker Compose
```yaml
# docker-compose.yml (example)
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smartpath
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile

### Core Features
- `POST /api/v1/reports/upload` - Upload academic reports with OCR
- `POST /api/v1/flashcards/generate` - Generate AI flashcards
- `POST /api/v1/study-plans/generate` - Create personalized study plans
- `GET /api/v1/career/recommendations` - Get career suggestions

### Interactive API Docs
When running locally, visit: `http://localhost:8000/docs`

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts and profiles
- **academic_reports** - Uploaded report data and grades
- **flashcards** - Generated study cards
- **study_plans** - Personalized learning plans
- **learning_insights** - AI-generated feedback and tips

### Relationships
- **Guardian-Student Linking** - Teachers/parents can monitor student progress
- **Performance Tracking** - Historical academic data analysis
- **Career Mapping** - Interest-based career recommendations

## 🔐 Security Features

- **JWT Authentication** with configurable token expiration
- **Role-Based Access Control** (Student/Teacher/Parent/Admin)
- **CORS Protection** with configurable origins
- **Security Headers** middleware
- **Input Validation** using Pydantic models
- **Password Hashing** with bcrypt

## 🤖 AI Integration

### Google Gemini AI
- **OCR Processing**: Extract grades from academic reports
- **Content Generation**: Create flashcards and study materials
- **Career Guidance**: Analyze performance for career recommendations
- **Feedback Generation**: Provide personalized learning insights

### Intelligent Features
- **Adaptive Learning**: Adjust content difficulty based on performance
- **Performance Prediction**: Forecast future academic outcomes
- **Gap Analysis**: Identify areas needing improvement
- **Personalized Recommendations**: Tailored study plans and tips

## 📱 User Roles & Permissions

### 👨‍🎓 Students
- Upload and analyze academic reports
- Generate flashcards and study plans
- Receive career recommendations
- Track personal progress and insights

### 👩‍🏫 Teachers
- Monitor linked students' progress
- Create insights and feedback for students
- Access class-wide performance analytics
- Generate invite codes for student linking

### 👨‍👩‍👧 Parents
- View children's academic performance
- Receive automated insights and alerts
- Monitor study progress and recommendations
- Access career guidance for their children

## 🎨 Frontend Technologies

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Router** - Client-side routing
- **React Query** - Powerful data synchronization
- **Recharts** - Data visualization components

## ⚙️ Backend Technologies

- **FastAPI** - High-performance async web framework
- **PostgreSQL** - Robust relational database
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation and serialization
- **Google AI (Gemini)** - AI-powered features
- **JWT** - Secure authentication
- **Alembic** - Database migrations

## 🚀 Deployment Options

### Cloud Platforms
- **Render** - Backend API and PostgreSQL hosting
- **Vercel** - Frontend deployment with edge functions
- **Railway** - Full-stack deployment
- **AWS/GCP** - Enterprise-grade cloud deployment

### Local Development
- **Docker** - Containerized development and deployment
- **PostgreSQL** - Local database setup
- **Environment Configuration** - Flexible environment management

## 📈 Performance & Scalability

- **Async Processing** - FastAPI's async capabilities for high concurrency
- **Database Connection Pooling** - Efficient database resource management
- **Caching Strategies** - Optimized data retrieval and storage
- **CDN Integration** - Fast static asset delivery
- **Horizontal Scaling** - Support for multiple instances

## 🤝 Contributing

We welcome contributions from the community! Here's how you can get involved:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure tests pass
4. Submit a pull request with a clear description

### Areas for Contribution
- Bug fixes and performance improvements
- New features and enhancements
- Documentation updates
- Testing and code quality improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Kenya Ministry of Education** - For curriculum guidance and standards
- **Google AI** - For powering our intelligent features
- **Open Source Community** - For the amazing tools and libraries

## 📞 Support

- **Documentation**: [Full API Docs](https://api.smartpath.app/docs)
- **Issues**: [GitHub Issues](https://github.com/your-org/SmartPathApp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/SmartPathApp/discussions)
- **Email**: support@smartpath.app

---

**Made with ❤️ for Kenyan students, by educators who understand the challenges of the Kenyan education system.**
