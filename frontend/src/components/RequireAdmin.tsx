import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const profile = await authApi.getProfile();
        // Check both "admin" and "teacher" (if teachers are allowed) 
        // or just strict "admin". Based on your request, strict admin.
        if (profile.user_type === "admin") {
          setIsAdmin(true);
        } else {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this page.",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error) {
        navigate("/login");
      }
    };
    checkAdmin();
  }, [navigate, toast]);

  if (isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
};

export default RequireAdmin;
