import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Send,
  ChevronLeft,
  Share2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { commentsAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const OpportunityDetail = ({ opportunity, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingPickup, setSendingPickup] = useState(false);

  useEffect(() => {
    if (!opportunity?.id || !open) return;

    const loadData = async () => {
      try {
        const commentsRes = await commentsAPI.get(opportunity.id);
        setComments(commentsRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [opportunity?.id, open]);

  const handlePickupRequest = async () => {
    const activeUser = user || {
      id: null,
      email: 'manual@dealradar.app',
      name: 'Manual User',
    };

    setSendingPickup(true);

    try {
      const { error } = await supabase.from('pickup_requests').insert([
        {
          opportunity_id: opportunity.id,
          requester_name: activeUser.name,
          requester_email: activeUser.email,
          owner_name: opportunity.user_name,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .insert([
          {
            opportunity_id: opportunity.id,
            requester_id: activeUser.id,
            owner_id: opportunity.user_id || null,
          },
        ])
        .select()
        .single();

      if (convError) throw convError;

      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert([
          {
            conversation_id: conversationData.id,
            sender_name: activeUser.name,
            sender_email: activeUser.email,
            message: 'Ciao, sono interessato al ritiro. Quando sarebbe possibile passare?',
          },
        ]);

      if (messageError) throw messageError;

      toast.success('Chat aperta 🚀');
      onClose(false);
      navigate(`/chats/${conversationData.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Errore invio richiesta');
    } finally {
      setSendingPickup(false);
    }
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[72vh] w-full sm:max-w-md mx-auto p-0 rounded-t-2xl"
      >
        <ScrollArea className="h-full">
          <div className="sticky top-0 bg-white border-b px-3 py-2">
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onClose(false)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            <SheetTitle className="text-base font-bold mt-2 leading-tight">
              {opportunity.title}
            </SheetTitle>
          </div>

          <div className="p-3 space-y-3">
            {opportunity.images?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {opportunity.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`opportunity-${i}`}
                    className="h-24 w-32 object-contain bg-gray-100 rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            )}

            <p className="text-sm text-gray-600 leading-relaxed">
              {opportunity.description}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePickupRequest}
                className="h-8 px-3 rounded-lg bg-orange-500 text-white text-sm"
                disabled={sendingPickup}
              >
                {sendingPickup ? 'Invio...' : 'Richiedi ritiro'}
              </button>

              {opportunity.contact_phone && (
                <a
                  href={`tel:${opportunity.contact_phone}`}
                  className="h-8 px-3 rounded-lg bg-green-500 text-white text-sm flex items-center gap-1"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}

              {opportunity.contact_email && (
                <a
                  href={`mailto:${opportunity.contact_email}`}
                  className="h-8 px-3 rounded-lg bg-blue-500 text-white text-sm flex items-center gap-1"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Commenti</h4>

              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi..."
                  className="h-8"
                />
                <button
                  type="button"
                  className="h-8 w-8 bg-primary text-white flex items-center justify-center rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="bg-gray-100 p-2 rounded-lg text-sm">
                    {c.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default OpportunityDetail;