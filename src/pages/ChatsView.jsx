import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

const CHATS_PAGE_SIZE = 25;

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
  const [opportunitiesMap, setOpportunitiesMap] = useState({});
  const [otherUsersMap, setOtherUsersMap] = useState({});
  const [unreadCountMap, setUnreadCountMap] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const conversationsRef = useRef([]);
  const opportunitiesMapRef = useRef({});
  const otherUsersMapRef = useRef({});
  const loadMoreSentinelRef = useRef(null);
  const cursorRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const generationRef = useRef(0);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    opportunitiesMapRef.current = opportunitiesMap;
  }, [opportunitiesMap]);

  useEffect(() => {
    otherUsersMapRef.current = otherUsersMap;
  }, [otherUsersMap]);

  const refreshUnreadCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadCountMap({});
      return {};
    }

    const { data: unreadRows, error: unreadError } =
      await supabase.rpc('get_my_unread_conversation_counts');

    if (unreadError) {
      console.error(
        'Load unread conversation counts error:',
        unreadError
      );
      return {};
    }

    const counts = {};

    (unreadRows || []).forEach((row) => {
      counts[row.conversation_id] = Number(
        row.unread_count || 0
      );
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

  const loadRelatedData = useCallback(
    async (convs, existingOpportunities = {}, existingUsers = {}) => {
      if (!user?.id || !convs?.length) {
        return {
          opportunitiesMap: existingOpportunities,
          otherUsersMap: existingUsers,
        };
      }

      const otherUserIds = [
        ...new Set(
          convs
            .map((conv) =>
              conv.owner_id === user.id
                ? conv.requester_id
                : conv.owner_id
            )
            .filter(
              (userId) =>
                Boolean(userId) && !existingUsers[userId]
            )
        ),
      ];

      const opportunityIds = [
        ...new Set(
          convs
            .map((conv) => conv.opportunity_id)
            .filter(
              (opportunityId) =>
                Boolean(opportunityId) &&
                !existingOpportunities[opportunityId]
            )
        ),
      ];

      const profilesPromise =
        otherUserIds.length > 0
          ? supabase
              .from('public_user_profiles')
              .select(
                'user_id, display_name, avatar_url, is_premium'
              )
              .in('user_id', otherUserIds)
          : Promise.resolve({ data: [], error: null });

      const opportunitiesPromise =
        opportunityIds.length > 0
          ? supabase
              .from('opportunities')
              .select(
                'id,title,images,thumbnail_url,address,category,user_id,user_name'
              )
              .in('id', opportunityIds)
          : Promise.resolve({ data: [], error: null });

      const [
        { data: profiles, error: profilesError },
        { data: opps, error: oppsError },
      ] = await Promise.all([
        profilesPromise,
        opportunitiesPromise,
      ]);

      const profileMap = { ...existingUsers };

      if (profilesError) {
        console.error(
          'Load chat user profiles error:',
          profilesError
        );
      } else {
        (profiles || []).forEach((profile) => {
          profileMap[profile.user_id] = profile;
        });
      }

      const oppMap = { ...existingOpportunities };

      if (oppsError) {
        console.error(
          'Load chat opportunities error:',
          oppsError
        );
      } else {
        (opps || []).forEach((opp) => {
          oppMap[opp.id] = opp;
        });
      }

      return {
        opportunitiesMap: oppMap,
        otherUsersMap: profileMap,
      };
    },
    [user?.id]
  );

  const loadInitialPage = useCallback(async () => {
    if (!user?.id) return;

    const generation = ++generationRef.current;

    loadingMoreRef.current = false;
    setLoadingMore(false);

    const { data: convs, error: convError } = await supabase.rpc(
      'get_my_conversations_page',
      {
        p_limit: CHATS_PAGE_SIZE,
        p_cursor_activity_at: null,
        p_cursor_id: null,
      }
    );

    if (convError || !convs) {
      console.error(
        'Load conversations page error:',
        convError
      );

      if (!chatsCache.has(user.id)) {
        setConversations([]);
        setHasMore(false);
      }

      return;
    }

    if (generationRef.current !== generation) return;

    const cached = chatsCache.get(user.id);

    const existingOpportunities =
      cached?.opportunitiesMap || {};
    const existingUsers = cached?.otherUsersMap || {};

    const [relatedData, counts] = await Promise.all([
      loadRelatedData(
        convs,
        existingOpportunities,
        existingUsers
      ),
      refreshUnreadCounts(),
    ]);

    if (generationRef.current !== generation) return;

    const lastConversation = convs[convs.length - 1];

    cursorRef.current = lastConversation
      ? {
          activityAt: lastConversation.activity_at,
          id: lastConversation.id,
        }
      : null;

    const nextHasMore =
      convs.length === CHATS_PAGE_SIZE;

    const snapshot = {
      conversations: convs,
      opportunitiesMap: relatedData.opportunitiesMap,
      otherUsersMap: relatedData.otherUsersMap,
      unreadCountMap: counts || {},
      cursor: cursorRef.current,
      hasMore: nextHasMore,
    };

    chatsCache.set(user.id, snapshot);

    setConversations(snapshot.conversations);
    setOpportunitiesMap(snapshot.opportunitiesMap);
    setOtherUsersMap(snapshot.otherUsersMap);
    setUnreadCountMap(snapshot.unreadCountMap);
    setHasMore(snapshot.hasMore);
  }, [
    user?.id,
    loadRelatedData,
    refreshUnreadCounts,
  ]);

  const loadMoreConversations = useCallback(async () => {
    if (
      !user?.id ||
      loadingMoreRef.current ||
      !hasMore ||
      !cursorRef.current
    ) {
      return;
    }

    const generation = generationRef.current;
    const cursor = cursorRef.current;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const { data: convs, error: convError } =
        await supabase.rpc('get_my_conversations_page', {
          p_limit: CHATS_PAGE_SIZE,
          p_cursor_activity_at: cursor.activityAt,
          p_cursor_id: cursor.id,
        });

      if (convError) throw convError;

      if (generationRef.current !== generation) return;

      const page = convs || [];

      const relatedData = await loadRelatedData(
        page,
        opportunitiesMap,
        otherUsersMap
      );

      if (generationRef.current !== generation) return;

      const lastConversation = page[page.length - 1];

      if (lastConversation) {
        cursorRef.current = {
          activityAt: lastConversation.activity_at,
          id: lastConversation.id,
        };
      }

      const nextHasMore =
        page.length === CHATS_PAGE_SIZE;

      let mergedConversations = [];

      setConversations((current) => {
        const existingIds = new Set(
          current.map((conv) => conv.id)
        );

        const uniqueNew = page.filter(
          (conv) => !existingIds.has(conv.id)
        );

        mergedConversations = [
          ...current,
          ...uniqueNew,
        ];

        conversationsRef.current =
          mergedConversations;

        return mergedConversations;
      });

      setOpportunitiesMap(
        relatedData.opportunitiesMap
      );
      setOtherUsersMap(relatedData.otherUsersMap);
      setHasMore(nextHasMore);

      const cached = chatsCache.get(user.id);

      chatsCache.set(user.id, {
        ...(cached || {}),
        conversations: mergedConversations,
        opportunitiesMap:
          relatedData.opportunitiesMap,
        otherUsersMap: relatedData.otherUsersMap,
        unreadCountMap:
          cached?.unreadCountMap || unreadCountMap,
        cursor: cursorRef.current,
        hasMore: nextHasMore,
      });
    } catch (error) {
      console.error(
        'Load more conversations error:',
        error
      );
    } finally {
      if (generationRef.current === generation) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [
    user?.id,
    hasMore,
    loadRelatedData,
    opportunitiesMap,
    otherUsersMap,
    unreadCountMap,
  ]);

  const refreshFirstPage = useCallback(async () => {
    if (!user?.id) return;

    const generation = generationRef.current;

    const { data: firstPage, error } = await supabase.rpc(
      'get_my_conversations_page',
      {
        p_limit: CHATS_PAGE_SIZE,
        p_cursor_activity_at: null,
        p_cursor_id: null,
      }
    );

    if (error) {
      console.error(
        'Refresh first conversations page error:',
        error
      );
      return;
    }

    if (generationRef.current !== generation) return;

    const page = firstPage || [];

    const relatedData = await loadRelatedData(
      page,
      opportunitiesMapRef.current,
      otherUsersMapRef.current
    );

    if (generationRef.current !== generation) return;

    setConversations((current) => {
      const pageIds = new Set(
        page.map((conv) => conv.id)
      );

      const remaining = current.filter(
        (conv) => !pageIds.has(conv.id)
      );

      const merged = [...page, ...remaining];

      conversationsRef.current = merged;

      const cached = chatsCache.get(user.id);

      if (cached) {
        chatsCache.set(user.id, {
          ...cached,
          conversations: merged,
          opportunitiesMap:
            relatedData.opportunitiesMap,
          otherUsersMap:
            relatedData.otherUsersMap,
        });
      }

      return merged;
    });

    setOpportunitiesMap(
      relatedData.opportunitiesMap
    );
    setOtherUsersMap(relatedData.otherUsersMap);
  }, [user?.id, loadRelatedData]);

  useEffect(() => {
    if (!user?.id) return;

    const cached = chatsCache.get(user.id);

    if (cached) {
      setConversations(cached.conversations || []);
      conversationsRef.current =
        cached.conversations || [];

      setOpportunitiesMap(
        cached.opportunitiesMap || {}
      );
      setOtherUsersMap(cached.otherUsersMap || {});
      setUnreadCountMap(cached.unreadCountMap || {});
      setHasMore(Boolean(cached.hasMore));

      cursorRef.current = cached.cursor || null;
    }

    loadInitialPage();
  }, [user?.id, loadInitialPage]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;

    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreConversations();
        }
      },
      {
        root: null,
        rootMargin: '1200px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMoreConversations]);

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

          const conversationExists =
            conversationsRef.current.some(
              (conv) =>
                conv.id === incoming.conversation_id
            );

          if (conversationExists) {
            setConversations((prev) => {
              const updated = prev.map((conv) =>
                conv.id === incoming.conversation_id
                  ? {
                      ...conv,
                      last_message: incoming.message,
                      last_message_at:
                        incoming.created_at,
                      last_message_sender_id:
                        incoming.sender_id,
                      activity_at:
                        incoming.created_at,
                    }
                  : conv
              );

              const sorted = [...updated].sort(
                (a, b) => {
                  const timeDifference =
                    new Date(
                      b.activity_at ||
                        b.last_message_at ||
                        b.created_at
                    ) -
                    new Date(
                      a.activity_at ||
                        a.last_message_at ||
                        a.created_at
                    );

                  if (timeDifference !== 0) {
                    return timeDifference;
                  }

                  return b.id.localeCompare(a.id);
                }
              );

              conversationsRef.current = sorted;

              const cached =
                chatsCache.get(user.id);

              if (cached) {
                chatsCache.set(user.id, {
                  ...cached,
                  conversations: sorted,
                });
              }

              return sorted;
            });
          } else {
            refreshFirstPage();
          }

          refreshUnreadCounts();
        }
      )
      .subscribe();

    const handleReadUpdate = () =>
      refreshUnreadCounts();

    window.addEventListener(
      'chat-read-updated',
      handleReadUpdate
    );

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(
        'chat-read-updated',
        handleReadUpdate
      );
    };
  }, [
    user?.id,
    refreshFirstPage,
    refreshUnreadCounts,
  ]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div
        className="sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: '#FF7A00' }}
      >
        <div className="px-4 py-5 max-w-3xl mx-auto">
          <h1 className="text-xl font-black text-white">
            Chat
          </h1>
          <p className="text-sm text-white/90">
            Le tue conversazioni
          </p>
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
            const opp =
              opportunitiesMap[conv.opportunity_id];

            const otherUserId =
              conv.owner_id === user.id
                ? conv.requester_id
                : conv.owner_id;

            const otherUser =
              otherUsersMap[otherUserId];

            const otherUserName =
              otherUser?.display_name ||
              'Utente DealRadar';

            const unreadCount =
              unreadCountMap[conv.id] || 0;

            const isUnread = unreadCount > 0;

            return (
              <Card
                key={conv.id}
                className="cursor-pointer hover:border-primary/30 transition-all rounded-xl"
                onClick={() =>
                  navigate(`/chats/${conv.id}`)
                }
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {(opp?.thumbnail_url || opp?.images?.[0]) ? (
  <img
    src={opp.thumbnail_url || opp.images[0]}
    alt={opp.title}
    loading="lazy"
    decoding="async"
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
                            {opp?.title ||
                              'Opportunità'}
                          </p>
                        </div>

                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatChatTime(
                            conv.last_message_at ||
                              conv.created_at
                          )}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 truncate mt-1">
                        {lastMessage ||
                          'Nessun messaggio'}
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
                            <span className="truncate">
                              {opp.address}
                            </span>
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

        {loadingMore && conversations.length > 0 && (
          <div className="py-3 text-center text-xs text-gray-400">
            Caricamento altre conversazioni...
          </div>
        )}

        {hasMore && (
          <div
            ref={loadMoreSentinelRef}
            className="h-1"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

export default ChatsView;