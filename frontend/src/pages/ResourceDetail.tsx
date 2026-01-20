import DashboardLayout from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resourcesApi, Resource } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Star, StarOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResourceDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resource, setResource] = useState<Resource | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Corrected API method call: resourcesApi.get instead of resourcesApi.detail
      const res = await resourcesApi.get(Number(id));
      setResource(res);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load resource", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleFavorite = async () => {
    if (!resource) return;
    try {
      if (resource.is_favorite) {
        await resourcesApi.unfavorite(resource.resource_id);
        toast({ title: "Removed from favorites" });
      } else {
        await resourcesApi.favorite(resource.resource_id);
        toast({ title: "Added to favorites" });
      }
      load();
    } catch {
      toast({ title: "Failed to update favorite", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : resource ? (
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle>{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{resource.subject}</Badge>
                {resource.grade_level && <Badge variant="outline">Grade {resource.grade_level}</Badge>}
                <Badge variant="secondary">{resource.type?.toUpperCase?.() || resource.type}</Badge>
                {Array.isArray(resource.tags) && resource.tags.map((t: string) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                {resource.content_url && (
                  <Button asChild>
                    <a href={resource.content_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Resource
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={toggleFavorite}>
                  {resource.is_favorite ? <Star className="w-4 h-4 text-yellow-500 mr-2" /> : <StarOff className="w-4 h-4 mr-2" />}
                  {resource.is_favorite ? "Unfavorite" : "Favorite"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-muted-foreground">Resource not found</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResourceDetail;

