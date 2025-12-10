import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, MessageSquare, TrendingUp, Target, Heart, Eye, Loader2 } from "lucide-react";
import { insightsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Insights = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("all");
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await insightsApi.getAcademicAnalysis();
      // Ensure data is an array
      const insightsArray = Array.isArray(data) ? data : [];
      setInsights(insightsArray);
      
      // If no insights, try to generate feedback
      if (insightsArray.length === 0) {
        try {
          await insightsApi.getFeedback(); // This will generate insights
          // Reload insights after generation
          const newData = await insightsApi.getAcademicAnalysis();
          setInsights(Array.isArray(newData) ? newData : []);
        } catch (genError) {
          // Silently fail - insights will be generated when reports are uploaded
          console.log("No insights available yet. Upload a report to generate insights.");
        }
      }
    } catch (error) {
      toast({
        title: "Error loading insights",
        description: error instanceof Error ? error.message : "Failed to load insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "feedback":
        return "bg-primary/10 text-primary";
      case "tips":
      case "tip":
        return "bg-accent/10 text-accent";
      case "analysis":
        return "bg-success/10 text-success";
      case "recommendations":
      case "recommendation":
        return "bg-warning/10 text-warning";
      case "motivation":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredInsights = selectedTab === "all" 
    ? insights 
    : insights.filter(i => i.insight_type?.toLowerCase() === selectedTab);

  const unreadCount = insights.filter(i => !i.is_read).length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Insights</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered feedback and learning tips
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="outline" className="w-fit">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Insights</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : insights.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Week</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "..." : insights.filter(i => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(i.generated_at) >= weekAgo;
                }).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unread</CardDescription>
              <CardTitle className="text-3xl text-primary">{loading ? "..." : unreadCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Action Items</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "..." : insights.filter(i => i.insight_type === "RECOMMENDATION" || i.insight_type === "TIPS").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Suggestions</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInsights.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Lightbulb className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
                  <p className="text-muted-foreground">
                    Check back later for personalized feedback and tips
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredInsights.map((insight) => {
                const getIcon = (type: string) => {
                  switch (type?.toLowerCase()) {
                    case "feedback": return MessageSquare;
                    case "tips": case "tip": return Lightbulb;
                    case "analysis": return TrendingUp;
                    case "recommendations": case "recommendation": return Target;
                    case "motivation": return Heart;
                    default: return Lightbulb;
                  }
                };
                const Icon = getIcon(insight.insight_type);
                
                return (
                  <Card 
                    key={insight.insight_id} 
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${!insight.is_read ? 'border-primary/50' : ''}`}
                    onClick={() => window.location.href = `/insights/${insight.insight_id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getTypeColor(insight.insight_type)} variant="outline">
                                {insight.insight_type || "Insight"}
                              </Badge>
                              {!insight.is_read && (
                                <Badge className="bg-primary/20 text-primary">New</Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg">{insight.title || "Learning Insight"}</CardTitle>
                            <CardDescription className="mt-1">
                              {new Date(insight.generated_at || insight.created_at).toLocaleString()}
                            </CardDescription>
                          </div>
                        </div>
                        <Link to={`/insights/${insight.insight_id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">{insight.content}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Insights;
