import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, X, Eye, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { flashcardsApi } from "@/lib/api";

const FlashcardReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  interface Flashcard {
    card_id?: number;
    flashcard_id?: number;
    mastery_level?: number;
    question?: string;
    answer?: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
    times_reviewed?: number;
    times_correct?: number;
  }

  const [card, setCard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadCard = useCallback(async () => {
    if (!id) {
      toast({
        title: "Card ID required",
        description: "No flashcard ID provided",
        variant: "destructive",
      });
      navigate("/flashcards");
      return;
    }

    try {
      setLoading(true);
      const cards = await flashcardsApi.list() as Flashcard[];
      const foundCard = cards.find((c: Flashcard) => (c.card_id || c.flashcard_id) === parseInt(id));
      if (foundCard) {
        setCard(foundCard);
        setProgress(foundCard.mastery_level || 0);
      } else {
        toast({
          title: "Card not found",
          description: "The requested flashcard could not be found",
          variant: "destructive",
        });
        navigate("/flashcards");
      }
    } catch (error) {
      toast({
        title: "Error loading card",
        description: error instanceof Error ? error.message : "Failed to load flashcard",
        variant: "destructive",
      });
      navigate("/flashcards");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCorrect = async () => {
    if (!id || !card) return;
    
    try {
      await flashcardsApi.review(parseInt(id), { correct: true });
      try {
        const cards = await flashcardsApi.list() as Flashcard[];
        const foundCard = cards.find((c: Flashcard) => (c.card_id || c.flashcard_id) === parseInt(id));
        if (foundCard) {
          setProgress(foundCard.mastery_level || 0);
        }
      } catch {}
      toast({
        title: "Great job!",
        description: "Your answer was marked as correct.",
      });
      // Navigate to next card or back to list
      navigate("/flashcards");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const handleIncorrect = async () => {
    if (!id || !card) return;
    
    try {
      await flashcardsApi.review(parseInt(id), { correct: false });
      try {
        const cards = await flashcardsApi.list() as Flashcard[];
        const foundCard = cards.find((c: Flashcard) => (c.card_id || c.flashcard_id) === parseInt(id));
        if (foundCard) {
          setProgress(foundCard.mastery_level || 0);
        }
      } catch {}
      toast({
        title: "Keep practicing!",
        description: "This card will be reviewed again soon.",
        variant: "destructive",
      });
      // Navigate to next card or back to list
      navigate("/flashcards");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) {
      toast({
        title: "No answer provided",
        description: "Please type your answer first.",
        variant: "destructive",
      });
      return;
    }

    if (!id || !card) return;

    setIsEvaluating(true);

    try {
      const evaluation = await flashcardsApi.evaluate(parseInt(id), { user_answer: userAnswer });
      // If evaluation is expected to be a typed object, you can define an interface/type instead of 'any'
      setFeedback(
        (evaluation && typeof evaluation === "object"
          ? (evaluation as { feedback?: string; message?: string }).feedback || (evaluation as { feedback?: string; message?: string }).message
          : undefined
        ) || "Evaluation complete"
      );
      setShowAnswer(true);
    } catch (error) {
      toast({
        title: "Evaluation failed",
        description: error instanceof Error ? error.message : "Failed to evaluate answer",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!card) {
    return (
      <DashboardLayout>
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Card not found</h3>
            <Button onClick={() => navigate("/flashcards")}>Back to Flashcards</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/flashcards">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{card?.subject ?? "Flashcard"}</h1>
              <p className="text-sm text-muted-foreground">Mastery: {progress}%</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-lg font-bold">{progress}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} />

        {/* Question Card */}
        <Card className="border-2">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Question</p>
                <h2 className="text-2xl font-bold">{card.question}</h2>
              </div>

              {!showAnswer && (
                <Button onClick={handleShowAnswer} size="lg" className="w-full">
                  <Eye className="w-5 h-5 mr-2" />
                  Show Answer
                </Button>
              )}

              {showAnswer && (
                <div className="space-y-4">
                  <div className="bg-accent/10 p-6 rounded-lg border border-accent/20">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Answer</p>
                    <p className="text-foreground leading-relaxed">{card.answer}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleCorrect}
                      className="flex-1 bg-success hover:bg-success/90"
                      size="lg"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      I Got It Right
                    </Button>
                    <Button
                      onClick={handleIncorrect}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                    >
                      <X className="w-5 h-5 mr-2" />
                      I Got It Wrong
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Answer Section */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Type Your Answer (Optional)
                </label>
                <Textarea
                  placeholder="Write your answer here for AI evaluation..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  rows={4}
                  disabled={showAnswer}
                />
              </div>

              {!showAnswer && userAnswer && (
                <Button
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="w-full"
                  size="lg"
                >
                  {isEvaluating ? (
                    <>Evaluating...</>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Evaluate My Answer
                    </>
                  )}
                </Button>
              )}

              {feedback && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2">AI Feedback</p>
                  <p className="text-sm text-foreground leading-relaxed">{feedback}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/flashcards")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Flashcards
          </Button>
          {showAnswer && (
            <Button onClick={() => navigate("/flashcards")}>
              Done
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FlashcardReview;
