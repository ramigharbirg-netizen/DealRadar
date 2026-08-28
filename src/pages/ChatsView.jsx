import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';


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

const chatsCache = new Map();

export const ChatsView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const conversationsRef = useRef([]);
  const [opportunitiesMap, setOpportunitiesMap] = useState({});
  const [otherUsersMap, setOtherUsersMap] = useState({});
  const [unreadCountMap, setUnreadCountMap] = useState({});

useEffect(() => {
  conversationsRef.current = conversations;
}, [conversations]);
  const refreshUnreadCounts = useCallback(async () => {
  if (!user?.id) {
  setUnreadCountMap({});
  return {};
}

  const { data: unreadRows, error: unreadError } = await supabase.rpc(
    'get_my_unread_conversation_counts'
  );

  if (unreadError) {
    console.error(
      'Load unread conversation counts error:',
      unreadError
    );
    return;
  }

  const counts = {};

  (unreadRows || []).forEach((row) => {
    counts[row.conversation_id] = Number(row.unread_count || 0);
  });

  setUnreadCountMap(counts);

const cached = chatsCache.get(user.id);

if (cached) {
  chatsCache.set(user.id, {
    ...cached,
    unreadCountMap: counts,
  });
}

return counts;
}, [user?.id]);

  const loadAll = useCallback(async () => {
  if (!user?.id) return;

  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select(`
      id,
      opportunity_id,
      owner_id,
      requester_id,
      created_at,
      last_message,
      last_message_at,
      last_message_sender_id
    `)
    .order('last_message_at', { ascending: false });

  if (convError || !convs) {
    if (!chatsCache.has(user.id)) {
      setConversations([]);
    }
    return;
  }

  const otherUserIds = [
    ...new Set(
      convs
        .map((conv) =>
          conv.owner_id === user.id
            ? conv.requester_id
            : conv.owner_id
        )
        .filter(Boolean)
    ),
  ];

  let profileMap = {};

  if (otherUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('public_user_profiles')
      .select('user_id, display_name, avatar_url, is_premium')
      .in('user_id', otherUserIds);

    if (profilesError) {
      console.error('Load chat user profiles error:', profilesError);
    } else {
      (profiles || []).forEach((profile) => {
        profileMap[profile.user_id] = profile;
      });
    }
  }

  const opportunityIds = [
    ...new Set(convs.map((conv) => conv.opportunity_id).filter(Boolean)),
  ];

  let oppMap = {};

  if (opportunityIds.length > 0) {
    const { data: opps, error: oppsError } = await supabase
      .from('opportunities')
      .select('id,title,images,address,category,user_id,user_name')
      .in('id', opportunityIds);

    if (oppsError) {
      console.error('Load chat opportunities error:', oppsError);
    } else {
      (opps || []).forEach((opp) => {
        oppMap[opp.id] = opp;
      });
    }
  }

  const counts = await refreshUnreadCounts();

  const snapshot = {
    conversations: convs,
    opportunitiesMap: oppMap,
    otherUsersMap: profileMap,
    unreadCountMap: counts || {},
  };

  chatsCache.set(user.id, snapshot);

  setConversations(snapshot.conversations);
  setOpportunitiesMap(snapshot.opportunitiesMap);
  setOtherUsersMap(snapshot.otherUsersMap);
  setUnreadCountMap(snapshot.unreadCountMap);
}, [user?.id, refreshUnreadCounts]);

  useEffect(() => {
  if (!user?.id) return;

  const cached = chatsCache.get(user.id);

  if (cached) {
    setConversations(cached.conversations);
    setOpportunitiesMap(cached.opportunitiesMap);
    setOtherUsersMap(cached.otherUsersMap);
    setUnreadCountMap(cached.unreadCountMap);
  }

  loadAll();
}, [user?.id, loadAll]);

  useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
  .channel('chats-view-realtime')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'conversation_messages',
    },
    (payload) => {
      const incoming = payload.new;

      setConversations((prev) => {
  const conversationExists = prev.some(
    (conv) => conv.id === incoming.conversation_id
  );

  if (!conversationExists) {
    return prev;
  }

  const updated = prev.map((conv) =>
    conv.id === incoming.conversation_id
      ? {
          ...conv,
          last_message: incoming.message,
          last_message_at: incoming.created_at,
          last_message_sender_id: incoming.sender_id,
        }
      : conv
  );

  const sorted = updated.sort(
  (a, b) =>
    new Date(b.last_message_at || b.created_at) -
    new Date(a.last_message_at || a.created_at)
);

const cached = chatsCache.get(user.id);

if (cached) {
  chatsCache.set(user.id, {
    ...cached,
    conversations: sorted,
  });
}

return sorted;
});

const conversationExists = conversationsRef.current.some(
  (conv) => conv.id === incoming.conversation_id
);

if (!conversationExists) {
  loadAll();
}

      refreshUnreadCounts();
    }
  )
  .subscribe();

  const handleReadUpdate = () => refreshUnreadCounts();
  window.addEventListener('chat-read-updated', handleReadUpdate);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('chat-read-updated', handleReadUpdate);
  };
}, [user?.id, loadAll, refreshUnreadCounts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div
  className="sticky top-0 z-20 shadow-sm"
  style={{ backgroundColor: '#FF7A00' }}
>
  <div className="px-4 py-5 max-w-3xl mx-auto">
    <h1 className="text-xl font-black text-white">Chat</h1>
    <p className="text-sm text-white/90">Le tue conversazioni</p>
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
            const otherUserId =
  conv.owner_id === user.id
    ? conv.requester_id
    : conv.owner_id;

const otherUser = otherUsersMap[otherUserId];

const otherUserName =
  otherUser?.display_name || 'Utente DealRadar';
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
  <div className="min-w-0">
  <div className="flex items-center gap-1.5">
    <p className="font-semibold text-gray-900 truncate">
      {otherUserName}
    </p>

    {otherUser?.is_premium && (
      <span
        title="Premium"
        className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white"
      >
        ✓
      </span>
    )}
  </div>

  <p className="mt-0.5 text-xs font-medium text-orange-600 truncate">
    {opp?.title || 'Opportunità'}
  </p>
</div>

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