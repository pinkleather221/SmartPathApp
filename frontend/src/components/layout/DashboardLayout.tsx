import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Brain,
  Compass,
  Calendar,
  Lightbulb,
  Settings,
  GraduationCap,
  Menu,
  Calculator,
  Bot,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/api";
import { ModeToggle } from "@/components/mode-toggle";

// Navigation items by user type
const studentNavigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Performance", href: "/performance", icon: TrendingUp },
  { name: "Flashcards", href: "/flashcards", icon: Brain },
  { name: "Career", href: "/career", icon: Compass },
  { name: "Study Plans", href: "/study-plans", icon: Calendar },
  { name: "Math Solver", href: "/math-solver", icon: Calculator },
  { name: "AI Tutor", href: "/ai-tutor", icon: Bot },
  { name: "Resources", href: "/resources", icon: BookOpen },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Settings", href: "/settings", icon: Settings },
];

const teacherNavigation = [
  // { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  { name: "My Students", href: "/teacher/dashboard", icon: GraduationCap },
  { name: "Settings", href: "/settings", icon: Settings },
];

const parentNavigation = [
  // { name: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { name: "My Child", href: "/parent/dashboard", icon: GraduationCap },
  { name: "Settings", href: "/settings", icon: Settings },
];

const getNavigation = (userType?: string) => {
  switch (userType) {
    case "teacher":
      return teacherNavigation;
    case "parent":
      return parentNavigation;
    default:
      return studentNavigation;
  }
};

interface DashboardLayoutProps {
  children: ReactNode;
}

const Sidebar = ({ userType }: { userType?: string }) => {
  const location = useLocation();
  const navigation = getNavigation(userType);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">SmartPath</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== "/settings" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

/**
 * Extract initials from a full name
 */
const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  // Fetch current user data
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: 1,
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userInitials = user ? getInitials(user.full_name) : "U";
  const userName = user?.full_name || "User";
  const userEmail = user?.email || "";

  const userType = user?.user_type;

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border">
        <Sidebar userType={userType} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-8">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar userType={userType} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">SmartPath</span>
          </div>

          <div className="flex-1" />

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={getImageUrl(user?.profile_picture)} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {isLoading ? "..." : userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
