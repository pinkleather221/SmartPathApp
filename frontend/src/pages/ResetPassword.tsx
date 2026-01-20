import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModeToggle } from "@/components/mode-toggle";
import { authApi } from "@/lib/api";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
        toast({
            title: "Invalid Link",
            description: "Missing reset token. Please request a new link.",
            variant: "destructive"
        });
        navigate("/forgot-password");
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        toast({
            title: "Passwords do not match",
            variant: "destructive"
        });
        return;
    }
    
    if (password.length < 6) {
        toast({
            title: "Password too short",
            description: "Must be at least 6 characters",
            variant: "destructive"
        });
        return;
    }

    setIsLoading(true);

    try {
      if (!token) return;
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast({
        title: "Success",
        description: "Your password has been reset.",
      });
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Invalid or expired token. Please request a new link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SmartPath</h1>
          <p className="text-muted-foreground mt-2">AI-Powered Learning Platform</p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription>
              {success 
                ? "Your password has been updated successfully"
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          {!success ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                <Link to="/login" className="w-full">
                  <Button variant="ghost" className="w-full h-11">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </CardFooter>
            </form>
          ) : (
            <>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can now use your new password to log in to your account.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/login" className="w-full">
                  <Button className="w-full h-11">
                    Go to Login
                  </Button>
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
