import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { studyPlansApi } from "@/lib/api";

const subjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
];

const GenerateStudyPlan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [hoursPerDay, setHoursPerDay] = useState([2]);
  const [examDate, setExamDate] = useState<Date>();
  const [focusAreas, setFocusAreas] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<{
    plan_id: number;
    subjects: string[];
    hoursPerDay: number;
    examDate: Date;
    weeklySchedule: Array<{
      day?: string;
      subjects?: string[];
      subject?: string;
      duration?: number;
      duration_minutes?: number;
      focus?: string;
    }>;
    focusAreas: Record<string, string>;
    strategies?: Record<string, string>;
    plans: unknown[];
  } | null>(null);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "No subjects selected",
        description: "Please select at least one subject.",
        variant: "destructive",
      });
      return;
    }

    if (!examDate) {
      toast({
        title: "Exam date required",
        description: "Please select an exam date.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      toast({
        title: "Generating Study Plan...",
        description: "AI is creating your personalized study schedule. This may take a moment.",
      });

      // Prepare focus areas - convert Record<string, string> to Dict<string, List[str]]
      const focusAreasDict: Record<string, string[]> = {};
      Object.entries(focusAreas).forEach(([subject, topics]) => {
        if (topics && topics.trim()) {
          // Split by comma and clean up
          focusAreasDict[subject] = topics.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }
      });

      const plans = await Promise.race([
        studyPlansApi.generate({
          subjects: selectedSubjects,
          available_hours_per_day: hoursPerDay[0],
          exam_date: examDate!.toISOString(),
          focus_areas: Object.keys(focusAreasDict).length > 0 ? focusAreasDict : undefined,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout. Please try again.")), 120000)
        ) as Promise<never>,
      ]);

      if (plans && Array.isArray(plans) && plans.length > 0) {
        // Transform the API response to match preview format
        // Use the first plan's weekly_schedule, or combine all if needed
        const firstPlan = plans[0];
        const allWeeklySchedules = plans
          .map((p: { weekly_schedule?: unknown[] }) => p.weekly_schedule || [])
          .flat()
          .filter(Boolean);
        
        // Use the first plan's schedule, or combine all schedules, or generate fallback
        const weeklySchedule = firstPlan.weekly_schedule && firstPlan.weekly_schedule.length > 0
          ? firstPlan.weekly_schedule
          : allWeeklySchedules.length > 0
          ? allWeeklySchedules
          : generateWeeklySchedule();
        
        // Build focus areas from all plans
        const focusAreas = plans.reduce((acc: Record<string, string>, plan: { subject?: string; focus_area?: string; strategy?: string }) => {
          if (plan.subject) {
            // Use focus_area if available, otherwise use strategy, otherwise default
            acc[plan.subject] = plan.focus_area || plan.strategy || `Focus on core concepts and practice regularly for ${plan.subject}`;
          }
          return acc;
        }, {});
        
        // Build strategies map
        const strategies = plans.reduce((acc: Record<string, string>, plan: { subject?: string; strategy?: string }) => {
          if (plan.subject && plan.strategy) {
            acc[plan.subject] = plan.strategy;
          }
          return acc;
        }, {});
        
        const transformedPlan = {
          plan_id: firstPlan.plan_id,
          subjects: selectedSubjects,
          hoursPerDay: hoursPerDay[0],
          examDate: new Date(examDate!),
          weeklySchedule: weeklySchedule,
          focusAreas: focusAreas,
          strategies: strategies,
          plans: plans, // Store all plans for saving
        };
        
        setPreviewPlan(transformedPlan);
        toast({
          title: "Study Plan Generated!",
          description: `Successfully created ${plans.length} study plan${plans.length > 1 ? 's' : ''} for your subjects.`,
        });
      } else {
        throw new Error("No study plan generated. Please try again.");
      }
    } catch (error) {
      console.error("Study plan generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate study plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWeeklySchedule = () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.map((day) => ({
      day,
      subjects: selectedSubjects.slice(0, 2),
      duration: hoursPerDay[0] / 2,
    }));
  };

  const handleSave = async () => {
    if (!previewPlan || !previewPlan.plans) {
      toast({
        title: "No plan to save",
        description: "Please generate a study plan first.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Saving Study Plan...",
        description: "Your study plan is being saved.",
      });

      // Plans are already saved by the backend when generated
      // Just navigate to the study plans page
      toast({
        title: "Study Plan Saved!",
        description: "Your study plan has been created successfully.",
      });

      setTimeout(() => {
        navigate("/study-plans");
      }, 1000);
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save study plan.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/study-plans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate Study Plan</h1>
            <p className="text-muted-foreground mt-1">
              Create a personalized study schedule for your exams
            </p>
          </div>
        </div>

        {!previewPlan ? (
          <>
            {/* Subject Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Select Subjects
                </CardTitle>
                <CardDescription>
                  Choose the subjects you want to include in your study plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject}
                      className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleSubject(subject)}
                    >
                      <Checkbox
                        checked={selectedSubjects.includes(subject)}
                        onCheckedChange={() => toggleSubject(subject)}
                      />
                      <label className="flex-1 cursor-pointer font-medium">{subject}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Focus Areas */}
            {selectedSubjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Focus Areas (Optional)</CardTitle>
                  <CardDescription>
                    Specify topics you want to concentrate on for each subject
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSubjects.map((subject) => (
                    <div key={subject} className="space-y-2">
                      <label className="text-sm font-medium">{subject}</label>
                      <Input
                        placeholder={`e.g., Calculus, Equations${subject === "Biology" ? ", Cell Division" : ""}`}
                        value={focusAreas[subject] || ""}
                        onChange={(e) =>
                          setFocusAreas({ ...focusAreas, [subject]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Time and Date */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Details</CardTitle>
                <CardDescription>
                  Set your available study time and exam date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Available Hours Per Day: {hoursPerDay[0]} hours
                  </label>
                  <Slider
                    value={hoursPerDay}
                    onValueChange={setHoursPerDay}
                    min={0.5}
                    max={8}
                    step={0.5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 2-4 hours per day for effective learning
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Exam Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {examDate ? format(examDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={examDate}
                        onSelect={setExamDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={selectedSubjects.length === 0 || !examDate || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Study Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Study Plan
                </>
              )}
            </Button>
            
            {isGenerating && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">AI is working on your study plan...</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Analyzing your subjects, creating a personalized schedule, and optimizing your study time.
                        This may take 30-60 seconds.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Study Plan Preview</CardTitle>
                <CardDescription>
                  Review your personalized study schedule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Subjects</p>
                    <p className="font-semibold">{previewPlan.subjects?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Daily Hours</p>
                    <p className="font-semibold">{previewPlan.hoursPerDay || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Exam Date</p>
                    <p className="font-semibold">
                      {previewPlan.examDate ? format(new Date(previewPlan.examDate), "MMM dd, yyyy") : "Not set"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Selected Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {(previewPlan.subjects || []).map((subject: string) => (
                      <Badge key={subject}>{subject}</Badge>
                    ))}
                  </div>
                </div>

                {(previewPlan.focusAreas && Object.keys(previewPlan.focusAreas).length > 0) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Focus Areas & Strategies</h3>
                      <div className="space-y-3">
                        {Object.entries(previewPlan.focusAreas).map(([subject, focus]) => (
                          <div key={subject} className="p-3 rounded-lg bg-muted border">
                            <p className="text-sm font-semibold mb-1">{subject}</p>
                            <p className="text-sm text-muted-foreground mb-2">{focus || "Focus on core concepts and practice regularly"}</p>
                            {previewPlan.strategies && previewPlan.strategies[subject] && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Study Strategy:</p>
                                <p className="text-xs text-muted-foreground">{previewPlan.strategies[subject]}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Weekly Schedule</h3>
                  {previewPlan.weeklySchedule && previewPlan.weeklySchedule.length > 0 ? (
                    <div className="space-y-2">
                      {previewPlan.weeklySchedule.slice(0, 5).map((day, index: number) => (
                        <div
                          key={day.day || index}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <span className="font-medium">{day.day || `Day ${index + 1}`}</span>
                          <div className="flex items-center gap-2">
                            {day.subjects && Array.isArray(day.subjects) ? (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  {day.subjects.join(", ")}
                                </span>
                                {day.duration && (
                                  <Badge variant="outline">{day.duration}h</Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {day.subject || "Study session"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {previewPlan.weeklySchedule.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          ...and {previewPlan.weeklySchedule.length - 5} more days
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Weekly schedule will be generated based on your preferences.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPreviewPlan(null)} className="flex-1">
                Regenerate
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save Study Plan
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GenerateStudyPlan;
