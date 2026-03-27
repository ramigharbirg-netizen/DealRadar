import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const ChatDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [opportunity, setOpportunity] = useState(null);

  const activeUser = {
    name: 'Manual User',
    email: 'manual@dealradar.app',
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('conversation_messages').insert([
      {
        conversation_id: id,
        sender_name: activeUser.name,
        sender_email: activeUser.email,
        message: newMessage.trim(),
      },
    ]);

    if (!error) {
      setNewMessage('');
      loadMessages();
      const loadOpportunity = async () => {
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

    setOpportunity(opp);
  }
};

loadOpportunity();
    }
  };

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
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
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