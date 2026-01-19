import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { flashcardsApi } from "@/lib/api";

const GenerateFlashcards = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState([10]);
  const [difficulty, setDifficulty] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCards, setPreviewCards] = useState<any[]>([]);

  const handleGenerate = async () => {
    if (!subject) {
      toast({
        title: "Subject required",
        description: "Please select a subject",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const cards = await flashcardsApi.generate({
        subject,
        topic: topic || subject,
        count: cardCount[0],
      });

      // Ensure cards is an array before mapping
      const cardsArray = Array.isArray(cards) ? cards : (cards as any).cards || [];

      const previewCards = cardsArray.map((card: any, i: number) => ({
        id: card.card_id || card.flashcard_id || `preview-${i}`,
        question: card.question,
        answer: card.answer,
        selected: true,
      }));
      
      setPreviewCards(previewCards);
      
      toast({
        title: "Flashcards Generated!",
        description: `Successfully generated ${previewCards.length} flashcards.`,
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate flashcards",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const selectedCards = previewCards.filter(card => card.selected);
    
    toast({
      title: "Flashcards Saved!",
      description: `${selectedCards.length} flashcards have been saved to your collection.`,
    });
    
    setTimeout(() => {
      navigate("/flashcards");
    }, 1000);
  };

  const toggleCardSelection = (id: string) => {
    setPreviewCards(cards =>
      cards.map(card =>
        card.id === id ? { ...card, selected: !card.selected } : card
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/flashcards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate Flashcards</h1>
            <p className="text-muted-foreground mt-1">
              Let AI create personalized flashcards for you
            </p>
          </div>
        </div>

        {/* Generation Form */}
        {previewCards.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Flashcard Settings
              </CardTitle>
              <CardDescription>
                Configure your flashcard generation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject *</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="kiswahili">Kiswahili</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="geography">Geography</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic (Optional)</label>
                <Input
                  placeholder="e.g., Quadratic Equations, Cell Division"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to generate cards covering the entire subject
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Number of Cards: {cardCount[0]}
                </label>
                <Slider
                  value={cardCount}
                  onValueChange={setCardCount}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!subject || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Preview Cards */}
        {previewCards.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Preview & Select</h2>
                <p className="text-muted-foreground">
                  {previewCards.filter(c => c.selected).length} of {previewCards.length} cards selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewCards([])}>
                  Regenerate
                </Button>
                <Button onClick={handleSave}>
                  Save Selected
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {previewCards.map((card) => (
                <Card
                  key={card.id}
                  className={`cursor-pointer transition-all ${
                    card.selected ? "border-primary" : "opacity-60"
                  }`}
                  onClick={() => toggleCardSelection(card.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        card.selected ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {card.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <Badge variant="outline" className="mb-2">{subject}</Badge>
                          <p className="font-medium">{card.question}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{card.answer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GenerateFlashcards;
