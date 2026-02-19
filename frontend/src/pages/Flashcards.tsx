import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Eye, Trash2, Calendar, Loader2, AlertCircle } from "lucide-react";
import { flashcardsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Flashcards = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const data = await flashcardsApi.list();
      setFlashcards(data || []);
    } catch (error) {
      toast({
        title: "Error loading flashcards",
        description: error instanceof Error ? error.message : "Failed to load flashcards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await flashcardsApi.delete(id);
      toast({
        title: "Flashcard deleted",
        description: "The flashcard has been deleted successfully.",
        duration: 3000,
      });
      loadFlashcards();
    } catch (error) {
      toast({
        title: "Error deleting flashcard",
        description: error instanceof Error ? error.message : "Failed to delete flashcard",
        variant: "destructive",
      });
    }
  };

  const filteredFlashcards = flashcards.filter((card) => {
    const matchesSearch = card.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "all" || card.subject?.toLowerCase() === filterSubject.toLowerCase();
    const matchesDifficulty = filterDifficulty === "all" || card.difficulty?.toLowerCase() === filterDifficulty.toLowerCase();
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-success/10 text-success";
      case "medium":
        return "bg-warning/10 text-warning";
      case "hard":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return "bg-success";
    if (mastery >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flashcards</h1>
            <p className="text-muted-foreground mt-1">
              Study smarter with AI-generated flashcards
            </p>
          </div>
          <Link to="/flashcards/generate">
            <Button size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Generate New
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Cards</CardDescription>
              <CardTitle className="text-3xl">{loading ? "..." : flashcards.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Mastery</CardDescription>
              <CardTitle className="text-3xl text-success">
                {loading ? "..." : flashcards.length > 0
                  ? Math.round(flashcards.reduce((sum, c) => sum + (c.mastery_level || 0), 0) / flashcards.length) + "%"
                  : "0%"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reviews</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "..." : flashcards.reduce((sum, c) => sum + (c.review_count || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subjects</CardDescription>
              <CardTitle className="text-3xl">
                {loading ? "..." : new Set(flashcards.map((c) => c.subject)).size}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search flashcards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Flashcards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFlashcards.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <h3 className="text-lg font-semibold">No flashcards yet</h3>
              <p className="text-muted-foreground">
                Generate your first flashcards to get started
              </p>
              <Link to="/flashcards/generate">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Flashcards
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFlashcards.map((card) => (
              <Card key={card.card_id || card.flashcard_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">{card.subject}</Badge>
                    <Badge className={getDifficultyColor(card.difficulty || "medium")}>
                      {card.difficulty || "Medium"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base line-clamp-2">
                    {card.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mastery Level</span>
                      <span className="font-medium">{card.mastery_level || 0}%</span>
                    </div>
                    <Progress value={card.mastery_level || 0} className={getMasteryColor(card.mastery_level || 0)} />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{card.review_count || 0} reviews</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link to={`/flashcards/review/${card.card_id || card.flashcard_id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this flashcard? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(card.card_id || card.flashcard_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Flashcards;
