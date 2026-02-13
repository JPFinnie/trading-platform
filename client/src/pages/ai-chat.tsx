import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, Brain, Trash2, BarChart3, Loader2, Bot, User, Zap } from "lucide-react";

export default function AiChat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({ queryKey: ["/api/chat"] });
  const { data: aiStatus } = useQuery<{ connected: boolean }>({ queryKey: ["/api/ai-status"] });

  const sendMutation = useMutation({
    mutationFn: (data: { message: string; includePortfolioAnalysis?: boolean }) =>
      apiRequest("POST", "/api/chat", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/chat"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({ title: "Chat cleared" });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate({ message: message.trim() });
    setMessage("");
  };

  const handleAnalysis = () => {
    sendMutation.mutate({ message: "Run a full portfolio analysis with specific recommendations for each position and watchlist item.", includePortfolioAnalysis: true });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-ai-title">Strategy AI</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${aiStatus?.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-sm text-muted-foreground">
              {aiStatus?.connected ? "OpenAI connected" : "Standby — add API key in Settings"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAnalysis} disabled={sendMutation.isPending} data-testid="button-portfolio-analysis">
            <BarChart3 className="w-4 h-4 mr-2" />
            Portfolio Analysis
          </Button>
          <Button variant="ghost" size="icon" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending} data-testid="button-clear-chat">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-3/4 ml-auto" />
            </div>
          ) : !messages?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-1">TSX Strategy AI</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Ask about TSX tickers, trading strategies, or run a portfolio analysis for tailored recommendations
              </p>
              <div className="grid gap-2 sm:grid-cols-2 max-w-lg w-full">
                {[
                  "What's your outlook on RY.TO?",
                  "Best TSX dividend stocks under $50",
                  "Analyze the Canadian banking sector",
                  "Suggest a stop-loss strategy for tech stocks",
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    className="text-xs text-left justify-start h-auto py-2.5 px-3"
                    onClick={() => {
                      sendMutation.mutate({ message: prompt });
                    }}
                    disabled={sendMutation.isPending}
                    data-testid={`button-prompt-${prompt.slice(0, 20)}`}
                  >
                    <Zap className="w-3 h-3 mr-2 shrink-0 text-muted-foreground" />
                    <span className="truncate">{prompt}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.id}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {sendMutation.isPending && (
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              data-testid="input-chat-message"
              placeholder="Ask about TSX tickers, strategies, or analysis..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sendMutation.isPending || !message.trim()} data-testid="button-send-chat">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
