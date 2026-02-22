import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, HelpCircle, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HelpDeskChatProps {
  embedded?: boolean;
  onClose?: () => void;
}

function formatMessage(content: string) {
  // Basic markdown: bold, line breaks, lists
  return content
    .split("\n")
    .map((line, i) => {
      // Bold
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet lists
      if (formatted.startsWith("- ") || formatted.startsWith("• ")) {
        formatted = `<li class="ml-4">${formatted.slice(2)}</li>`;
      }
      // Numbered lists
      const numberedMatch = formatted.match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        formatted = `<li class="ml-4">${numberedMatch[2]}</li>`;
      }
      return formatted;
    })
    .join("<br/>");
}

export function HelpDeskChat({ embedded = false, onClose }: HelpDeskChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t('helpDesk.greeting', "Hi! I'm your Hammers Modality assistant. Ask me anything about the app — how to navigate, use features, or troubleshoot issues."),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const suggestedQuestions = [
    t('helpDesk.suggested.analyzeVideo', "How do I analyze a video?"),
    t('helpDesk.suggested.modules', "What modules are available?"),
    t('helpDesk.suggested.customFields', "How do custom fields work?"),
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-helpdesk", {
        body: {
          messages: [...messages, userMessage],
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
        description: error.message || t('helpDesk.errorSending', 'Failed to send message. Please try again.'),
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = messages.length <= 1;

  if (embedded) {
    return (
      <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="border-b p-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t('helpDesk.chatTitle', 'Ask the AI Assistant')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('helpDesk.chatSubtitle', "Can't find your answer above? Ask me anything about the app.")}
          </p>
        </div>
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {loading && <LoadingSkeleton />}
          </div>
        </ScrollArea>
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {suggestedQuestions.map((q, i) => (
              <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>
                {q}
              </Button>
            ))}
          </div>
        )}
        <div className="flex gap-2 border-t p-4">
          <Input
            placeholder={t('helpDesk.placeholder', 'Ask about the app...')}
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
    );
  }

  // Floating card variant
  return (
    <Card className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] shadow-2xl">
      <CardHeader className="border-b border-border py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-5 w-5 text-primary" />
          {t('helpDesk.title', 'Help Desk')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('helpDesk.floatingSubtitle', 'App support & navigation help')}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {loading && <LoadingSkeleton />}
          </div>
        </ScrollArea>
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {suggestedQuestions.map((q, i) => (
              <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(q)}>
                {q}
              </Button>
            ))}
          </div>
        )}
        <div className="flex gap-2 border-t border-border p-4">
          <Input
            placeholder={t('helpDesk.placeholder', 'Ask about the app...')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <HelpCircle className="h-5 w-5 text-primary-foreground" />
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
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        <HelpCircle className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="max-w-[80%] space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
