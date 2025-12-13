import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";

/**
 * Component that redirects users to the appropriate dashboard based on their role.
 */
const RoleBasedDashboard = () => {
  const navigate = useNavigate();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: 1,
  });

  useEffect(() => {
    if (user) {
      switch (user.user_type) {
        case "teacher":
          navigate("/teacher/dashboard", { replace: true });
          break;
        case "parent":
          navigate("/parent/dashboard", { replace: true });
          break;
        case "student":
        default:
          navigate("/student/dashboard", { replace: true });
          break;
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      navigate("/login", { replace: true });
    }
  }, [error, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
};

export default RoleBasedDashboard;
