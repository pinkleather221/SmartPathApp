import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileQuestion, RefreshCw, Star, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { careerApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Career = () => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set());

  const favoritingIdsLookup = useMemo(() => favoritingIds, [favoritingIds]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await careerApi.getRecommendations();
      setRecommendations(data || []);
    } catch (error) {
      toast({
        title: "Error loading recommendations",
        description: error instanceof Error ? error.message : "Failed to load career recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-muted-foreground";
  };

  const handleToggleFavorite = async (recommendationId: number, isFavorite: boolean) => {
    if (favoritingIdsLookup.has(recommendationId)) return;
    setFavoritingIds((prev) => new Set([...prev, recommendationId]));
    try {
      if (isFavorite) {
        await careerApi.unfavorite(recommendationId);
      } else {
        await careerApi.favorite(recommendationId);
      }
      setRecommendations((prev) =>
        prev.map((r) =>
          (r.recommendation_id || r.career_id) === recommendationId ? { ...r, is_favorite: !isFavorite } : r
        )
      );
      toast({
        title: isFavorite ? "Removed" : "Saved",
        description: isFavorite ? "Career removed from favorites" : "Career saved to favorites",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : (isFavorite ? "Failed to remove favorite" : "Failed to save favorite"),
        variant: "destructive",
      });
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Career Recommendations</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered career suggestions based on your performance
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/career/quiz">
              <Button size="lg">
                <FileQuestion className="w-5 h-5 mr-2" />
                Take Career Quiz
              </Button>
            </Link>
            <Button variant="outline" size="lg" onClick={loadRecommendations} disabled={loading}>
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Your Top Career Matches</h3>
                <p className="text-sm text-muted-foreground">
                  These recommendations are based on your academic performance, strong subjects, and areas of interest. 
                  Take the career quiz to get more personalized suggestions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : recommendations.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <h3 className="text-lg font-semibold">No recommendations yet</h3>
              <p className="text-muted-foreground">
                Upload your reports and take the career quiz to get personalized recommendations
              </p>
              <Link to="/career/quiz">
                <Button>
                  <FileQuestion className="w-4 h-4 mr-2" />
                  Take Career Quiz
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <Card key={rec.recommendation_id || rec.career_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{rec.career_path || rec.career_name || rec.career || "Career Recommendation"}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={favoritingIdsLookup.has(rec.recommendation_id || rec.career_id)}
                      onClick={() => handleToggleFavorite(rec.recommendation_id || rec.career_id, !!rec.is_favorite)}
                    >
                      <Star className={`w-4 h-4 ${rec.is_favorite ? "fill-yellow-400" : ""}`} />
                    </Button>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {rec.career_description || rec.description || ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Match Score</span>
                      <span className={`font-bold text-lg ${getMatchColor(rec.match_score || 0)}`}>
                        {Math.round(rec.match_score || 0)}%
                      </span>
                    </div>
                    <Progress value={rec.match_score || 0} />
                  </div>

                  {rec.reasoning && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Why recommended:</p>
                      <p className="text-sm text-foreground">{rec.reasoning}</p>
                    </div>
                  )}

                  {rec.suitable_universities && Array.isArray(rec.suitable_universities) && rec.suitable_universities.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Top Universities:</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.suitable_universities.slice(0, 2).map((uni: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {typeof uni === 'string' ? uni.trim() : uni}
                          </Badge>
                        ))}
                        {rec.suitable_universities.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rec.suitable_universities.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Link to={`/career/${rec.recommendation_id || rec.career_id}`}>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Career;
