import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Target, BarChart3, LineChart, Loader2, ArrowLeft } from "lucide-react";
import { performanceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const Performance = () => {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  const handleCompareClick = () => {
    setShowComparison(true);
    // Smooth scroll to comparison section after state update
    setTimeout(() => {
      const comparisonSection = document.getElementById('comparison-section');
      if (comparisonSection) {
        comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await performanceApi.getDashboard();
      console.log("Dashboard data:", data);
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
  const subjects = dashboard?.subject_performance || [];
  console.log("Subject data:", subjects);
  const trend = dashboard?.trend || "improving";

  const getGradeColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-success";
    if (gpa >= 2.5) return "text-warning";
    return "text-destructive";
  };

  const getTrendIcon = (trend: string) => {
    if (!trend) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }

    switch (trend.toLowerCase()) {
      case "improving":
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "declining":
      case "down":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      case "stable":
        return <Minus className="w-4 h-4 text-muted-foreground" />;
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
            <Button variant="outline" onClick={handleCompareClick}>
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
                      {getTrendIcon(subject.trend)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grade</span>
                      <Badge className={getGradeColor(subject.grade_numeric || 0)}>
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

        {/* Comparison View */}
        {showComparison && (
          <div id="comparison-section" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Overview
                </Button>
                <h2 className="text-2xl font-bold">Subject Comparison</h2>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* GPA Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>GPA Comparison</CardTitle>
                  <CardDescription>
                    Compare your GPA across all subjects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      gpa: {
                        label: "GPA",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={subjects}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="subject"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 4]}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: any) => [value ? value.toFixed(2) : "0.00", "GPA"]}
                      />
                      <Bar
                        dataKey="grade_numeric"
                        fill="var(--color-gpa)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Strength Score Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Strength Score Comparison</CardTitle>
                  <CardDescription>
                    Compare your performance strength across subjects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      strength: {
                        label: "Strength Score",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={subjects}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="subject"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: any) => [value ? Math.round(value) : 0, "Strength Score"]}
                      />
                      <Bar
                        dataKey="strength_score"
                        fill="var(--color-strength)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Subject Comparison</CardTitle>
                <CardDescription>
                  Comprehensive view of all subject performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Subject</th>
                        <th className="text-center py-2 px-4 font-medium">Grade</th>
                        <th className="text-center py-2 px-4 font-medium">GPA</th>
                        <th className="text-center py-2 px-4 font-medium">Strength Score</th>
                        <th className="text-center py-2 px-4 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject: any) => (
                        <tr key={subject.performance_id || subject.subject} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{subject.subject}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={getGradeColor(subject.grade_numeric || 0)}>
                              {subject.current_grade || "N/A"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {(subject.grade_numeric || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <span className="font-mono">{Math.round(subject.strength_score || 0)}%</span>
                              <Progress
                                value={subject.strength_score || 0}
                                className={`w-16 ${getStrengthColor(subject.strength_score || 0)}`}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {getTrendIcon(subject.trend)}
                              <span className="text-xs text-muted-foreground">
                                {subject.trend || "No data"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Performance;
