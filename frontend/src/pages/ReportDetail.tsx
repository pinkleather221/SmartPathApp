import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Calendar,
  Lightbulb,
  Target,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<{
    report_id?: number;
    term?: string;
    year?: number;
    uploaded_at?: string;
    overall_gpa?: number;
    grades_json?: Record<string, string>;
    strong_subjects?: string[];
    weak_subjects?: string[];
    metadata_json?: {
      recommendations?: string[];
    };
  } | null>(null);
  const [analysis, setAnalysis] = useState<{
    report_id?: number;
    overall_gpa?: number;
    subject_count?: number;
    strong_subjects?: string[];
    weak_subjects?: string[];
    trend_analysis?: Record<string, string>;
    recommendations?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingReport, setAnalyzingReport] = useState(false);

  useEffect(() => {
    if (id) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getById(parseInt(id!));
      if (data) {
        setReport(data);
        // Automatically load analysis data
        loadAnalysis(parseInt(id!));
      } else {
        toast({
          title: "Report not found",
          description: "The requested report could not be found",
          variant: "destructive",
        });
        navigate("/reports");
      }
    } catch (error) {
      toast({
        title: "Error loading report",
        description: error instanceof Error ? error.message : "Failed to load report",
        variant: "destructive",
      });
      navigate("/reports");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (reportId: number) => {
    try {
      setAnalyzingReport(true);
      const analysisData = await reportsApi.analyze(reportId);
      setAnalysis(analysisData);
    } catch (error) {
      console.error("Error loading analysis:", error);
      toast({
        title: "Analysis unavailable",
        description: "Could not load AI analysis for this report",
        variant: "destructive",
      });
    } finally {
      setAnalyzingReport(false);
    }
  };

  const getGradeColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-success";
    if (gpa >= 2.5) return "text-warning";
    return "text-destructive";
  };

  const getGradeBadge = (gpa: number) => {
    if (gpa >= 3.5) return "default";
    if (gpa >= 2.5) return "secondary";
    return "destructive";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/reports")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {loading ? "Loading..." : `${report?.term || ""} ${report?.year || ""}`}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {report?.uploaded_at && `Uploaded on ${new Date(report.uploaded_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <Button variant="outline" disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <>
            {/* Overall GPA */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Overall GPA</p>
                  <p className="text-6xl font-bold text-primary">
                    {(report.overall_gpa || 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {Object.keys(report.grades_json || {}).length} Subjects
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Grades Table */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Grades</CardTitle>
                <CardDescription>
                  Detailed breakdown of your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">GPA</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.grades_json || {}).map(([subject, grade]: [string, string]) => {
                      // Convert grade letter to GPA (approximate)
                      const gradeToGPA: Record<string, number> = {
                        "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
                        "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "E": 0.0
                      };
                      const gpa = gradeToGPA[grade] || 0;
                      
                      return (
                        <TableRow key={subject}>
                          <TableCell className="font-medium">{subject}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getGradeBadge(gpa)}>{grade}</Badge>
                          </TableCell>
                          <TableCell className={`text-center font-semibold ${getGradeColor(gpa)}`}>
                            {gpa.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getTrendIcon("stable")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Analysis Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Strong Subjects */}
              <Card className="border-success/20 bg-success/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <Target className="w-5 h-5" />
                    Strong Subjects
                  </CardTitle>
                  <CardDescription>
                    Keep up the excellent work in these areas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyzingReport ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {analysis?.strong_subjects && analysis.strong_subjects.length > 0 ? (
                        analysis.strong_subjects.map((subject: string) => (
                          <li
                            key={subject}
                            className="flex items-center gap-2 text-foreground font-medium"
                          >
                            <TrendingUp className="w-4 h-4 text-success" />
                            {subject}
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground italic">
                          No strong subjects identified yet. Keep working hard! 📚
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Weak Subjects */}
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <AlertCircle className="w-5 h-5" />
                    Areas for Improvement
                  </CardTitle>
                  <CardDescription>
                    Focus your efforts on these subjects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyzingReport ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {analysis?.weak_subjects && analysis.weak_subjects.length > 0 ? (
                        analysis.weak_subjects.map((subject: string) => (
                          <li
                            key={subject}
                            className="flex items-center gap-2 text-foreground font-medium"
                          >
                            <AlertCircle className="w-4 h-4 text-warning" />
                            {subject}
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground italic">
                          Great work! All subjects are performing well!
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            {(analyzingReport || (analysis?.recommendations && analysis.recommendations.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-accent" />
                    AI-Powered Recommendations
                  </CardTitle>
                  <CardDescription>
                    Personalized insights to help you improve
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyzingReport ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-3 text-muted-foreground">Generating AI recommendations...</span>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {analysis?.recommendations && analysis.recommendations.length > 0 ? (
                        analysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-semibold text-accent">
                                {index + 1}
                              </span>
                            </div>
                            <p className="text-foreground">{rec}</p>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground italic text-center py-4">
                          No specific recommendations at this time. Keep up the good work! 💪
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Button size="lg" variant="default" onClick={() => navigate("/study-plans/generate")}>
                Generate Study Plan
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/career")}>
                View Career Recommendations
              </Button>
            </div>
          </>
        ) : !loading ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Report not found</h3>
              <p className="text-muted-foreground">
                The requested report could not be loaded
              </p>
              <Button onClick={() => navigate("/reports")}>
                Back to Reports
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default ReportDetail;
