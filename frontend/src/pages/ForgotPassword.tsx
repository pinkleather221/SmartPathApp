import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModeToggle } from "@/components/mode-toggle";

import { authApi } from "@/lib/api";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setEmailSent(true);
      toast({
        title: "Reset link sent!",
        description: "If an account exists, you will receive password reset instructions.",
      });
    } catch (error) {
        // We don't want to reveal if email exists, so we might show same success message or generic error
        // But for UX, if it's a network error, we show it.
        toast({
            title: "Request failed",
            description: "Please try again later.",
            variant: "destructive"
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
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              {emailSent 
                ? "We've sent you a password reset link"
                : "Enter your email to receive reset instructions"}
            </CardDescription>
          </CardHeader>
          {!emailSent ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send you a link to reset your password
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
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
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Check your email at <strong className="text-foreground">{email}</strong> for 
                    instructions to reset your password.
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Didn't receive the email? Check your spam folder or try again.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full h-11"
                >
                  Try Different Email
                </Button>
                <Link to="/login" className="w-full">
                  <Button variant="ghost" className="w-full h-11">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
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

export default ForgotPassword;
