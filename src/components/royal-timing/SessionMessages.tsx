import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

interface SessionMessagesProps {
  sessionId: string;
}

export function SessionMessages({ sessionId }: SessionMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    if (!sessionId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('royal_timing_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        // Fetch profile names for unique sender_ids
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const unknownIds = senderIds.filter((id) => !profileCache[id]);
        if (unknownIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', unknownIds);
          if (profiles) {
            const newCache = { ...profileCache };
            profiles.forEach((p) => {
              newCache[p.id] = p.full_name || 'Unknown';
            });
            setProfileCache(newCache);
          }
        }
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`rt-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'royal_timing_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (!profileCache[newMsg.sender_id]) {
            supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setProfileCache((prev) => ({
                    ...prev,
                    [data.id]: data.full_name || 'Unknown',
                  }));
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'royal_timing_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const oldMsg = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from('royal_timing_messages').insert({
        session_id: sessionId,
        sender_id: user.id,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Session Discussion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="max-h-48 overflow-y-auto space-y-2 mb-3">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No messages yet. Start a discussion about this session.
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {profileCache[msg.sender_id] || (isMe ? 'You' : 'User')} ·{' '}
                    {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="text-sm"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
