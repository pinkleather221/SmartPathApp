import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Star, StarOff, SearchX } from "lucide-react"; // Added SearchX icon
import { resourcesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await resourcesApi.list({ 
        q, 
        subject, 
        grade_level: grade, 
        type, 
        page, 
        page_size: pageSize 
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
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
            <p className="text-muted-foreground">Curated KCSE/CBC content: notes, PDFs, videos, toolkits</p>
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
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Kiswahili">Kiswahili</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
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
            <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="9">Grade 9</SelectItem>
              <SelectItem value="10">Grade 10</SelectItem>
              <SelectItem value="11">Grade 11</SelectItem>
              <SelectItem value="12">Grade 12</SelectItem>
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
                    {r.grade_level && <Badge variant="outline">Grade {r.grade_level}</Badge>}
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