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
  const [chatUserProfile, setChatUserProfile] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';

    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Load messages error:', error);
      return;
    }

    const enrichedMessages = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from('public_user_profiles')
          .select('avatar_url, is_premium')
          .eq('user_id', msg.sender_id)
          .maybeSingle();

        return {
          ...msg,
          avatar_url: profile?.avatar_url || null,
          is_premium: profile?.is_premium || false,
        };
      })
    );

    setMessages(enrichedMessages);
  }, [id]);

  const markConversationAsRead = useCallback(async () => {
    if (!user?.id || !id) return;

    await supabase.from('conversation_reads').upsert(
      {
        conversation_id: id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id,user_id',
      }
    );

    window.dispatchEvent(new Event('chat-read-updated'));
  }, [id, user?.id]);

  const loadOpportunity = useCallback(async () => {
    if (!user?.id || !id) return;

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('opportunity_id, owner_id, requester_id')
      .eq('id', id)
      .single();

    if (convError || !conv?.opportunity_id) {
      console.error('Load conversation error:', convError);
      return;
    }

    const { data: opp, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', conv.opportunity_id)
      .single();

    if (oppError) {
      console.error('Load opportunity error:', oppError);
    } else {
      setOpportunity(opp);
    }

    const otherUserId =
      conv.owner_id === user.id ? conv.requester_id : conv.owner_id;

    if (!otherUserId) {
      setChatUserProfile(null);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('public_user_profiles')
      .select('user_id, display_name, avatar_url, is_premium, trust_score')
      .eq('user_id', otherUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Load chat user profile error:', profileError);
      setChatUserProfile(null);
    } else {
      setChatUserProfile(profile || null);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Devi fare login per usare la chat');
      navigate('/login');
      return;
    }

    if (user) {
      loadMessages();
      loadOpportunity();
      markConversationAsRead();
    }
  }, [
    authLoading,
    user,
    navigate,
    loadMessages,
    loadOpportunity,
    markConversationAsRead,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user || !id) return;

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
        async (payload) => {
          const incoming = payload.new;

          const { data: profile } = await supabase
            .from('public_user_profiles')
            .select('avatar_url, is_premium')
            .eq('user_id', incoming.sender_id)
            .maybeSingle();

          const enrichedIncoming = {
            ...incoming,
            avatar_url: profile?.avatar_url || null,
            is_premium: profile?.is_premium || false,
          };

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === enrichedIncoming.id);
            if (exists) return prev;
            return [...prev, enrichedIncoming];
          });

          markConversationAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, markConversationAsRead]);

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

    const { data: myProfile } = await supabase
      .from('public_user_profiles')
      .select('avatar_url, is_premium')
      .eq('user_id', user.id)
      .maybeSingle();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      id: tempId,
      conversation_id: id,
      sender_name: user.name || user.email,
      sender_email: user.email,
      sender_id: user.id,
      message: messageText,
      created_at: new Date().toISOString(),
      avatar_url: myProfile?.avatar_url || null,
      is_premium: myProfile?.is_premium || false,
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
          sender_id: user.id,
          message: messageText,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Send message error:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(messageText);
      toast.error('Invio messaggio fallito');
    } else if (data) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...data,
                avatar_url: myProfile?.avatar_url || null,
                is_premium: myProfile?.is_premium || false,
              }
            : msg
        )
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

  const chatUserName =
    chatUserProfile?.display_name || opportunity?.user_name || 'Utente';

  const chatUserInitial = chatUserName.charAt(0).toUpperCase();

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="mx-auto flex h-full max-w-4xl flex-col bg-white">
        <div className="bg-[#FF7A00] px-4 pt-4 pb-5 text-white">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-white hover:bg-white/15 hover:text-white"
              onClick={() => navigate('/chats')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40">
              {chatUserProfile?.avatar_url ? (
                <img
                  src={chatUserProfile.avatar_url}
                  alt={chatUserName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {chatUserInitial}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h1 className="truncate text-lg font-bold">{chatUserName}</h1>

                {chatUserProfile?.is_premium && (
                  <span
                    title="Premium"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
                  >
                    ✓
                  </span>
                )}
              </div>

              <p className="text-sm text-white/80">Conversazione</p>
            </div>
          </div>
        </div>

        {opportunity && (
          <div className="border-b border-orange-100 bg-white px-4 py-3 shadow-sm">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
              {opportunity.images?.[0] ? (
                <img
                  src={opportunity.images[0]}
                  alt={opportunity.title}
                  className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-orange-50" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {opportunity.title}
                </p>

                <p className="mt-1 text-lg font-extrabold text-[#FF7A00]">
                  {Number(opportunity.estimated_price) === 0
                    ? 'Gratis'
                    : `€${Number(
                        opportunity.estimated_price || 0
                      ).toLocaleString('it-IT')}`}
                </p>

                {opportunity.address && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {opportunity.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto bg-[#F5F5F5] px-3 py-3">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {messages.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                Nessun messaggio ancora
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                const isTemp = String(msg.id).startsWith('temp-');

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isMine && (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {msg.avatar_url ? (
                          <img
                            src={msg.avatar_url}
                            alt={msg.sender_name || 'Avatar'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            {(msg.sender_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMine
                          ? 'bg-[#FF7A00] text-white'
                          : 'border border-gray-200 bg-white text-gray-900'
                      } ${isTemp ? 'opacity-70' : ''}`}
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            if (msg?.sender_id) {
                              navigate(`/users/${msg.sender_id}`);
                            }
                          }}
                          className="text-left text-xs font-semibold opacity-80 hover:underline"
                        >
                          {msg.sender_name}
                        </button>

                        {msg.is_premium && (
                          <span
                            title="Premium"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <p>{msg.message}</p>

                      <p
                        className={`mt-1 text-[10px] ${
                          isMine ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-3 py-3 pb-24">
          <form
            onSubmit={handleSend}
            className="mx-auto flex w-full max-w-3xl gap-2"
          >
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