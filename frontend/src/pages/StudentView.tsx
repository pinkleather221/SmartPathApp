import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Award,
  BookOpen,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Brain,
  Compass,
  Lightbulb,
  Plus,
  MessageSquare,
  Target,
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { relationshipsApi, InsightType } from "@/lib/api";

const StudentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const studentId = parseInt(id || "0");
  
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
  const [insightDialogOpen, setInsightDialogOpen] = useState(false);
  const [newInsight, setNewInsight] = useState({
    type: "feedback" as InsightType,
    title: "",
    content: "",
  });

  // Fetch student dashboard
  const { data: dashboard, isLoading: loadingDashboard, error } = useQuery({
    queryKey: ["studentDashboard", studentId],
    queryFn: () => relationshipsApi.getStudentDashboard(studentId),
    enabled: studentId > 0,
  });

  // Fetch student reports
  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["studentReports", studentId],
    queryFn: () => relationshipsApi.getStudentReports(studentId, 20),
    enabled: studentId > 0,
  });

  // Fetch student flashcards
  const { data: flashcards, isLoading: loadingFlashcards } = useQuery({
    queryKey: ["studentFlashcards", studentId],
    queryFn: () => relationshipsApi.getStudentFlashcards(studentId),
    enabled: studentId > 0,
  });

  // Fetch student career recommendations
  const { data: careers, isLoading: loadingCareers } = useQuery({
    queryKey: ["studentCareer", studentId],
    queryFn: () => relationshipsApi.getStudentCareer(studentId),
    enabled: studentId > 0,
  });

  // Fetch student insights
  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ["studentInsights", studentId],
    queryFn: () => relationshipsApi.getStudentInsights(studentId),
    enabled: studentId > 0,
  });

  // Create insight mutation
  const createInsightMutation = useMutation({
    mutationFn: () => relationshipsApi.createStudentInsight(studentId, {
      insight_type: newInsight.type,
      title: newInsight.title,
      content: newInsight.content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentInsights", studentId] });
      setInsightDialogOpen(false);
      setNewInsight({ type: "feedback", title: "", content: "" });
      toast({
        title: "Insight Created",
        description: "Your insight has been sent to the student.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create insight.",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingDashboard;

  const getInsightIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "feedback": return MessageSquare;
      case "tip": return Lightbulb;
      case "analysis": return TrendingUp;
      case "recommendation": return Target;
      case "motivation": return Heart;
      default: return Lightbulb;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "feedback": return "bg-blue-500/10 text-blue-500";
      case "tip": return "bg-yellow-500/10 text-yellow-500";
      case "analysis": return "bg-green-500/10 text-green-500";
      case "recommendation": return "bg-purple-500/10 text-purple-500";
      case "motivation": return "bg-pink-500/10 text-pink-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-8">
          <Card className="border-destructive">
            <CardContent className="py-16 text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Access Denied
              </h3>
              <p className="text-muted-foreground mb-4">
                You do not have permission to view this student's data.
              </p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <>
                <h1 className="text-3xl font-bold text-foreground">
                  {dashboard?.student_name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Student Performance Overview
                </p>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Overall GPA
                  </CardTitle>
                  <Award className="w-4 h-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {dashboard?.overall_gpa?.toFixed(2) || "0.00"}
                  </div>
                  <Progress value={(dashboard?.overall_gpa || 0) * 25} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Subjects
                  </CardTitle>
                  <BookOpen className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {dashboard?.total_subjects || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Active subjects</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Strong Subjects
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {dashboard?.strong_subjects?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Performing well</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Weak Subjects
                  </CardTitle>
                  <TrendingDown className="w-4 h-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {dashboard?.weak_subjects?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="reports" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="reports" className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Reports</span>
                </TabsTrigger>
                <TabsTrigger value="flashcards" className="gap-2">
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">Flashcards</span>
                </TabsTrigger>
                <TabsTrigger value="career" className="gap-2">
                  <Compass className="w-4 h-4" />
                  <span className="hidden sm:inline">Career</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span className="hidden sm:inline">Insights</span>
                </TabsTrigger>
              </TabsList>

              {/* Reports Tab */}
              <TabsContent value="reports">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Academic Reports
                    </CardTitle>
                    <CardDescription>
                      Click on a report to view detailed subject grades
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingReports ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : (reports as unknown[])?.length ? (
                      <div className="space-y-3">
                        {(reports as unknown[]).map((report: unknown) => {
                          const r = report as {
                            report_id: number;
                            term: string;
                            year: number;
                            overall_gpa?: number;
                            grades_json?: Record<string, string>;
                            report_date: string;
                          };
                          const isExpanded = expandedReportId === r.report_id;
                          
                          return (
                            <div key={r.report_id} className="border rounded-lg overflow-hidden">
                              <div 
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedReportId(isExpanded ? null : r.report_id)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-foreground">
                                      {r.term} {r.year}
                                    </h4>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(r.report_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-foreground">
                                      {r.overall_gpa?.toFixed(1) || "0.0"}
                                    </div>
                                    <Badge variant="outline">
                                      {Object.keys(r.grades_json || {}).length} subjects
                                    </Badge>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Expanded Subject Grades */}
                              {isExpanded && r.grades_json && (
                                <div className="border-t bg-muted/30 p-4">
                                  <h5 className="font-medium text-sm text-muted-foreground mb-3">
                                    Subject Grades
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(r.grades_json).map(([subject, grade]) => {
                                      const gradeValue = grade as string;
                                      const isGoodGrade = ["A", "A-", "B+", "B"].includes(gradeValue);
                                      const isBadGrade = ["D", "D-", "E"].includes(gradeValue);
                                      
                                      return (
                                        <div 
                                          key={subject}
                                          className={`flex items-center justify-between p-3 rounded-lg border ${
                                            isGoodGrade ? "bg-success/10 border-success/20" :
                                            isBadGrade ? "bg-destructive/10 border-destructive/20" :
                                            "bg-background border-border"
                                          }`}
                                        >
                                          <span className="font-medium text-foreground">{subject}</span>
                                          <Badge 
                                            variant={isGoodGrade ? "default" : isBadGrade ? "destructive" : "secondary"}
                                            className={isGoodGrade ? "bg-success" : ""}
                                          >
                                            {gradeValue}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No reports available yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Flashcards Tab */}
              <TabsContent value="flashcards">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Flashcards
                    </CardTitle>
                    <CardDescription>
                      View the student's flashcard progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingFlashcards ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : (flashcards as unknown[])?.length ? (
                      <div className="space-y-3">
                        {(flashcards as unknown[]).map((card: unknown) => {
                          const c = card as {
                            card_id: number;
                            subject: string;
                            topic?: string;
                            question: string;
                            difficulty: string;
                            times_reviewed: number;
                            times_correct: number;
                            mastery_level: number;
                          };
                          const masteryPercent = c.mastery_level || 
                            (c.times_reviewed > 0 ? (c.times_correct / c.times_reviewed) * 100 : 0);
                          
                          return (
                            <div 
                              key={c.card_id}
                              className="p-4 rounded-lg border border-border"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Badge variant="outline">{c.subject}</Badge>
                                  {c.topic && (
                                    <Badge variant="secondary" className="ml-2">{c.topic}</Badge>
                                  )}
                                </div>
                                <Badge 
                                  variant={c.difficulty === "easy" ? "default" : c.difficulty === "hard" ? "destructive" : "secondary"}
                                >
                                  {c.difficulty}
                                </Badge>
                              </div>
                              <p className="text-foreground font-medium mb-3 line-clamp-2">
                                {c.question}
                              </p>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Reviewed {c.times_reviewed}x • {c.times_correct} correct
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Mastery:</span>
                                  <Progress value={masteryPercent} className="w-20 h-2" />
                                  <span className="font-medium">{masteryPercent.toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No flashcards created yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Career Tab */}
              <TabsContent value="career">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Compass className="w-5 h-5" />
                      Career Recommendations
                    </CardTitle>
                    <CardDescription>
                      AI-generated career paths based on student's performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingCareers ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
                      </div>
                    ) : (careers as unknown[])?.length ? (
                      <div className="space-y-4">
                        {(careers as unknown[]).map((career: unknown) => {
                          const c = career as {
                            recommendation_id: number;
                            career_path: string;
                            career_description?: string;
                            match_score: number;
                            reasoning?: string;
                            suitable_universities?: string[];
                          };
                          
                          return (
                            <div 
                              key={c.recommendation_id}
                              className="p-4 rounded-lg border border-border"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-lg text-foreground">
                                  {c.career_path}
                                </h4>
                                <Badge variant="default" className="bg-primary">
                                  {c.match_score.toFixed(0)}% Match
                                </Badge>
                              </div>
                              {c.career_description && (
                                <p className="text-muted-foreground mb-3">
                                  {c.career_description}
                                </p>
                              )}
                              {c.reasoning && (
                                <p className="text-sm text-muted-foreground italic">
                                  "{c.reasoning}"
                                </p>
                              )}
                              {c.suitable_universities && c.suitable_universities.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-sm font-medium">Universities: </span>
                                  <span className="text-sm text-muted-foreground">
                                    {c.suitable_universities.slice(0, 3).join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No career recommendations generated yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights">
                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <Lightbulb className="w-5 h-5" />
                          Insights & Feedback
                        </CardTitle>
                        <CardDescription>
                          Send personalized feedback to the student
                        </CardDescription>
                      </div>
                      <Dialog open={insightDialogOpen} onOpenChange={setInsightDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Insight
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Insight for Student</DialogTitle>
                            <DialogDescription>
                              Send a personalized insight that will appear in the student's dashboard.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Type</label>
                              <Select 
                                value={newInsight.type} 
                                onValueChange={(v) => setNewInsight({...newInsight, type: v as InsightType})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="feedback">Feedback</SelectItem>
                                  <SelectItem value="tip">Tip</SelectItem>
                                  <SelectItem value="analysis">Analysis</SelectItem>
                                  <SelectItem value="recommendation">Recommendation</SelectItem>
                                  <SelectItem value="motivation">Motivation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Title</label>
                              <Input 
                                placeholder="Enter a title..."
                                value={newInsight.title}
                                onChange={(e) => setNewInsight({...newInsight, title: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Content</label>
                              <Textarea 
                                placeholder="Write your insight or feedback..."
                                value={newInsight.content}
                                onChange={(e) => setNewInsight({...newInsight, content: e.target.value})}
                                rows={4}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setInsightDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => createInsightMutation.mutate()}
                              disabled={!newInsight.title || !newInsight.content || createInsightMutation.isPending}
                            >
                              {createInsightMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Insight"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingInsights ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
                      </div>
                    ) : (insights as unknown[])?.length ? (
                      <div className="space-y-3">
                        {(insights as unknown[]).map((insight: unknown) => {
                          const i = insight as {
                            insight_id: number;
                            insight_type: string;
                            title?: string;
                            content: string;
                            generated_at: string;
                            is_read: boolean;
                            metadata_json?: {
                              created_by_name?: string;
                              created_by_type?: string;
                              source?: string;
                            };
                          };
                          const Icon = getInsightIcon(i.insight_type);
                          const isGuardianCreated = i.metadata_json?.source === "guardian";
                          
                          return (
                            <div 
                              key={i.insight_id}
                              className={`p-4 rounded-lg border ${!i.is_read ? "border-primary/50 bg-primary/5" : "border-border"}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${getInsightColor(i.insight_type)}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant="outline" className="capitalize">
                                      {i.insight_type}
                                    </Badge>
                                    {!i.is_read && (
                                      <Badge className="bg-primary/20 text-primary">New</Badge>
                                    )}
                                    {isGuardianCreated && (
                                      <Badge variant="secondary">
                                        From {i.metadata_json?.created_by_type === "teacher" ? "Teacher" : "Parent"}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {new Date(i.generated_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {i.title && (
                                    <h4 className="font-semibold text-foreground mb-1">
                                      {i.title}
                                    </h4>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {i.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground">No insights yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Add Insight" to send feedback to the student
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentView;
