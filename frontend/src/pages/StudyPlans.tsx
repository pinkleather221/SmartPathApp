import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Eye, Calendar, Clock, Target, Loader2, Trash2, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studyPlansApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import EditStudyPlanDialog from "@/components/study-plans/EditStudyPlanDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StudyPlan = {
  plan_id: number;
  subject?: string;
  focus_area?: string;
  strategy?: string;
  available_hours_per_day?: number;
  daily_duration_minutes?: number;
  status: "active" | "paused" | "completed" | string; // Ensure status is always present
  is_active?: boolean;
  end_date?: string;
  progress_percentage: number;
  priority?: string;
  sessions?: any[];
};

interface StudyPlanCardProps {
  plan: StudyPlan;
  onEdit: (plan: StudyPlan) => void;
  onDelete: (plan: StudyPlan) => void;
}

const getPriorityColor = (priority: number | null | undefined) => {
  if (priority === null || priority === undefined) {
    return "bg-muted text-muted-foreground";
  }
  if (priority >= 8) {
    return "bg-destructive/10 text-destructive"; // High
  } else if (priority >= 4) {
    return "bg-warning/10 text-warning"; // Medium
  } else if (priority >= 1) {
    return "bg-success/10 text-success"; // Low
  }
  return "bg-muted text-muted-foreground"; // Default for 0 or invalid numbers
};

const getPriorityLabel = (priority: number | null | undefined) => {
  if (priority === null || priority === undefined) {
    return "N/A";
  }
  if (priority >= 8) {
    return "High";
  } else if (priority >= 4) {
    return "Medium";
  } else if (priority >= 1) {
    return "Low";
  }
  return "N/A"; // Default for 0 or invalid numbers
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
    case "in progress":
      return "bg-primary/10 text-primary";
    case "completed":
      return "bg-success/10 text-success";
    case "paused":
      return "bg-warning/10 text-warning"; // Changed paused to warning color
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getDaysRemaining = (endDate: string) => {
  const end = new Date(endDate);
  const today = new Date();
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const StudyPlanCard = ({ plan, onEdit, onDelete }: StudyPlanCardProps) => (
  <Card key={plan.plan_id} className={`hover:shadow-lg transition-shadow ${plan.status === "completed" ? "opacity-75" : ""}`}>
    <CardHeader>
      <div className="flex items-start justify-between mb-2">
        <div>
          <CardTitle className="text-lg">{plan.subject || plan.subjects?.[0] || "Study Plan"}</CardTitle>
          <CardDescription className="mt-1">{plan.focus_area || plan.description || ""}</CardDescription>
        </div>
        {plan.priority !== undefined && plan.priority !== null && (
          <Badge className={getPriorityColor(plan.priority)}>
            {getPriorityLabel(plan.priority)}
          </Badge>
        )}
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
          <span>{plan.available_hours_per_day || 0}h/day</span>
        </div>
        {plan.end_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{getDaysRemaining(plan.end_date)} days left</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between min-w-fit flex-wrap gap-2">
        <Badge className={getStatusColor(plan.status)} variant="outline">
          {plan.status === "active" ? "In Progress" : plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
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
            onClick={() => onEdit(plan)}
            disabled={plan.status === "completed"}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(plan)}
            disabled={plan.status === "completed"}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StudyPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<StudyPlan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await studyPlansApi.getAll(); // Fetch all plans
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

  const activePlans = useMemo(() => plans.filter((p) => p.status === "active"), [plans]);
  const pausedPlans = useMemo(() => plans.filter((p) => p.status === "paused"), [plans]);
  const completedPlans = useMemo(() => plans.filter((p) => p.status === "completed"), [plans]);

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

  const handleEditPlan = (plan: StudyPlan) => {
    setSelectedPlan(plan);
    setEditPlanOpen(true);
  };

  const handleDeletePlan = (plan: StudyPlan) => {
    setPlanToDelete(plan);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await studyPlansApi.delete(planToDelete.plan_id);
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
    } finally {
      setPlanToDelete(null);
    }
  };

  const renderPlanSection = (title: string, plansToRender: StudyPlan[], emptyMessage: string) => (
    <div>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : plansToRender.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <h3 className="text-lg font-semibold">{emptyMessage}</h3>
              {title === "Active Study Plans" && (
                <Link to="/study-plans/generate">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Study Plan
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          plansToRender.map((plan: StudyPlan) => (
            <StudyPlanCard
              key={plan.plan_id}
              plan={plan}
              onEdit={handleEditPlan}
              onDelete={handleDeletePlan}
            />
          ))
        )}
      </div>
    </div>
  );

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
              <CardDescription>Paused Plans</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : pausedPlans.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Plans</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : completedPlans.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Study Hours</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : `${totalStudyHours}`}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Study Plan Sections with Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active ({activePlans.length})</TabsTrigger>
            <TabsTrigger value="paused">Paused ({pausedPlans.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPlans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {renderPlanSection("Active Study Plans", activePlans, "No active study plans.")}
          </TabsContent>
          <TabsContent value="paused">
            {renderPlanSection("Paused Study Plans", pausedPlans, "No paused study plans.")}
          </TabsContent>
          <TabsContent value="completed">
            {renderPlanSection("Completed Study Plans", completedPlans, "No completed study plans.")}
          </TabsContent>
        </Tabs>

      </div>
      <EditStudyPlanDialog
        isOpen={editPlanOpen}
        onClose={() => setEditPlanOpen(false)}
        plan={selectedPlan}
        onSave={() => {
          loadPlans();
          setEditPlanOpen(false);
        }}
      />

      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the study plan
              "{planToDelete?.subject || ""}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeletePlan}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout >
  );
};

export default StudyPlans;
