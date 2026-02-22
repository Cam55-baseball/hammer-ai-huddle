import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, ChevronDown, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AnalysisCoachChatProps {
  module: string;
  analysisContext: {
    efficiency_score: number;
    feedback: string;
    positives?: string[];
    drills?: Array<{ title: string; [key: string]: any }>;
    summary?: string[];
  };
}

function formatMessage(content: string) {
  return content
    .split("\n")
    .map((line) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (formatted.startsWith("- ") || formatted.startsWith("• ")) {
        formatted = `<li class="ml-4">${formatted.slice(2)}</li>`;
      }
      const numberedMatch = formatted.match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        formatted = `<li class="ml-4">${numberedMatch[2]}</li>`;
      }
      return formatted;
    })
    .join("<br/>");
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  hitting: [
    "What drills fix my bat path?",
    "How do I improve my timing?",
    "What should I focus on next?",
  ],
  pitching: [
    "How do I keep my chest closed longer?",
    "What causes arm drag?",
    "How can I increase velocity?",
  ],
  throwing: [
    "How do I improve my transfer?",
    "What footwork drills help accuracy?",
    "How do I strengthen my arm?",
  ],
};

export function AnalysisCoachChat({ module, analysisContext }: AnalysisCoachChatProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const suggestions = SUGGESTED_QUESTIONS[module] || SUGGESTED_QUESTIONS.hitting;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildAnalysisContextString = () => {
    const parts: string[] = [];
    parts.push(`Efficiency Score: ${analysisContext.efficiency_score}/100`);
    if (analysisContext.summary?.length) {
      parts.push(`Summary: ${analysisContext.summary.join("; ")}`);
    }
    if (analysisContext.feedback) {
      parts.push(`Feedback: ${analysisContext.feedback.slice(0, 500)}`);
    }
    if (analysisContext.positives?.length) {
      parts.push(`Strengths: ${analysisContext.positives.join("; ")}`);
    }
    if (analysisContext.drills?.length) {
      parts.push(`Recommended Drills: ${analysisContext.drills.map(d => d.title).join(", ")}`);
    }
    return parts.join("\n");
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: updatedMessages,
          analysisContext: buildAnalysisContextString(),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || "Failed to send message.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between border-primary/30 hover:bg-primary/5"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <div className="text-left">
              <span className="font-semibold">{t('analysisCoach.title', 'Ask the Coach')}</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                {t('analysisCoach.subtitle', 'Have questions about your analysis? Ask our AI biomechanics coach.')}
              </span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground">
              {t('analysisCoach.description', 'This is your AI biomechanics coach. Ask follow-up questions about your analysis results, drills, or mechanics.')}
            </p>
          </div>
          <ScrollArea className="h-64 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t('analysisCoach.emptyState', 'Ask a question about your analysis to get started.')}
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <MessageCircle className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div
                      className="text-sm [&_li]:list-disc [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="h-5 w-5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <MessageCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="max-w-[80%] space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {suggestions.map((q, i) => (
                <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>
                  {q}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2 border-t p-4">
            <Input
              placeholder={t('analysisCoach.placeholder', 'Ask about your mechanics...')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
