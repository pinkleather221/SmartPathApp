import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import StudentView from "./pages/StudentView";
import Reports from "./pages/Reports";
import UploadReport from "./pages/UploadReport";
import ReportDetail from "./pages/ReportDetail";
import Performance from "./pages/Performance";
import PerformanceTrends from "./pages/PerformanceTrends";
import PerformancePredictions from "./pages/PerformancePredictions";
import Flashcards from "./pages/Flashcards";
import GenerateFlashcards from "./pages/GenerateFlashcards";
import FlashcardReview from "./pages/FlashcardReview";
import Career from "./pages/Career";
import CareerDetail from "./pages/CareerDetail";
import CareerQuiz from "./pages/CareerQuiz";
import StudyPlans from "./pages/StudyPlans";
import GenerateStudyPlan from "./pages/GenerateStudyPlan";
import StudyPlanDetail from "./pages/StudyPlanDetail";
import Insights from "./pages/Insights";
import InsightDetail from "./pages/InsightDetail";
import MathSolver from "./pages/MathSolver";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import RoleBasedDashboard from "./components/RoleBasedDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Routes */}
            {/* Role-based dashboard redirect */}
            <Route path="/dashboard" element={<ProtectedRoute><RoleBasedDashboard /></ProtectedRoute>} />

            {/* Role-specific dashboards */}
            <Route path="/student/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/teacher/dashboard" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/parent/dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />

            {/* Student view for teachers/parents */}
            <Route path="/students/:id" element={<ProtectedRoute><StudentView /></ProtectedRoute>} />

            {/* Student-specific routes (also accessible by teachers/parents for their students) */}
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/reports/upload" element={<ProtectedRoute><UploadReport /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            <Route path="/performance/trends" element={<ProtectedRoute><PerformanceTrends /></ProtectedRoute>} />
            <Route path="/performance/predictions" element={<ProtectedRoute><PerformancePredictions /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/flashcards/generate" element={<ProtectedRoute><GenerateFlashcards /></ProtectedRoute>} />
            <Route path="/flashcards/review/:id" element={<ProtectedRoute><FlashcardReview /></ProtectedRoute>} />
            <Route path="/career" element={<ProtectedRoute><Career /></ProtectedRoute>} />
            <Route path="/career/quiz" element={<ProtectedRoute><CareerQuiz /></ProtectedRoute>} />
            <Route path="/career/:id" element={<ProtectedRoute><CareerDetail /></ProtectedRoute>} />
            <Route path="/study-plans" element={<ProtectedRoute><StudyPlans /></ProtectedRoute>} />
            <Route path="/study-plans/generate" element={<ProtectedRoute><GenerateStudyPlan /></ProtectedRoute>} />
            <Route path="/study-plans/:id" element={<ProtectedRoute><StudyPlanDetail /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/insights/:id" element={<ProtectedRoute><InsightDetail /></ProtectedRoute>} />
            <Route path="/math-solver" element={<ProtectedRoute><MathSolver /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
