import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Star, Share2, BookOpen, TrendingUp, Briefcase, Loader2, AlertCircle } from "lucide-react";
import { careerApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CareerDetail {
  recommendation_id: number;
  career_path: string;
  career_description?: string;
  suitable_universities?: string[];
  course_requirements?: Record<string, string>;
  match_score: number;
  reasoning?: string;
  job_market_outlook?: string;
  is_favorite: boolean;
}

const CareerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [career, setCareer] = useState<CareerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCareerDetail = async () => {
      if (!id) {
        toast({
          title: "Career ID required",
          description: "No career ID provided",
          variant: "destructive",
        });
        navigate("/career");
        return;
      }

      try {
        setLoading(true);
        const data = await careerApi.getDetails(parseInt(id));
        setCareer(data as CareerDetail);
      } catch (error) {
        toast({
          title: "Error loading career details",
          description: error instanceof Error ? error.message : "Failed to load career information",
          variant: "destructive",
        });
        navigate("/career");
      } finally {
        setLoading(false);
      }
    };

    loadCareerDetail();
  }, [id, navigate, toast]);

  // Convert reasoning string to array of bullet points
  const reasoningArray = career?.reasoning
    ? career.reasoning
        .split(/[.\n]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
    : [];

  // Transform universities from string array to objects
  const universities = career?.suitable_universities?.map((uniName, index) => {
    const requirements = career.course_requirements
      ? Object.entries(career.course_requirements)
          .map(([subject, grade]) => `${subject} (${grade})`)
          .join(", ")
      : "Check university website for requirements";

    return {
      name: uniName,
      course: `${career.career_path} related program`,
      minGrade: career.course_requirements
        ? Object.values(career.course_requirements)[0] || "C+"
        : "C+",
      requirements: requirements,
    };
  }) || [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!career) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Career Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested career information could not be loaded.
              </p>
              <Link to="/career">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Careers
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getMatchScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent match for your profile";
    if (score >= 70) return "Good match for your profile";
    return "Moderate match for your profile";
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/career">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{career.career_path}</h1>
              <p className="text-muted-foreground mt-1">
                Detailed career information and requirements
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  if (career.is_favorite) {
                    await careerApi.unfavorite(career.recommendation_id);
                    setCareer({ ...career, is_favorite: false });
                    toast({ title: "Removed", description: "Career removed from favorites" });
                  } else {
                    await careerApi.favorite(career.recommendation_id);
                    setCareer({ ...career, is_favorite: true });
                    toast({ title: "Saved", description: "Career saved to favorites" });
                  }
                } catch (e) {
                  toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to save favorite", variant: "destructive" });
                }
              }}
            >
              <Star className={`w-4 h-4 mr-2 ${career.is_favorite ? "fill-yellow-400" : ""}`} />
              {career.is_favorite ? "Remove Favorite" : "Save Favorite"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await careerApi.share(career.recommendation_id);
                  const url = (res as any)?.data?.share_url || window.location.origin + `/career/${career.recommendation_id}`;
                  await navigator.clipboard.writeText(window.location.origin + url.replace(/^\//, "/"));
                  toast({ title: "Link copied", description: "Career share link copied to clipboard" });
                } catch (e) {
                  toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to generate share link", variant: "destructive" });
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Match Score Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Your Match Score</p>
                <p className="text-4xl font-bold text-success">{Math.round(career.match_score)}%</p>
                <p className="text-sm text-muted-foreground">{getMatchScoreLabel(career.match_score)}</p>
              </div>
              <Progress value={career.match_score} className="w-1/2" />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              About This Career
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">
              {career.career_description || "No description available for this career."}
            </p>
          </CardContent>
        </Card>

        {/* Why Recommended */}
        {reasoningArray.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Why This Career Matches You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {reasoningArray.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Badge className="mt-1">✓</Badge>
                    <span className="text-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Job Market Outlook */}
        {career.job_market_outlook && (
          <Card>
            <CardHeader>
              <CardTitle>Job Market Outlook in Kenya</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{career.job_market_outlook}</p>
            </CardContent>
          </Card>
        )}

        {/* University Requirements */}
        {universities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                University Programs & Requirements
              </CardTitle>
              <CardDescription>
                Kenyan universities offering relevant programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Min. Grade</TableHead>
                    <TableHead>Subject Requirements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universities.map((uni, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{uni.name}</TableCell>
                      <TableCell>{uni.course}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{uni.minGrade}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{uni.requirements}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link to="/study-plans/generate" className="flex-1">
            <Button className="w-full" size="lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Generate Study Plan
            </Button>
          </Link>
          <Link to="/career/quiz" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Explore More Careers
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CareerDetail;
