import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'dealradar_last_read_map';

const getLastReadMap = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const formatChatTime = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isYesterday) return 'Ieri';

  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
  });
};

export const ChatsView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [opportunitiesMap, setOpportunitiesMap] = useState({});
  const [unreadCountMap, setUnreadCountMap] = useState({});

  const loadAll = async () => {
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select(`
      *,
      last_message,
      last_message_at,
      last_message_sender_id
    `)
    .order('last_message_at', { ascending: false });

  if (convError || !convs) {
    setConversations([]);
    return;
  }

  setConversations(convs);

  const opportunityIds = [
    ...new Set(convs.map((c) => c.opportunity_id).filter(Boolean)),
  ];

  if (opportunityIds.length > 0) {
    const { data: opps } = await supabase
      .from('opportunities')
      .select(`
        id,
        title,
        images,
        address,
        user_id,
        user_name,
        avatar_url,
        is_premium
      `)
      .in('id', opportunityIds);

    const oppMap = {};

    (opps || []).forEach((opp) => {
      oppMap[opp.id] = opp;
    });

    setOpportunitiesMap(oppMap);
  }

  const { data: reads } = await supabase
  .from('conversation_reads')
  .select('conversation_id,last_read_at');

const readMap = {};

(reads || []).forEach((row) => {
  readMap[row.conversation_id] = row.last_read_at;
});

const convIds = convs.map((c) => c.id);

if (convIds.length > 0) {
  const { data: unreadMessages } = await supabase
    .from('conversation_messages')
    .select('id,conversation_id,created_at,sender_id')
    .in('conversation_id', convIds)
    .neq('sender_id', user?.id);

  const counts = {};

  (unreadMessages || []).forEach((msg) => {
    const lastRead = readMap[msg.conversation_id];

    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      counts[msg.conversation_id] =
        (counts[msg.conversation_id] || 0) + 1;
    }
  });

  setUnreadCountMap(counts);
} else {
  setUnreadCountMap({});
}
};

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('chats-view-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
        },
        () => {
          loadAll();
        }
      )
      .subscribe();

    const handleReadUpdate = () => loadAll();
    window.addEventListener('chat-read-updated', handleReadUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('chat-read-updated', handleReadUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 py-4 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-gray-500">Le tue conversazioni</p>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-3">
        {conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Nessuna conversazione ancora
          </div>
        ) : (
          conversations.map((conv) => {
            const lastMessage = conv.last_message;
            const opp = opportunitiesMap[conv.opportunity_id];
            const unreadCount = unreadCountMap[conv.id] || 0;
            const isUnread = unreadCount > 0;

            return (
              <Card
                key={conv.id}
                className="cursor-pointer hover:border-primary/30 transition-all rounded-xl"
                onClick={() => navigate(`/chats/${conv.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {opp?.images?.[0] ? (
                      <img
                        src={opp.images[0]}
                        alt={opp.title}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-6 h-6 text-primary" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
  <p className="font-semibold text-gray-900 truncate">
    {opp?.title || 'Chat opportunità'}
  </p>

  <span className="text-xs text-gray-400 flex-shrink-0">
    {formatChatTime(conv.last_message_at || conv.created_at)}
  </span>
</div>

                      <p className="text-sm text-gray-500 truncate mt-1">
                        {lastMessage || 'Nessun messaggio'}
                      </p>

                      {isUnread && (
  <div className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
    {unreadCount}
  </div>
)}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        
                        {opp?.address && (
                          <>
                            <span>•</span>
                            <span className="truncate">{opp.address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatsView;