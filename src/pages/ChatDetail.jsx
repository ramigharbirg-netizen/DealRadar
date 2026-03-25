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
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 py-3 max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate('/chats')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-lg font-bold text-gray-900">Chat</h1>
            <p className="text-sm text-gray-500">Conversation ID: {id}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 max-w-3xl mx-auto w-full space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
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
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="font-semibold text-xs mb-1 opacity-80">
                    {msg.sender_name}
                  </p>
                  <p>{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-100 bg-white">
        <form
          onSubmit={handleSend}
          className="p-3 max-w-3xl mx-auto"
        >
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              className="h-10 rounded-xl"
            />
            <button
              type="submit"
              className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatDetail;