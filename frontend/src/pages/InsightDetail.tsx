import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share2, Check, Lightbulb, Loader2 } from "lucide-react";
import { insightsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface InsightDetail {
  insight_id: number;
  insight_type: string;
  title: string;
  content: string;
  generated_at: string;
  is_read: boolean;
  metadata_json?: {
    subject?: string;
    relatedReport?: string;
    confidence?: number;
    recommendations?: string[];
    strengths?: string[];
    weaknesses?: string[];
    next_steps?: string[];
    source?: string;
    type?: string;
  };
}

const InsightDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const insightId = id ? parseInt(id, 10) : null;

  // Fetch insight by ID
  const { data: insight, isLoading, isError, error } = useQuery({
    queryKey: ["insight", insightId],
    queryFn: async (): Promise<InsightDetail> => {
      if (!insightId) throw new Error("Invalid insight ID");
      const result = await insightsApi.getById(insightId) as InsightDetail;
      return result;
    },
    enabled: !!insightId,
  });

  // Fetch related insights
  const { data: allInsights } = useQuery({
    queryKey: ["insights"],
    queryFn: async (): Promise<InsightDetail[]> => {
      const result = await insightsApi.getAcademicAnalysis() as InsightDetail[];
      return result;
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: () => {
      if (!insightId) throw new Error("Invalid insight ID");
      return insightsApi.markAsRead(insightId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insight", insightId] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast({
        title: "Insight marked as read",
        description: "This insight has been marked as read.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Failed to mark insight as read",
        variant: "destructive",
      });
    },
  });

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

  const getTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case "feedback":
        return "Feedback";
      case "tips":
      case "tip":
        return "Tips";
      case "analysis":
        return "Analysis";
      case "recommendations":
      case "recommendation":
        return "Recommendation";
      case "motivation":
        return "Motivation";
      default:
        return "Insight";
    }
  };

  // Get related insights (same type, different ID)
  const relatedInsights = allInsights?.filter(
    (i) => i.insight_id !== insightId && i.insight_type === insight?.insight_type
  ).slice(0, 3) || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading insight...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !insight) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          <Link to="/insights">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Insight not found</h3>
              <p className="text-muted-foreground mb-4">
                {error?.message || "The insight you're looking for doesn't exist."}
              </p>
              <Button onClick={() => navigate("/insights")}>Back to Insights</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const metadata = insight.metadata_json || {};
  const recommendations = metadata.recommendations || 
                         (metadata.next_steps ? metadata.next_steps : []);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link to="/insights">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getTypeColor(insight.insight_type)} variant="outline">
                  {getTypeLabel(insight.insight_type)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(insight.generated_at).toLocaleString()}
                </span>
                {!insight.is_read && (
                  <Badge className="bg-primary/20 text-primary">New</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                {insight.title || "Learning Insight"}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            {!insight.is_read && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => markAsReadMutation.mutate()}
                disabled={markAsReadMutation.isPending}
              >
                {markAsReadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Mark Read
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Insight Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-foreground leading-relaxed text-lg whitespace-pre-line">
              {insight.content}
            </p>

            {(metadata.subject || metadata.relatedReport || metadata.confidence) && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-3">
                  {metadata.subject && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                      <p className="font-semibold">{metadata.subject}</p>
                    </div>
                  )}
                  {metadata.relatedReport && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Related Report</p>
                      <p className="font-semibold">{metadata.relatedReport}</p>
                    </div>
                  )}
                  {metadata.confidence && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Confidence</p>
                      <p className="font-semibold text-success">
                        {metadata.confidence}%
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {metadata.strengths && metadata.strengths.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Strengths</p>
                  <ul className="list-disc list-inside space-y-1">
                    {metadata.strengths.map((strength, idx) => (
                      <li key={idx} className="text-foreground">{strength}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {metadata.weaknesses && metadata.weaknesses.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Areas for Improvement</p>
                  <ul className="list-disc list-inside space-y-1">
                    {metadata.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-foreground">{weakness}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>
                Steps you can take based on this insight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Badge className="mt-1 bg-primary/20 text-primary">
                      {index + 1}
                    </Badge>
                    <span className="text-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Related Insights */}
        {relatedInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Related Insights</CardTitle>
              <CardDescription>
                You might also be interested in these
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {relatedInsights.map((related) => (
                <Link key={related.insight_id} to={`/insights/${related.insight_id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge className={getTypeColor(related.insight_type)} variant="outline">
                        {getTypeLabel(related.insight_type)}
                      </Badge>
                      <span className="font-medium">{related.title || "Learning Insight"}</span>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InsightDetail;
