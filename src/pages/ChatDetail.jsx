import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const STORAGE_KEY = 'dealradar_last_read_map';

const getLastReadMap = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const setLastReadForConversation = (conversationId, timestamp) => {
  const map = getLastReadMap();
  map[conversationId] = timestamp;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('chat-read-updated'));
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ChatDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [opportunity, setOpportunity] = useState(null);
  const [pickupRequest, setPickupRequest] = useState(null);
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const activeUser = useMemo(
    () => ({
      name: 'Manual User',
      email: 'manual@dealradar.app',
    }),
    []
  );

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);

      const lastMessage = data?.[data.length - 1];
      if (lastMessage?.created_at) {
        setLastReadForConversation(id, lastMessage.created_at);
      }
    }
  };

  const loadOpportunityAndRequest = async () => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('opportunity_id')
      .eq('id', id)
      .single();

    if (conv?.opportunity_id) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', conv.opportunity_id)
        .single();

      setOpportunity(opp || null);

      const { data: requestRows } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('opportunity_id', conv.opportunity_id)
        .order('created_at', { ascending: false })
        .limit(1);

      setPickupRequest(requestRows?.[0] || null);
    }
  };

  useEffect(() => {
    loadMessages();
    loadOpportunityAndRequest();
  }, [id]);

  useEffect(() => {
    const messagesChannel = supabase
      .channel(`conversation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });

          if (payload.new?.created_at) {
            setLastReadForConversation(id, payload.new.created_at);
          }
        }
      )
      .subscribe();

    let pickupChannel;
    if (opportunity?.id) {
      pickupChannel = supabase
        .channel(`pickup-request-${opportunity.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pickup_requests',
            filter: `opportunity_id=eq.${opportunity.id}`,
          },
          () => {
            loadOpportunityAndRequest();
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(messagesChannel);
      if (pickupChannel) supabase.removeChannel(pickupChannel);
    };
  }, [id, opportunity?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('conversation_messages').insert([
      {
        conversation_id: id,
        sender_name: activeUser.name,
        sender_email: activeUser.email,
        message: messageToSend,
      },
    ]);

    if (error) {
      setNewMessage(messageToSend);
      toast.error('Invio messaggio non riuscito');
    } else {
      window.dispatchEvent(new Event('chat-read-updated'));
    }
  };

  const handleRequestStatus = async (status) => {
    if (!pickupRequest?.id) return;

    setUpdatingRequest(true);
    try {
      const { error } = await supabase
        .from('pickup_requests')
        .update({ status })
        .eq('id', pickupRequest.id);

      if (error) throw error;

      const statusLabel =
        status === 'accepted' ? 'Richiesta accettata' : 'Richiesta rifiutata';

      await supabase.from('conversation_messages').insert([
        {
          conversation_id: id,
          sender_name: activeUser.name,
          sender_email: activeUser.email,
          message:
            status === 'accepted'
              ? 'Richiesta accettata. Possiamo organizzarci per il ritiro.'
              : 'Richiesta rifiutata.',
        },
      ]);

      toast.success(statusLabel);
      loadOpportunityAndRequest();
      loadMessages();
    } catch (err) {
      console.error(err);
      toast.error('Aggiornamento richiesta non riuscito');
    } finally {
      setUpdatingRequest(false);
    }
  };

  const requestStatusLabel =
    pickupRequest?.status === 'accepted'
      ? 'Accettata'
      : pickupRequest?.status === 'rejected'
      ? 'Rifiutata'
      : 'In attesa';

  const requestStatusClasses =
    pickupRequest?.status === 'accepted'
      ? 'bg-green-100 text-green-700'
      : pickupRequest?.status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

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

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-gray-900">
                {opportunity?.title || 'Chat'}
              </h1>
              <p className="truncate text-sm text-gray-500">
                {opportunity?.address || 'Conversazione'}
              </p>
            </div>
          </div>

          {pickupRequest && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold ${requestStatusClasses}`}
              >
                Stato richiesta: {requestStatusLabel}
              </span>

              {pickupRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRequestStatus('accepted')}
                    disabled={updatingRequest}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Accetta
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRequestStatus('rejected')}
                    disabled={updatingRequest}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Rifiuta
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-3 py-3">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {messages.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                Nessun messaggio ancora
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_email === activeUser.email;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMine
                          ? 'bg-primary text-white'
                          : 'border border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold opacity-80">
                        {msg.sender_name}
                      </p>
                      <p>{msg.message}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          isMine ? 'text-white/80' : 'text-gray-400'
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-3 py-3 pb-24">
          <form onSubmit={handleSend} className="mx-auto flex w-full max-w-3xl gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="h-11 rounded-xl"
            />
            <button
              type="submit"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white"
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