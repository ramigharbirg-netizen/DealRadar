import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const ChatDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [opportunity, setOpportunity] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  }, [id]);

  const loadOpportunity = useCallback(async () => {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('opportunity_id')
      .eq('id', id)
      .single();

    if (convError || !conv?.opportunity_id) return;

    const { data: opp, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', conv.opportunity_id)
      .single();

    if (!oppError) {
      setOpportunity(opp);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Devi fare login per usare la chat');
      navigate('/login');
      return;
    }

    if (user) {
      loadMessages();
      loadOpportunity();
    }
  }, [authLoading, user, navigate, loadMessages, loadOpportunity]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const incoming = payload.new;

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === incoming.id);
            if (exists) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Devi fare login per inviare messaggi');
      navigate('/login');
      return;
    }

    const messageText = newMessage.trim();
    if (!messageText || sending) return;

    setSending(true);
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: id,
      sender_name: user.name || user.email,
      sender_email: user.email,
      message: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    const { data, error } = await supabase
      .from('conversation_messages')
      .insert([
        {
          conversation_id: id,
          sender_name: user.name || user.email,
          sender_email: user.email,
          message: messageText,
        },
      ])
      .select()
      .single();

    if (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageText);
      toast.error('Invio messaggio fallito');
    } else if (data) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? data : msg))
      );
    }

    setSending(false);
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="mx-auto flex h-full max-w-4xl flex-col bg-white">
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => navigate('/chats')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">
                {opportunity?.title || 'Chat'}
              </h1>
              <p className="truncate text-sm text-gray-500">
                {opportunity?.address || 'Conversazione'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-3 py-3">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {messages.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                Nessun messaggio ancora
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_email === user?.email;
                const isTemp = String(msg.id).startsWith('temp-');

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMine
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      } ${isTemp ? 'opacity-70' : ''}`}
                    >
                      <p className="mb-1 text-xs font-semibold opacity-80">
                        {msg.sender_name}
                      </p>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-3 py-3 pb-24">
          <form onSubmit={handleSend} className="mx-auto flex w-full max-w-3xl gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="h-11 rounded-xl"
              disabled={sending}
            />
            <button
              type="submit"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50"
              disabled={sending || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;