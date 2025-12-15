import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Target, BarChart3, LineChart, Loader2 } from "lucide-react";
import { performanceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Performance = () => {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await performanceApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      toast({
        title: "Error loading performance",
        description: error instanceof Error ? error.message : "Failed to load performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const overallGPA = dashboard?.overall_gpa || 0;
  const totalSubjects = dashboard?.total_subjects || 0;
  const subjects = dashboard?.subject_performance || dashboard?.strong_subjects || [];
  const trend = dashboard?.trend || "improving";

  const getGradeColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-success";
    if (gpa >= 2.5) return "text-warning";
    return "text-destructive";
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

  const getStrengthColor = (strength: number) => {
    if (strength >= 85) return "bg-success";
    if (strength >= 70) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Performance Overview</h1>
            <p className="text-muted-foreground mt-1">
              Track your academic progress across all subjects
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/performance/trends">
              <Button variant="outline" size="lg">
                <LineChart className="w-5 h-5 mr-2" />
                View Trends
              </Button>
            </Link>
            <Link to="/performance/predictions">
              <Button variant="outline" size="lg">
                <Target className="w-5 h-5 mr-2" />
                Predictions
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Overall GPA</CardDescription>
              <CardTitle className={`text-4xl ${getGradeColor(overallGPA)}`}>
                {overallGPA.toFixed(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Based on {totalSubjects} subjects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total Subjects</CardDescription>
              <CardTitle className="text-4xl">{totalSubjects}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Actively tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Performance Trend</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-success" />
                {trend.charAt(0).toUpperCase() + trend.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Compared to last term
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Subject Performance</h2>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare All
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : subjects.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <h3 className="text-lg font-semibold">No performance data yet</h3>
                <p className="text-muted-foreground">
                  Upload your reports to see performance analytics
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject: any) => (
                <Card key={subject.performance_id || subject.subject} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{subject.subject}</CardTitle>
                        <CardDescription className="mt-1">
                          Strength Score: {subject.strength_score.toFixed(2) || 0}/100
                        </CardDescription>
                      </div>
                      {getTrendIcon("stable")}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grade</span>
                      <Badge className={getGradeColor(subject.current_gpa || 0)}>
                        {subject.current_grade || "N/A"}
                      </Badge>
                    </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Strength</span>
                          <span className="font-medium">{Math.round(subject.strength_score || 0)}%</span>
                        </div>
                        <Progress value={subject.strength_score || 0} className={getStrengthColor(subject.strength_score || 0)} />
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
