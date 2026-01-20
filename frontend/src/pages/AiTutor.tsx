import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Bot, User, GraduationCap } from "lucide-react";
import { chatApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model";
  content: string;
};

const AiTutor = () => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I'm your AI Tutor. How can I help you with your studies today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<"general" | "writing" | "planning">("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Filter out the initial greeting if it wasn't from the API, 
      // but keeping it in UI is fine. For API context, we send full history.
      // API expects "model" or "user" roles.
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await chatApi.send(userMessage, history, undefined, activeContext);
      
      setMessages(prev => [...prev, { role: "model", content: response.message }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      // Remove the user message if failed? Or just show error. 
      // Let's keep it but maybe show a retry button in future.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b bg-card/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Tutor Assistant</h1>
                <p className="text-xs text-muted-foreground">24/7 Homework Help & Study Guide</p>
              </div>
            </div>
            <div className="flex gap-2">
                <Button 
                    variant={activeContext === "general" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveContext("general")}
                >
                    General
                </Button>
                <Button 
                    variant={activeContext === "writing" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveContext("writing")}
                >
                    Writing Helper
                </Button>
                <Button 
                    variant={activeContext === "planning" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveContext("planning")}
                >
                    Study Planner
                </Button>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 max-w-[85%]",
                message.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <Avatar className="h-8 w-8 mt-1 border border-border">
                {message.role === "user" ? (
                  <>
                    <AvatarImage src="" /> {/* Add user image if available */}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-green-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                )}
              </Avatar>

              <Card className={cn(
                "border-none shadow-sm",
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card border border-border"
              )}>
                <CardContent className="p-3 text-sm">
                  <div className={cn(
                    "prose max-w-none break-words",
                    message.role === "user" ? "prose-invert" : "dark:prose-invert"
                  )}>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-green-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about math, science, history..."
              className="pr-12"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 top-1 h-8 w-8" 
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AiTutor;
