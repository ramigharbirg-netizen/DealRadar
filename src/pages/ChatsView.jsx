import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const ChatsView = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [opportunitiesMap, setOpportunitiesMap] = useState({});

  useEffect(() => {
    const loadAll = async () => {
      const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (convError || !convs) {
        setConversations([]);
        return;
      }

      setConversations(convs);

      const opportunityIds = [...new Set(convs.map((c) => c.opportunity_id).filter(Boolean))];

      if (opportunityIds.length > 0) {
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id,title,images')
          .in('id', opportunityIds);

        const oppMap = {};
        (opps || []).forEach((opp) => {
          oppMap[opp.id] = opp;
        });
        setOpportunitiesMap(oppMap);
      }

      const convIds = convs.map((c) => c.id);

      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('conversation_messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        const map = {};
        (msgs || []).forEach((msg) => {
          if (!map[msg.conversation_id]) {
            map[msg.conversation_id] = msg;
          }
        });
        setMessagesMap(map);
      }
    };

    loadAll();
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
            const lastMessage = messagesMap[conv.id];
            const opp = opportunitiesMap[conv.opportunity_id];

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
                      <p className="font-semibold text-gray-900 truncate">
                        {opp?.title || 'Chat opportunità'}
                      </p>

                      <p className="text-sm text-gray-500 truncate mt-1">
                        {lastMessage?.message || 'Nessun messaggio'}
                      </p>

                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(lastMessage?.created_at || conv.created_at)}</span>
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