import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Search,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { reportsApi } from "@/lib/api";

interface Report {
  report_id: number;
  term: string;
  year: number;
  uploaded_at: string;
  overall_gpa: number;
  grades_json: Record<string, string>;
}

const Reports = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getHistory();
      setReports(data || []);
    } catch (error) {
      toast({
        title: "Error loading reports",
        description: error instanceof Error ? error.message : "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    try {
      await reportsApi.delete(reportId);
      toast({
        title: "Report deleted",
        description: "The report has been successfully deleted.",
      });
      loadReports(); // Reload reports
    } catch (error) {
      toast({
        title: "Error deleting report",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.term?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.year?.toString().includes(searchQuery);
    const matchesYear = filterYear === "all" || report.year?.toString() === filterYear;
    return matchesSearch && matchesYear;
  });

  const getGradeColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-success";
    if (gpa >= 2.5) return "text-warning";
    return "text-destructive";
  };

  const getTrendIcon = (trend: string) => {
    if (!trend) return <Minus className="w-4 h-4 text-muted-foreground" />;
    switch (trend.toLowerCase()) {
      case "improving":
      case "up":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "declining":
      case "down":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      case "stable":
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const reportTrends = useMemo(() => {
    const sorted = [...reports].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    const trendsById: Record<number, "improving" | "declining" | "stable"> = {};
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i + 1];
      if (!previous) {
        trendsById[current.report_id] = "stable";
        continue;
      }
      const delta = (current.overall_gpa || 0) - (previous.overall_gpa || 0);
      if (delta > 0.05) trendsById[current.report_id] = "improving";
      else if (delta < -0.05) trendsById[current.report_id] = "declining";
      else trendsById[current.report_id] = "stable";
    }
    return trendsById;
  }, [reports]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Reports</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your academic reports
            </p>
          </div>
          <Link to="/reports/upload">
            <Button size="lg" className="w-full md:w-auto">
              <Upload className="w-5 h-5 mr-2" />
              Upload Report
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => (
              <Card
                key={report.report_id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {report.term} {report.year}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Uploaded on {new Date(report.uploaded_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getTrendIcon(reportTrends[report.report_id] || "stable")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Overall GPA
                    </span>
                    <span className={`text-2xl font-bold ${getGradeColor(report.overall_gpa || 0)}`}>
                      {(report.overall_gpa || 0).toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Subjects
                    </span>
                    <Badge variant="secondary">
                      {Object.keys(report.grades_json || {}).length}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link to={`/reports/${report.report_id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-2 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this report? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteReport(report.report_id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredReports.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No reports yet</h3>
                <p className="text-muted-foreground mt-1">
                  Upload your first report to get started
                </p>
              </div>
              <Link to="/reports/upload">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
