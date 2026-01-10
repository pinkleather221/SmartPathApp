import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { User, Bell, Lock, Trash2, Loader2, Link, Copy, Check, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authApi, inviteApi, relationshipsApi, InviteCode, LinkedStudent, LinkedGuardian } from "@/lib/api";

// Connections Section Component
const ConnectionsSection = ({ userType }: { userType?: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // For teachers/parents: fetch their invite codes and linked students
  const { data: myCodes, isLoading: loadingCodes } = useQuery({
    queryKey: ["myCodes"],
    queryFn: inviteApi.getMyCodes,
    enabled: userType === "teacher" || userType === "parent",
  });

  const { data: linkedStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["linkedStudents"],
    queryFn: relationshipsApi.getLinkedStudents,
    enabled: userType === "teacher" || userType === "parent",
  });

  // For students: fetch linked guardians
  const { data: linkedGuardians, isLoading: loadingGuardians } = useQuery({
    queryKey: ["linkedGuardians"],
    queryFn: relationshipsApi.getLinkedGuardians,
    enabled: userType === "student",
  });

  // Generate invite code mutation
  const generateCodeMutation = useMutation({
    mutationFn: inviteApi.generateCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCodes"] });
      toast({
        title: "Invite Code Generated",
        description: "Share this code with your student to link accounts.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite code.",
        variant: "destructive",
      });
    },
  });

  // Redeem code mutation
  const redeemCodeMutation = useMutation({
    mutationFn: inviteApi.redeemCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linkedGuardians"] });
      setInviteCode("");
      toast({
        title: "Successfully Linked!",
        description: "You are now connected to your teacher/parent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem invite code.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard.",
    });
  };

  // Teacher/Parent view
  if (userType === "teacher" || userType === "parent") {
    return (
      <>
        {/* Generate Invite Code */}
        <Card>
          <CardHeader>
            <CardTitle>Invite Code</CardTitle>
            <CardDescription>
              Generate an invite code to share with your {userType === "teacher" ? "students" : "child"}. 
              They can enter this code to link their account to yours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate New Code"
              )}
            </Button>

            {/* Active Codes */}
            {loadingCodes ? (
              <p className="text-muted-foreground">Loading codes...</p>
            ) : myCodes && myCodes.length > 0 ? (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground">Your Invite Codes</h4>
                {myCodes.map((code: InviteCode) => (
                  <div 
                    key={code.code_id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono font-bold tracking-wider">
                        {code.code}
                      </code>
                      {code.used ? (
                        <Badge variant="secondary">Used</Badge>
                      ) : new Date(code.expires_at) < new Date() ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    {!code.used && new Date(code.expires_at) > new Date() && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No invite codes yet. Generate one to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Linked Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Linked {userType === "teacher" ? "Students" : "Children"}
            </CardTitle>
            <CardDescription>
              {userType === "teacher" ? "Students" : "Children"} connected to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : linkedStudents && linkedStudents.length > 0 ? (
              <div className="space-y-3">
                {linkedStudents.map((student: LinkedStudent) => (
                  <div 
                    key={student.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {student.grade_level && (
                        <Badge variant="outline">Grade {student.grade_level}</Badge>
                      )}
                      <Badge variant="secondary">
                        Linked {new Date(student.linked_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No {userType === "teacher" ? "students" : "children"} linked yet. 
                Share your invite code to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  // Student view
  return (
    <>
      {/* Redeem Invite Code */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Invite Code</CardTitle>
          <CardDescription>
            Enter an invite code from your teacher or parent to link your accounts. 
            This allows them to view your academic progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter 8-character code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="font-mono text-lg tracking-wider"
            />
            <Button 
              onClick={() => redeemCodeMutation.mutate(inviteCode)}
              disabled={inviteCode.length !== 8 || redeemCodeMutation.isPending}
            >
              {redeemCodeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Account"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Linked Guardians */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Linked Teachers & Parents
          </CardTitle>
          <CardDescription>
            Teachers and parents who can view your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGuardians ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : linkedGuardians && linkedGuardians.length > 0 ? (
            <div className="space-y-3">
              {linkedGuardians.map((guardian: LinkedGuardian) => (
                <div 
                  key={guardian.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{guardian.full_name}</p>
                    <p className="text-sm text-muted-foreground">{guardian.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={guardian.user_type === "teacher" ? "default" : "secondary"}>
                      {guardian.user_type === "teacher" ? "Teacher" : "Parent"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No teachers or parents linked yet. Enter an invite code to link your account.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get active tab from URL, default to "profile"
  const activeTab = searchParams.get("tab") || "profile";
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  // Fetch current user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.getProfile,
    retry: 1,
  });

  // Initialize form state with user data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [curriculum, setCurriculum] = useState("cbe");

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setPhone(user.phone_number || "");
      setSchool(user.school_name || "");
      setGradeLevel(user.grade_level?.toString() || "");
      setCurriculum(user.curriculum_type?.toLowerCase() || "cbe");
    }
  }, [user]);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reportNotifications, setReportNotifications] = useState(true);
  const [insightNotifications, setInsightNotifications] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.setQueryData(["currentUser"], data);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      full_name: fullName || undefined,
      phone_number: phone || undefined,
      school_name: school || undefined,
      grade_level: gradeLevel ? parseInt(gradeLevel) : undefined,
      curriculum_type: curriculum.toUpperCase() === "8-4-4" ? "8-4-4" : "CBE",
    });
  };

  const handleChangePassword = () => {
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deleted",
      description: "Your account has been permanently deleted.",
      variant: "destructive",
    });
  };

  // Dynamic grade options based on curriculum
  const getGradeOptions = () => {
    if (curriculum === "8-4-4") {
      return [
        { value: "3", label: "Form 3" },
        { value: "4", label: "Form 4" }
      ];
    } else {
      // CBE grades
      return [
        { value: "7", label: "Grade 7" },
        { value: "8", label: "Grade 8" },
        { value: "9", label: "Grade 9" },
        { value: "10", label: "Grade 10" },
        { value: "11", label: "Grade 11" },
        { value: "12", label: "Grade 12" }
      ];
    }
  };

  // Handle curriculum change - reset grade level when curriculum changes
  const handleCurriculumChange = (value: string) => {
    setCurriculum(value);
    setGradeLevel(""); // Reset grade level when curriculum changes
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Link className="w-4 h-4 mr-2" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and academic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">School Name</label>
                  <Input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade Level</label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getGradeOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Curriculum</label>
                    <Select value={curriculum} onValueChange={handleCurriculumChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cbe">CBE</SelectItem>
                        <SelectItem value="8-4-4">8-4-4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  className="w-full"
                  disabled={updateProfileMutation.isPending || isLoading}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <ConnectionsSection userType={user?.user_type} />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive updates and reminders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Email Notifications</label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Report Analysis</label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when report analysis is complete
                    </p>
                  </div>
                  <Switch
                    checked={reportNotifications}
                    onCheckedChange={setReportNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Insights & Tips</label>
                    <p className="text-sm text-muted-foreground">
                      Receive AI-generated learning insights
                    </p>
                  </div>
                  <Switch
                    checked={insightNotifications}
                    onCheckedChange={setInsightNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Study Reminders</label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders for scheduled study sessions
                    </p>
                  </div>
                  <Switch
                    checked={studyReminders}
                    onCheckedChange={setStudyReminders}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <PasswordInput />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <PasswordInput />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <PasswordInput />
                </div>

                <Button onClick={handleChangePassword} className="w-full">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers including reports,
                        flashcards, study plans, and career recommendations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
