import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Award,
  BookOpen,
  Upload,
  Brain,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  MessageSquare,
  Target,
  Heart,
  Eye,
} from "lucide-react";
import { performanceApi, reportsApi, insightsApi } from "@/lib/api";
import { getCurrentUser as getAuthUser } from "@/lib/auth";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [reports, setReports] = useState<unknown[]>([]);
  const [user, setUser] = useState<unknown>(null);
  const [insights, setInsights] = useState<unknown[]>([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardData, reportsData, userData, insightsData] = await Promise.all([
        performanceApi.getDashboard().catch(() => null),
        reportsApi.getHistory(5).catch(() => []),
        getAuthUser().catch(() => null),
        insightsApi.getAcademicAnalysis().catch(() => []),
      ]);

      setDashboard(dashboardData);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setUser(userData);
      setInsights(Array.isArray(insightsData) ? insightsData : []);
    } catch (error) {
      toast({
        title: "Error loading dashboard",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {(user as { full_name?: string })?.full_name || "Student"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your academic performance
          </p>
        </div>

        {/* Quick Stats */}
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
                {loading ? "..." : ((dashboard as { overall_gpa?: number })?.overall_gpa?.toFixed(2) || "0.00")}
              </div>
              <div className="flex items-center text-sm text-success mt-1">
                {((dashboard as { overall_gpa?: number })?.overall_gpa || 0) > 0 && (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    <span>Current GPA</span>
                  </>
                )}
              </div>
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
                {loading ? "..." : ((dashboard as { total_subjects?: number })?.total_subjects || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Active this term</p>
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
                {loading ? "..." : ((dashboard as { strong_subjects?: unknown[] })?.strong_subjects?.length || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Performing well</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Weak Subjects
              </CardTitle>
              <ArrowDownRight className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {loading ? "..." : ((dashboard as { weak_subjects?: unknown[] })?.weak_subjects?.length || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reports */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Reports</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports yet. Upload your first report to get started.
                </div>
              ) : (
                reports.map((report: unknown) => {
                  const r = report as { report_id: number; term: string; year: number; grades_json?: Record<string, unknown>; overall_gpa?: number };
                  return (
                  <div
                    key={r.report_id}
                    onClick={() => navigate(`/reports/${r.report_id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {r.term} {r.year}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {Object.keys(r.grades_json || {}).length} subjects
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">
                        {r.overall_gpa?.toFixed(1) || "0.0"}
                      </div>
                      <Badge variant="default" className="mt-1">GPA</Badge>
                    </div>
                  </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate("/reports/upload")}
              >
                <Upload className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Upload Report</div>
                  <div className="text-xs text-muted-foreground">Add your latest grades</div>
                </div>
              </Button>
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate("/flashcards/generate")}
              >
                <Brain className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Generate Flashcards</div>
                  <div className="text-xs text-muted-foreground">Study smarter</div>
                </div>
              </Button>
              <Button 
                className="w-full justify-start h-auto py-4" 
                variant="outline"
                onClick={() => navigate("/career")}
              >
                <Compass className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Career Recommendations</div>
                  <div className="text-xs text-muted-foreground">Explore your future</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trend & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Subject Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (() => {
                const dashboardData = dashboard as { strong_subjects?: unknown[] };
                if ((dashboardData?.strong_subjects?.length || 0) > 0) {
                  return (dashboardData.strong_subjects || []).slice(0, 5).map((subject: unknown) => {
                    const s = subject as { performance_id: number; subject: string; current_grade?: string; strength_score?: number };
                    return (
                      <div key={s.performance_id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{s.subject}</span>
                          <Badge variant="outline">{s.current_grade || "N/A"}</Badge>
                        </div>
                        <Progress value={s.strength_score || 0} className="h-2" />
                      </div>
                    );
                  });
                }
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    No subject data available
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Insights</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary"
                  onClick={() => navigate("/insights")}
                >
                  View All
                  <Eye className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : insights.length > 0 ? (
                insights.slice(0, 3).map((insight: unknown) => {
                  const i = insight as {
                    insight_id: number;
                    insight_type: string;
                    title?: string;
                    content: string;
                    generated_at?: string;
                    created_at?: string;
                    is_read?: boolean;
                  };
                  const getTypeColor = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case "feedback":
                        return "bg-primary/10 text-primary";
                      case "tips":
                      case "tip":
                        return "bg-accent/10 text-accent";
                      case "analysis":
                        return "bg-success/10 text-success";
                      case "recommendations":
                      case "recommendation":
                        return "bg-warning/10 text-warning";
                      case "motivation":
                        return "bg-destructive/10 text-destructive";
                      default:
                        return "bg-muted text-muted-foreground";
                    }
                  };

                  const getTypeLabel = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case "feedback":
                        return "Feedback";
                      case "tips":
                      case "tip":
                        return "Tips";
                      case "analysis":
                        return "Analysis";
                      case "recommendations":
                      case "recommendation":
                        return "Recommendation";
                      case "motivation":
                        return "Motivation";
                      default:
                        return "Insight";
                    }
                  };

                  const getIcon = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case "feedback":
                        return MessageSquare;
                      case "tips":
                      case "tip":
                        return Lightbulb;
                      case "analysis":
                        return TrendingUp;
                      case "recommendations":
                      case "recommendation":
                        return Target;
                      case "motivation":
                        return Heart;
                      default:
                        return Lightbulb;
                    }
                  };

                  const Icon = getIcon(i.insight_type);
                  const displayText = i.title || i.content || "Learning Insight";
                  const previewText = i.content 
                    ? (i.content.length > 100 
                        ? i.content.substring(0, 100) + "..." 
                        : i.content)
                    : displayText;

                  return (
                    <div
                      key={i.insight_id}
                      onClick={() => navigate(`/insights/${i.insight_id}`)}
                      className={cn(
                        "p-4 rounded-lg border transition-colors cursor-pointer",
                        !i.is_read 
                          ? "border-primary/50 bg-primary/5 hover:bg-primary/10" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge 
                              className={cn("text-xs", getTypeColor(i.insight_type))} 
                              variant="outline"
                            >
                              {getTypeLabel(i.insight_type)}
                            </Badge>
                            {!i.is_read && (
                              <Badge className="bg-primary/20 text-primary text-xs">New</Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(i.generated_at || i.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                            {i.title || "Learning Insight"}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {previewText}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No insights available yet</p>
                  <p className="text-xs mt-1">Upload a report to generate insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
