import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  Eye,
  UserPlus,
} from "lucide-react";
import { relationshipsApi, LinkedStudent } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ConnectionManagement } from "@/components/connections/ConnectionManagement";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  // Fetch linked students
  const { data: students, isLoading } = useQuery({
    queryKey: ["linkedStudents"],
    queryFn: relationshipsApi.getLinkedStudents,
  });

  const studentCount = students?.length || 0;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {user?.full_name || "Teacher"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your students' academic progress
            </p>
          </div>
          <Button onClick={() => navigate("/settings?tab=connections")} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add Students
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? <Skeleton className="h-9 w-16" /> : studentCount}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Linked to your account
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Students Improving
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">-</div>
              <p className="text-sm text-muted-foreground mt-1">
                Showing positive trends
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Need Attention
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">-</div>
              <p className="text-sm text-muted-foreground mt-1">
                Require extra support
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Students List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Your Students
            </CardTitle>
            <CardDescription>
              Click on a student to view their detailed performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : studentCount === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Students Linked Yet
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Generate an invite code and share it with your students to start
                  monitoring their progress.
                </p>
                <Button onClick={() => navigate("/settings?tab=connections")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Generate Invite Code
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {students?.map((student: LinkedStudent) => (
                  <div
                    key={student.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/students/${student.user_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {student.full_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {student.grade_level && (
                        <Badge variant="outline">Grade {student.grade_level}</Badge>
                      )}
                      {student.school_name && (
                        <Badge variant="secondary" className="hidden md:inline-flex">
                          {student.school_name}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Management */}
        <div className="mt-8">
          <ConnectionManagement
            students={students || []}
            userType="teacher"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
