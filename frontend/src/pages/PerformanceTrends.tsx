import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, ArrowLeft } from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { performanceApi } from "@/lib/api";
import { gradeNumericToGPA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TrendData {
  subject: string;
  dates: (string | Date)[];
  grades: number[];
}

const subjects = ["All Subjects", "Mathematics", "English", "Biology", "Chemistry", "Physics"];
const timeRanges = ["Last Term", "Last Year", "All Time"];

const PerformanceTrends = () => {
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [timeRange, setTimeRange] = useState("All Time");
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setLoading(true);
        const subject = selectedSubject === "All Subjects" ? undefined : selectedSubject;
        const data = await performanceApi.getTrends(subject);
        setTrends((data || []) as TrendData[]);
      } catch (error) {
        toast({
          title: "Error loading trends",
          description: error instanceof Error ? error.message : "Failed to load performance trends",
          variant: "destructive",
        });
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrends();
  }, [selectedSubject, toast]);

  // Shape API data like the mock rows: { term, SubjectA, SubjectB, ... }
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const subjectDateGrade: Record<string, Record<string, number>> = {};
    const subjectNames: string[] = [];
    trends.forEach((t) => {
      const subject = t.subject || "Subject";
      subjectNames.push(subject);
      subjectDateGrade[subject] = subjectDateGrade[subject] || {};
      (t.dates || []).forEach((d, idx) => {
        const dateStr = new Date(d).toISOString().split("T")[0];
        const grade = (t.grades || [])[idx];
        if (typeof grade === "number") {
          subjectDateGrade[subject][dateStr] = gradeNumericToGPA(grade);
        }
      });
    });
    const allDates = new Set<string>();
    Object.values(subjectDateGrade).forEach((dateGrade) => {
      Object.keys(dateGrade).forEach((date) => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort();
    const rows = sortedDates.map((date) => {
      const row: Record<string, string | number> = { term: new Date(date).toLocaleDateString() };
      Object.keys(subjectDateGrade).forEach((subject) => {
        const value = subjectDateGrade[subject][date];
        if (value !== undefined) {
          row[subject] = value;
        }
      });
      return row;
    });
    if (selectedSubject !== "All Subjects") {
      // Keep only rows with the selected subject and only include its series
      return rows
        .filter((row) => row[selectedSubject] !== undefined)
        .map((row) => ({
          term: row.term,
          [selectedSubject]: row[selectedSubject] as number,
        }));
    }
    return rows;
  }, [trends, selectedSubject]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/performance">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Trends</h1>
              <p className="text-muted-foreground mt-1">
                Track your grade progression over time
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              Grade Trends
            </CardTitle>
            <CardDescription>
              {selectedSubject === "All Subjects"
                ? "Showing GPA trends for all subjects"
                : `Showing GPA trend for ${selectedSubject}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RechartsLineChart data={loading ? [] : chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="term" className="text-xs" />
                <YAxis domain={[0, 4]} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {selectedSubject === "All Subjects" ? (
                  <>
                    {(trends || []).map((t, idx) => {
                      const subject = t.subject || `Subject${idx}`;
                      const colors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))"];
                      return (
                        <Line
                          key={subject}
                          type="monotone"
                          dataKey={subject}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          name={subject}
                        />
                      );
                    })}
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey={selectedSubject}
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    name={selectedSubject}
                  />
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Average GPA</CardDescription>
              <CardTitle className="text-3xl text-primary">3.6</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Across all terms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Best Performance</CardDescription>
              <CardTitle className="text-3xl text-success">4.0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Mathematics - Term 2 2024</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Improvement Rate</CardDescription>
              <CardTitle className="text-3xl text-accent">+18%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Since Term 1 2023</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PerformanceTrends;
