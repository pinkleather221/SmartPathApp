import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Clock, Target, Edit, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { studyPlansApi } from "@/lib/api";

type WeeklyDay = {
  day_of_week?: string;
  day?: string;
  study_hours?: number;
  duration?: number;
  topics?: string[];
  completed?: boolean;
};

type StudyPlan = {
  plan_id: number;
  subject?: string;
  focus_area?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
  available_hours_per_day?: number;
  priority?: string | number;
  is_active?: boolean;
  strategy?: string;
  weekly_schedule?: WeeklyDay[];
  sessions?: Array<{ date: string; duration_minutes: number; topics_covered?: string[]; notes?: string; completed: boolean }>;
};

const StudyPlanDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [logSessionOpen, setLogSessionOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("120");
  const [sessionTopics, setSessionTopics] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await studyPlansApi.getById(Number(id));
        if (!data) {
          toast({ title: "Plan not found", description: "The requested study plan does not exist", variant: "destructive" });
        }
        setPlan(data || null);
      } catch (e) {
        toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to load study plan", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, toast]);

  const getPriorityColor = (priority: string) => {
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

  const progressPct = useMemo(() => Math.round(plan?.progress_percentage ?? 0), [plan]);
  const totalHours = useMemo(() => {
    const sessions = plan?.sessions || [];
    const minutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    return (minutes / 60).toFixed(1);
  }, [plan]);
  const daysRemaining = useMemo(() => {
    if (!plan?.end_date) return 0;
    const end = new Date(plan.end_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [plan]);

  const handleLogSession = async () => {
    if (!plan) return;

    try {
      // Parse topics from comma-separated string
      const topicsArray = sessionTopics
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);

      // Log the session via API
      await studyPlansApi.logSession(plan.plan_id, {
        subject: plan.subject || "Study Session",
        duration_minutes: parseInt(sessionDuration),
        completed: true,
        notes: sessionNotes.trim() || undefined,
        topics_covered: topicsArray.length > 0 ? topicsArray : undefined,
      });

      // Reload the plan to get updated sessions
      const updatedPlan = await studyPlansApi.getById(Number(id));
      setPlan(updatedPlan || plan);

      toast({
        title: "Session Logged!",
        description: "Your study session has been recorded successfully.",
      });

      // Reset form
      setLogSessionOpen(false);
      setSessionDuration("120");
      setSessionTopics("");
      setSessionNotes("");

    } catch (error) {
      toast({
        title: "Error Logging Session",
        description: error instanceof Error ? error.message : "Failed to log study session",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = (newStatus: string) => {
    toast({
      title: "Status Updated",
      description: `Study plan status changed to ${newStatus}.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="text-muted-foreground">Loading plan...</div>
        ) : !plan ? (
          <div className="text-destructive">Study plan not found.</div>
        ) : (
        <>
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/study-plans">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getPriorityColor(String(plan.priority || "medium"))}>
                  {String(plan.priority || "Medium")} Priority
                </Badge>
                <Badge className={getStatusColor(plan.is_active ? "In Progress" : "Completed")} variant="outline">
                  {plan.is_active ? "In Progress" : "Completed"}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{plan.subject}</h1>
              <p className="text-muted-foreground mt-1">{plan.focus_area || plan.description || ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select defaultValue={plan.is_active ? "In Progress" : "Completed"} onValueChange={handleUpdateStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Plan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progress</CardDescription>
              <CardTitle className="text-3xl">{progressPct}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPct} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Days Remaining</CardDescription>
              <CardTitle className="text-3xl">{daysRemaining}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Hours</CardDescription>
              <CardTitle className="text-3xl">{totalHours}h</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sessions Logged</CardDescription>
              <CardTitle className="text-3xl">{(plan.sessions || []).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Study Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{plan.strategy || "Focus on active recall and spaced repetition."}</p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="font-medium">
                        {plan.start_date ? new Date(plan.start_date).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date</span>
                      <span className="font-medium">
                        {plan.end_date ? new Date(plan.end_date).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Time Commitment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Hours</span>
                      <span className="font-medium">{plan.available_hours_per_day || 2}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Hours</span>
                      <span className="font-medium">{((plan.available_hours_per_day || 2) * 7).toFixed(1)}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Weekly Schedule</h2>
              <Dialog open={logSessionOpen} onOpenChange={setLogSessionOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Log Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Study Session</DialogTitle>
                    <DialogDescription>
                      Record your study session details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration (minutes)</label>
                      <Input
                        type="number"
                        value={sessionDuration}
                        onChange={(e) => setSessionDuration(e.target.value)}
                        placeholder="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Topics Covered</label>
                      <Input
                        value={sessionTopics}
                        onChange={(e) => setSessionTopics(e.target.value)}
                        placeholder="e.g., Differentiation, Integration"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        value={sessionNotes}
                        onChange={(e) => setSessionNotes(e.target.value)}
                        placeholder="Any observations or challenges..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLogSessionOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleLogSession}>Save Session</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {(plan.weekly_schedule || []).map((day, index) => (
                <Card key={index} className={day.completed ? "opacity-75" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {day.completed && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{day.day_of_week || day.day}</p>
                          <p className="text-sm text-muted-foreground">
                            {(day.topics || []).join(", ")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {(day.study_hours ?? day.duration ?? 0)}h
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="space-y-3">
              {(plan.sessions || []).map((session, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{(session.topics_covered || []).join(", ")}</CardTitle>
                        <CardDescription>
                          {new Date(session.date).toLocaleDateString()} • {session.duration_minutes} minutes
                        </CardDescription>
                      </div>
                      <Badge className="bg-success/10 text-success">
                        <Check className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{session.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudyPlanDetail;
