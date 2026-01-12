import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { studyPlansApi } from "@/lib/api";

type StudyPlan = {
    plan_id: number;
    subject?: string;
    focus_area?: string;
    strategy?: string;
    available_hours_per_day?: number;
    daily_duration_minutes?: number;
    status?: string;
    is_active?: boolean;
};

interface EditStudyPlanDialogProps {
    isOpen: boolean;
    onClose: () => void;
    plan: StudyPlan | null;
    onSave: () => void;
}

const EditStudyPlanDialog = ({ isOpen, onClose, plan, onSave }: EditStudyPlanDialogProps) => {
    const { toast } = useToast();
    const [subject, setSubject] = useState("");
    const [focusArea, setFocusArea] = useState("");
    const [strategy, setStrategy] = useState("");
    const [availableHours, setAvailableHours] = useState(2);
    const [status, setStatus] = useState("active");
    const [priority, setPriority] = useState("medium"); // New state for priority
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (plan && isOpen) {
            setSubject(plan.subject || "");
            setFocusArea(plan.focus_area || "");
            setStrategy(plan.strategy || "");

            // Correctly initialize hours: priority to explicit field, fallback to minutes calculation
            if (plan.available_hours_per_day) {
                setAvailableHours(plan.available_hours_per_day);
            } else if (plan.daily_duration_minutes) {
                setAvailableHours(parseFloat((plan.daily_duration_minutes / 60).toFixed(1)));
            } else {
                setAvailableHours(2);
            }

            // Init status
            if (plan.status) {
                setStatus(plan.status.toLowerCase());
            } else if (plan.is_active !== undefined) {
                setStatus(plan.is_active ? "active" : "completed");
            } else {
                setStatus("active");
            }

            // Init priority
            if (plan.priority !== undefined && plan.priority !== null) {
                if (plan.priority >= 8) {
                    setPriority("high");
                } else if (plan.priority >= 4) {
                    setPriority("medium");
                } else {
                    setPriority("low");
                }
            } else {
                setPriority("medium");
            }
        }
    }, [plan, isOpen]);

    const handleSave = async () => {
        if (!plan) return;

        try {
            setLoading(true);
            await studyPlansApi.update(plan.plan_id, {
                subject,
                focus_area: focusArea,
                study_strategy: strategy,
                available_hours_per_day: availableHours,
                status: status,
                is_active: status === "active" || status === "in progress",
                priority: priority
            });

            toast({
                title: "Plan Updated",
                description: "Your study plan has been updated successfully.",
            });
            onSave();
            onClose();
        } catch (error) {
            toast({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "Failed to update study plan.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Study Plan</DialogTitle>
                    <DialogDescription>
                        Update your study plan details
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Mathematics"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Focus Area</label>
                        <Textarea
                            value={focusArea}
                            onChange={(e) => setFocusArea(e.target.value)}
                            placeholder="Specific topics to focus on..."
                            rows={2}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Study Strategy</label>
                        <Textarea
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value)}
                            placeholder="Your study approach..."
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Available Hours Per Day</label>
                        <Input
                            type="number"
                            value={availableHours}
                            onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 0)}
                            min={0.5}
                            max={12}
                            step={0.5}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <Select
                            value={priority}
                            onValueChange={setPriority}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select
                            value={status}
                            onValueChange={setStatus}
                            disabled={plan?.status === "completed"}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active (In Progress)</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                            </SelectContent>
                        </Select>
                        {plan?.status === "completed" && (
                            <p className="text-xs text-muted-foreground">
                                This plan is completed and cannot be changed.
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditStudyPlanDialog;
