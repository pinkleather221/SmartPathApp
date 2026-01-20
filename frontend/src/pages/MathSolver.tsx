import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Calculator, Upload, Image as ImageIcon, X, BookOpen, RefreshCw } from "lucide-react";
import { mathApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const MathSolver = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceProblems, setPracticeProblems] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSolve = async () => {
    if (!prompt && !file) {
      toast({
        title: "Input required",
        description: "Please enter a problem or upload an image.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSolution(null);
    setPracticeProblems([]); // Clear previous practice problems

    try {
      const result = await mathApi.solve(prompt, file || undefined);
      setSolution(result.solution);
      toast({
        title: "Success",
        description: "Problem solved!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to solve problem",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePractice = async () => {
      setPracticeLoading(true);
      try {
          // In a real app, we would extract topic from the solution context or let user specify.
          // For now, we'll infer from prompt or default to "General Math"
          const topic = prompt.length > 5 ? prompt.substring(0, 50) : "General Math";
          const res = await mathApi.generatePractice("Mathematics", topic, 10); // Defaulting to grade 10
          if (res.success) {
              setPracticeProblems(res.problems);
              toast({ title: "Practice Ready", description: "Generated 3 similar problems." });
          }
      } catch (e) {
          toast({ title: "Error", description: "Failed to generate practice problems.", variant: "destructive" });
      } finally {
          setPracticeLoading(false);
      }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Math Solver</h1>
            <p className="text-muted-foreground">
              Get step-by-step solutions for algebra, calculus, and more.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Your Problem</CardTitle>
              <CardDescription>
                Type your problem or upload a photo of it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Problem Text</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g. Solve for x: 2x + 5 = 15"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Image (Optional)</Label>
                {!previewUrl ? (
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Click to upload a photo of your math problem
                    </p>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img 
                      src={previewUrl} 
                      alt="Problem preview" 
                      className="w-full h-48 object-contain bg-muted/20" 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <Button 
                onClick={handleSolve} 
                className="w-full" 
                disabled={loading || (!prompt && !file)}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Solving...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Solve Problem
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Solution</CardTitle>
                <CardDescription>Step-by-step explanation</CardDescription>
              </div>
              {solution && (
                  <Button variant="outline" size="sm" onClick={generatePractice} disabled={practiceLoading}>
                      {practiceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Generate Practice
                  </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {solution ? (
                <>
                    <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                    >
                        {solution}
                    </ReactMarkdown>
                    </div>

                    {practiceProblems.length > 0 && (
                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Practice Problems
                            </h3>
                            <div className="space-y-4">
                                {practiceProblems.map((prob, idx) => (
                                    <Card key={idx} className="bg-muted/50">
                                        <CardContent className="p-4">
                                            <p className="font-medium mb-2">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                    {`${idx + 1}. ${prob.problem}`}
                                                </ReactMarkdown>
                                            </p>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-xs">Show Solution</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Solution</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="prose dark:prose-invert">
                                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                            {prob.solution}
                                                        </ReactMarkdown>
                                                        <div className="mt-4 p-2 bg-primary/10 rounded font-semibold">
                                                            Answer: {prob.answer}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                  <p>Solution will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MathSolver;
