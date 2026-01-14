import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { UserMinus, User, GraduationCap, AlertTriangle } from "lucide-react";
import { relationshipsApi, LinkedStudent, getImageUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConnectionManagementProps {
  students: LinkedStudent[];
  userType: "parent" | "teacher";
  onStudentRemoved?: (studentId: number) => void;
}

export const ConnectionManagement = ({
  students,
  userType,
  onStudentRemoved
}: ConnectionManagementProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const removeConnectionMutation = useMutation({
    mutationFn: (studentId: number) => relationshipsApi.removeStudentLink(studentId),
    onSuccess: (_, studentId) => {
      toast({
        title: "Connection removed",
        description: "The student connection has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["linkedStudents"] });
      onStudentRemoved?.(studentId);
      setRemovingId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove connection",
        variant: "destructive",
      });
      setRemovingId(null);
    },
  });

  const handleRemoveConnection = (studentId: number) => {
    setRemovingId(studentId);
    removeConnectionMutation.mutate(studentId);
  };

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <User className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No connected students</h3>
              <p className="text-muted-foreground">
                {userType === "parent"
                  ? "You haven't connected with any students yet."
                  : "You haven't connected with any students yet."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Connected Students ({students.length})
        </h2>
      </div>

      <div className="grid gap-4">
        {students.map((student) => (
          <Card key={student.user_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={getImageUrl(student.profile_picture)} alt={student.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{student.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Grade {student.grade_level}
                      {student.school_name && (
                        <>
                          <span>•</span>
                          <span>{student.school_name}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {userType === "parent" ? "Child" : "Student"}
                  </Badge>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={removingId === student.user_id}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          Remove Connection
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove the connection with{" "}
                          <strong>{student.full_name}</strong>? This action cannot be undone.
                          <br />
                          <br />
                          You will no longer be able to:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>View their academic performance</li>
                            <li>Access their reports and insights</li>
                            <li>Receive notifications about their progress</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveConnection(student.user_id)}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={removingId === student.user_id}
                        >
                          {removingId === student.user_id ? "Removing..." : "Remove Connection"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Connected since: {new Date(student.linked_at).toLocaleDateString()}</span>
                <span className="text-xs">
                  ID: {student.user_id}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};