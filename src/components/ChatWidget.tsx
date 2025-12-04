import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  onClose: () => void;
}

export function ChatWidget({ onClose }: ChatWidgetProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t('chatWidget.greeting'),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [...messages, userMessage],
          userId: user?.id,
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
        title: t('common.error'),
        description: error.message || t('chatWidget.errorSending'),
        variant: "destructive",
      });
      
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-24 right-6 z-50 w-96 shadow-2xl">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          {t('chatWidget.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
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
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="max-w-[80%] space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 border-t border-border p-4">
          <Input
            placeholder={t('chatWidget.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
