import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Eye, Calendar, Clock, Target, Loader2, Trash2, Edit } from "lucide-react";
import { studyPlansApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const StudyPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await studyPlansApi.getActive();
      setPlans(data || []);
    } catch (error) {
      toast({
        title: "Error loading study plans",
        description: error instanceof Error ? error.message : "Failed to load study plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activePlans = useMemo(() => plans.filter((p: any) => p.is_active !== false), [plans]);
  const completedPlans = useMemo(() => plans.filter((p: any) => p.is_active === false), [plans]);

  // Total study hours across all plans based on logged sessions, fallback to planned hours
  const totalStudyHours = useMemo(() => {
    const hoursFromSessions = plans.reduce((sum: number, p: any) => {
      const minutes = (p.sessions || []).reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0);
      return sum + minutes / 60;
    }, 0);
    if (hoursFromSessions > 0) return Math.round(hoursFromSessions * 10) / 10;
    // Fallback: sum of planned daily hours over a week for active plans
    const planned = activePlans.reduce((sum: number, p: any) => sum + (p.available_hours_per_day || 0) * 7, 0);
    return Math.round(planned * 10) / 10;
  }, [plans, activePlans]);

  // Hours in the last 7 days from sessions
  const thisWeekHours = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const hours = plans.reduce((sum: number, p: any) => {
      const minutes = (p.sessions || []).reduce((acc: number, s: any) => {
        const t = s.date ? new Date(s.date).getTime() : 0;
        return acc + (t >= sevenDaysAgo ? (s.duration_minutes || 0) : 0);
      }, 0);
      return sum + minutes / 60;
    }, 0);
    return Math.round(hours * 10) / 10;
  }, [plans]);
  const getPriorityColor = (priority: string | null | undefined) => {
    if (!priority || typeof priority !== 'string') {
      return "bg-muted text-muted-foreground";
    }
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-destructive/10 text-destructive";
      case "medium":
        return "bg-warning/10 text-warning";
      case "low":
        return "bg-success/10 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "in progress":
        return "bg-primary/10 text-primary";
      case "completed":
        return "bg-success/10 text-success";
      case "paused":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Study Plans</h1>
            <p className="text-muted-foreground mt-1">
              Manage your personalized study schedules
            </p>
          </div>
          <Link to="/study-plans/generate">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Generate New Plan
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Plans</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : activePlans.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Study Hours</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : `${totalStudyHours}`}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Week</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : `${thisWeekHours}h`}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Plans</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : completedPlans.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Active Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Study Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : activePlans.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">No active study plans</h3>
                  <p className="text-muted-foreground">
                    Generate your first study plan to get started
                  </p>
                  <Link to="/study-plans/generate">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Study Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activePlans.map((plan: any) => {
                const getDaysRemaining = (endDate: string) => {
                  const end = new Date(endDate);
                  const now = new Date();
                  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return diff > 0 ? diff : 0;
                };

                return (
                  <Card key={plan.plan_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <CardTitle className="text-lg">{plan.subject || plan.subjects?.[0] || "Study Plan"}</CardTitle>
                          <CardDescription className="mt-1">{plan.focus_area || plan.description || ""}</CardDescription>
                        </div>
                        <Badge className={getPriorityColor(plan.priority || "medium")}>
                          {plan.priority || "Medium"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(plan.progress_percentage)}%</span>
                        </div>
                        <Progress value={Math.round(plan.progress_percentage)} />
                      </div>
                      

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{plan.available_hours_per_day || 2}h/day</span>
                        </div>
                        {plan.end_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{getDaysRemaining(plan.end_date)} days left</span>
                          </div>
                        )}
                      </div>

                            <div className="flex items-center justify-between gap-2">
                              <Badge className={getStatusColor(plan.is_active ? "In Progress" : "Completed")} variant="outline">
                                {plan.is_active ? "In Progress" : "Completed"}
                              </Badge>
                              <div className="flex gap-1">
                                <Link to={`/study-plans/${plan.plan_id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await studyPlansApi.update(plan.plan_id, {
                                        is_active: !plan.is_active,
                                      });
                                      toast({
                                        title: "Plan updated",
                                        description: `Study plan marked as ${plan.is_active ? "completed" : "active"}.`,
                                      });
                                      loadPlans();
                                    } catch (error) {
                                      toast({
                                        title: "Error updating plan",
                                        description: error instanceof Error ? error.message : "Failed to update study plan",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this study plan?")) {
                                      try {
                                        await studyPlansApi.delete(plan.plan_id);
                                        toast({
                                          title: "Study plan deleted",
                                          description: "The study plan has been deleted successfully.",
                                        });
                                        loadPlans();
                                      } catch (error) {
                                        toast({
                                          title: "Error deleting plan",
                                          description: error instanceof Error ? error.message : "Failed to delete study plan",
                                          variant: "destructive",
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Completed Plans */}
        {!loading && completedPlans.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Completed Plans</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedPlans.map((plan: any) => (
                <Card key={plan.plan_id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.subject || plan.subjects?.[0]}</CardTitle>
                        <CardDescription className="mt-1">{plan.focus_area || plan.description}</CardDescription>
                      </div>
                      <Badge className="bg-success/10 text-success">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {plan.end_date ? `Ended on ${new Date(plan.end_date).toLocaleDateString()}` : "Completed"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudyPlans;
