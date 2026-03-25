import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';

export const ChatsView = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    const loadConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setConversations(data || []);
      }
    };

    loadConversations();
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
          conversations.map((conv) => (
            <Card
              key={conv.id}
              className="cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => navigate(`/chats/${conv.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      Chat opportunità
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      Opportunity ID: {conv.opportunity_id}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatsView;