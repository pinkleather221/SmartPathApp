import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Star, StarOff, SearchX } from "lucide-react";
import { resourcesApi, Resource, PaginatedResourcesResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";

// Import the Empty State components
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const ResourceLibrary = () => {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string | undefined>(undefined);
  const [grade, setGrade] = useState<number | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Fetch current user data
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: 1,
  });

  // Dynamic grade options based on user's curriculum
  const getGradeOptions = () => {
    if (user?.curriculum_type?.toUpperCase() === "8-4-4") {
      return [
        { value: "3", label: "Form 3" },
        { value: "4", label: "Form 4" }
      ];
    } else {
      // CBE grades (default)
      return [
        { value: "7", label: "Grade 7" },
        { value: "8", label: "Grade 8" },
        { value: "9", label: "Grade 9" },
        { value: "10", label: "Grade 10" },
        { value: "11", label: "Grade 11" },
        { value: "12", label: "Grade 12" }
      ];
    }
  };

  const gradeOptions = getGradeOptions();

  // Dynamic subject options based on user's curriculum
  const getSubjectOptions = () => {
    if (user?.curriculum_type?.toUpperCase() === "8-4-4") {
      // 8-4-4 KCSE Subjects for Form 3-4
      return [
        // Compulsory
        { value: "Mathematics", label: "Mathematics" },
        { value: "English", label: "English" },
        { value: "Kiswahili", label: "Kiswahili" },
        // Sciences
        { value: "Physics", label: "Physics" },
        { value: "Chemistry", label: "Chemistry" },
        { value: "Biology", label: "Biology" },
        // Humanities
        { value: "History", label: "History & Government" },
        { value: "Geography", label: "Geography" },
        { value: "CRE", label: "CRE" },
        { value: "IRE", label: "IRE" },
        { value: "HRE", label: "HRE" },
        // Technical/Applied
        { value: "Business Studies", label: "Business Studies" },
        { value: "Agriculture", label: "Agriculture" },
        { value: "Computer Studies", label: "Computer Studies" },
        { value: "Home Science", label: "Home Science" },
        // Languages
        { value: "French", label: "French" },
        { value: "German", label: "German" },
        { value: "Arabic", label: "Arabic" },
        // Creative
        { value: "Music", label: "Music" },
        { value: "Art & Design", label: "Art & Design" },
      ];
    } else {
      // CBE Subjects for Junior (7-9) and Senior (10-12) Secondary
      return [
        // Core
        { value: "Mathematics", label: "Mathematics" },
        { value: "English", label: "English" },
        { value: "Kiswahili", label: "Kiswahili" },
        { value: "Integrated Science", label: "Integrated Science" },
        { value: "Social Studies", label: "Social Studies" },
        // Sciences
        { value: "Physics", label: "Physics" },
        { value: "Chemistry", label: "Chemistry" },
        { value: "Biology", label: "Biology" },
        // Humanities
        { value: "History", label: "History" },
        { value: "Geography", label: "Geography" },
        { value: "CRE", label: "CRE" },
        { value: "IRE", label: "IRE" },
        // Applied/Technical
        { value: "Business Studies", label: "Business Studies" },
        { value: "Agriculture", label: "Agriculture" },
        { value: "Computer Science", label: "Computer Science" },
        { value: "Home Science", label: "Home Science" },
        // Languages
        { value: "French", label: "French" },
        { value: "German", label: "German" },
        { value: "Arabic", label: "Arabic" },
        { value: "Mandarin", label: "Mandarin" },
        // Creative/Practical
        { value: "Music", label: "Music" },
        { value: "Art & Design", label: "Art & Design" },
        { value: "Physical Education", label: "Physical Education" },
      ];
    }
  };

  const subjectOptions = getSubjectOptions();

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await resourcesApi.list({
        q,
        subject,
        grade: grade,
        type,
        page: page,
        pageSize: pageSize
      });
      // The API returns a PaginatedResourcesResponse with items, total, page, page_size, total_pages
      if (res && res.items) {
        setItems(res.items);
        setTotal(res.total);
      } else {
        // Fallback if backend structure differs
        setItems([]);
        setTotal(0);
      }
    } catch (e) {
      toast({ title: "Failed to load resources", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Helper to reset all filters
  const resetFilters = () => {
    setQ("");
    setSubject(undefined);
    setGrade(undefined);
    setType(undefined);
    setPage(1);
  };

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, subject, grade, type, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const toggleFavorite = async (id: number, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await resourcesApi.unfavorite(id);
        toast({ title: "Removed from favorites" });
      } else {
        await resourcesApi.favorite(id);
        toast({ title: "Added to favorites" });
      }
      fetchResources();
    } catch {
      toast({ title: "Failed to update favorite", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Digital Resource Library</h1>
            <p className="text-muted-foreground">Curated educational content: notes, PDFs, videos, toolkits</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search resources..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="md:col-span-2"
          />

          <Select value={subject || "all"} onValueChange={(v) => { setSubject(v === "all" ? undefined : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? undefined : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="toolkit">Toolkit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={grade ? String(grade) : "all"} onValueChange={(v) => { setGrade(v === "all" ? undefined : Number(v)); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={user?.curriculum_type?.toUpperCase() === "8-4-4" ? "Form" : "Grade"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{user?.curriculum_type?.toUpperCase() === "8-4-4" ? "All Forms" : "All Grades"}</SelectItem>
              {gradeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading resources...
          </div>
        ) : items.length > 0 ? (
          /* Grid View when items exist */
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((r) => (
              <Card key={r.resource_id} className="overflow-hidden bg-card border border-border">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{r.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{r.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{r.subject}</Badge>
                    {r.grade_level && <Badge variant="outline">{user?.curriculum_type?.toUpperCase() === "8-4-4" ? `Form ${r.grade_level}` : `Grade ${r.grade_level}`}</Badge>}
                    <Badge variant="secondary">{r.type?.toUpperCase?.() || r.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/resources/${r.resource_id}`}>View</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleFavorite(r.resource_id, r.is_favorite)}>
                      {r.is_favorite ? <Star className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State when items.length === 0 */
          <Empty className="border border-dashed py-20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX className="w-10 h-10 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No resources found</EmptyTitle>
              <EmptyDescription>
                We couldn't find any resources matching your current filters. Try adjusting your search or filters.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear All Filters
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {/* Pagination Section - Only show if items exist */}
        {items.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages} • {total} items
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResourceLibrary;