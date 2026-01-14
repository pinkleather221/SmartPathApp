import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Eye,
} from "lucide-react";
import { relationshipsApi, LinkedStudent, StudentDashboard } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ConnectionManagement } from "@/components/connections/ConnectionManagement";

const ParentDashboard = () => {
  const navigate = useNavigate();

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  // Fetch linked children
  const { data: children, isLoading: loadingChildren } = useQuery({
    queryKey: ["linkedStudents"],
    queryFn: relationshipsApi.getLinkedStudents,
  });

  // If there's a child, fetch their dashboard
  const firstChild = children?.[0];
  const { data: childDashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ["childDashboard", firstChild?.user_id],
    queryFn: () => relationshipsApi.getStudentDashboard(firstChild!.user_id),
    enabled: !!firstChild,
  });

  const isLoading = loadingChildren || loadingDashboard;
  const hasChildren = (children?.length || 0) > 0;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {user?.full_name || "Parent"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your child's academic progress
            </p>
          </div>
          {hasChildren && (
            <Button variant="outline" onClick={() => navigate("/settings?tab=connections")}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : !hasChildren ? (
          /* No Children State */
          <Card className="border-border/50">
            <CardContent className="py-16">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Child Linked Yet
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Generate an invite code and share it with your child to start
                  monitoring their academic progress.
                </p>
                <Button onClick={() => navigate("/settings?tab=connections")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Generate Invite Code
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Child Selector (if multiple) */}
            {children && children.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {children.map((child: LinkedStudent) => (
                  <Button
                    key={child.user_id}
                    variant={child.user_id === firstChild?.user_id ? "default" : "outline"}
                    onClick={() => navigate(`/students/${child.user_id}`)}
                  >
                    {child.full_name}
                  </Button>
                ))}
              </div>
            )}

            {/* Child Info Card */}
            <Card className="border-border/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground">
                      {childDashboard?.student_name || firstChild?.full_name}
                    </h2>
                    <p className="text-muted-foreground">
                      {firstChild?.grade_level ? `Grade ${firstChild.grade_level}` : ""}
                      {firstChild?.school_name ? ` • ${firstChild.school_name}` : ""}
                    </p>
                  </div>
                  <Button onClick={() => navigate(`/students/${firstChild?.user_id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Overall GPA
                  </CardTitle>
                  <Award className="w-4 h-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {childDashboard?.overall_gpa?.toFixed(2) || "0.00"}
                  </div>
                  <div className="flex items-center text-sm text-success mt-1">
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    <span>Current GPA</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Subjects
                  </CardTitle>
                  <BookOpen className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {childDashboard?.total_subjects || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Active this term</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Strong Subjects
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {childDashboard?.strong_subjects?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Performing well</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Weak Subjects
                  </CardTitle>
                  <ArrowDownRight className="w-4 h-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {childDashboard?.weak_subjects?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Need attention</p>
                </CardContent>
              </Card>
            </div>

            {/* Subject Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strong Subjects */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-success" />
                    Strong Subjects
                  </CardTitle>
                  <CardDescription>
                    Your child is excelling in these areas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {childDashboard?.strong_subjects?.length ? (
                    <div className="space-y-3">
                      {childDashboard.strong_subjects.map((subject: string) => (
                        <div key={subject} className="flex items-center justify-between">
                          <span className="font-medium">{subject}</span>
                          <Badge variant="default" className="bg-success">Excellent</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No strong subjects data available yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Weak Subjects */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-warning" />
                    Areas for Improvement
                  </CardTitle>
                  <CardDescription>
                    These subjects may need extra attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {childDashboard?.weak_subjects?.length ? (
                    <div className="space-y-3">
                      {childDashboard.weak_subjects.map((subject: string) => (
                        <div key={subject} className="flex items-center justify-between">
                          <span className="font-medium">{subject}</span>
                          <Badge variant="outline" className="text-warning border-warning">
                            Needs Work
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No areas of concern identified
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trends */}
            {(childDashboard?.improving_subjects?.length || childDashboard?.declining_subjects?.length) && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {childDashboard?.improving_subjects?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-success flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4" />
                          Improving
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {childDashboard.improving_subjects.map((subject: string) => (
                            <Badge key={subject} variant="outline" className="text-success border-success">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {childDashboard?.declining_subjects?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-destructive flex items-center gap-2 mb-3">
                          <TrendingDown className="w-4 h-4" />
                          Declining
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {childDashboard.declining_subjects.map((subject: string) => (
                            <Badge key={subject} variant="outline" className="text-destructive border-destructive">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Connection Management */}
        <div className="mt-8">
          <ConnectionManagement
            students={children || []}
            userType="parent"
            onStudentRemoved={(studentId) => {
              // If the removed student was the currently viewed child, navigate away
              if (firstChild?.user_id === studentId) {
                window.location.reload(); // Simple refresh to update the view
              }
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
