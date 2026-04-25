import React, { useState, useEffect } from 'react';
import { 
  Target, MapPin, Euro, Clock, Users, Navigation, 
  ChevronLeft, Share2, Send, CheckCircle, XCircle, User
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const categoryConfig = {
  store_liquidation: { name: 'Store Liquidation', color: 'bg-green-500' },
  product_stock: { name: 'Product Stock', color: 'bg-amber-500' },
  equipment: { name: 'Equipment', color: 'bg-blue-500' },
  business_sale: { name: 'Business Sale', color: 'bg-purple-500' },
  auctions: { name: 'Auctions', color: 'bg-red-500' },
  user_reported: { name: 'User Reported', color: 'bg-orange-500' },
};

const formatPrice = (price) => {
  if (!price) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} meters`;
  return `${km.toFixed(1)} km`;
};

export const BountyDetail = ({ bounty, open, onClose }) => {
  const { user } = useAuth();
  const [myOpportunities, setMyOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const category = categoryConfig[bounty?.category] || categoryConfig.user_reported;
const isCreator = user && bounty?.user_id === user.id;

  

  const loadMyOpportunities = async () => {
  try {
    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (bounty.category && bounty.category !== 'all') {
      query = query.eq('category', bounty.category);
    }

    const { data, error } = await query;

    if (error) throw error;

    setMyOpportunities(data || []);
  } catch (err) {
    console.error('Error loading opportunities:', err);
    setMyOpportunities([]);
  }
};

  const loadSubmissions = async () => {
  setLoadingSubmissions(true);

  try {
    const { data, error } = await supabase
      .from('bounty_submissions')
      .select(`
        *,
        opportunity:opportunities(*)
      `)
      .eq('bounty_id', bounty.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setSubmissions(data || []);
  } catch (err) {
    console.error('Error loading submissions:', err);
    setSubmissions([]);
  } finally {
    setLoadingSubmissions(false);
  }
};
useEffect(() => {
  if (bounty?.id && open && user) {
    loadMyOpportunities();

    if (user && bounty?.user_id === user.id) {
  loadSubmissions();
}
  }
}, [bounty, open, user]);
  const handleSubmit = async () => {
  if (!user) {
    toast.error('Please login to submit');
    return;
  }

  if (!selectedOpportunity) {
    toast.error('Please select an opportunity');
    return;
  }

  setSubmitting(true);

  try {
    const payload = {
      bounty_id: bounty.id,
      opportunity_id: selectedOpportunity,
      user_id: user.id,
      user_name: user.name || user.email,
      note: note || null,
      status: 'pending',
    };

    const { error } = await supabase
      .from('bounty_submissions')
      .insert([payload]);

    if (error) throw error;

    toast.success('Submission sent! The bounty creator will review it.');
    setSelectedOpportunity('');
    setNote('');
  } catch (err) {
    console.error('Submit bounty error:', err);
    toast.error(err.message || 'Failed to submit');
  } finally {
    setSubmitting(false);
  }
};

  const handleApprove = async (submissionId) => {
  try {
    const { error } = await supabase
      .from('bounty_submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (error) throw error;

    toast.success('Submission approved!');
    loadSubmissions();
    onClose(false);
  } catch (err) {
    console.error('Approve submission error:', err);
    toast.error(err.message || 'Failed to approve');
  }
};

 const handleReject = async (submissionId) => {
  try {
    const { error } = await supabase
      .from('bounty_submissions')
      .update({ status: 'rejected' })
      .eq('id', submissionId);

    if (error) throw error;

    toast.success('Submission rejected');
    loadSubmissions();
  } catch (err) {
    console.error('Reject submission error:', err);
    toast.error(err.message || 'Failed to reject');
  }
};

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: bounty.title,
          text: `Bounty: ${bounty.title} - €${bounty.reward_amount} reward!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (!bounty) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] p-0 rounded-t-3xl"
        data-testid="bounty-detail-sheet"
      >
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 relative">
            {/* Top Actions */}
            <div className="flex justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={() => onClose(false)}
                data-testid="close-bounty-btn"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Bounty Icon & Reward */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                  <Target className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <Badge className="bg-white/20 text-white border-0 mb-1">
                    BOUNTY
                  </Badge>
                  <p className="text-white/80 text-sm">
                    {bounty.status === 'active' ? 'Active' : bounty.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">Reward</p>
                <p className="text-3xl font-bold text-white">
                  {formatPrice(bounty.reward_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            <SheetHeader className="text-left p-0 space-y-2">
              <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                {bounty.title}
              </SheetTitle>
              
              {/* Distance & Location */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {bounty.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {bounty.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  {bounty.radius_km} km radius
                </span>
              </div>
            </SheetHeader>

            {/* Category & Budget */}
            <div className="flex gap-3">
              <Badge className={`${category.color} text-white border-0`}>
                Looking for: {category.name}
              </Badge>
            </div>

            {bounty.max_price && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Maximum Budget</span>
                  <span className="text-xl font-bold text-amber-700">
                    {formatPrice(bounty.max_price)}
                  </span>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What they're looking for</h4>
              <p className="text-gray-600 leading-relaxed">{bounty.description}</p>
            </div>

            {/* Posted By */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{bounty.user_name}</p>
                <p className="text-sm text-gray-500">Posted {formatDate(bounty.created_at)}</p>
              </div>
            </div>

            {/* Submit Section (for non-creators) */}
            {!isCreator && bounty.status === 'active' && (
              <div className="space-y-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Report a Matching Opportunity
                </h4>
                
                {user ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Select an opportunity to submit
                      </label>
                      <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
                        <SelectTrigger data-testid="select-opportunity">
                          <SelectValue placeholder="Choose an opportunity..." />
                        </SelectTrigger>
                        <SelectContent>
                          {myOpportunities.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No matching opportunities found
                            </SelectItem>
                          ) : (
                            myOpportunities.map((opp) => (
                              <SelectItem key={opp.id} value={opp.id}>
                                {opp.title} - {formatPrice(opp.estimated_price)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Add a note (optional)
                      </label>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Why does this opportunity match the bounty?"
                        className="rounded-xl"
                        data-testid="submission-note"
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full h-12 bg-amber-500 hover:bg-amber-600 rounded-xl"
                      disabled={submitting || !selectedOpportunity}
                      data-testid="submit-to-bounty-btn"
                    >
                      {submitting ? 'Submitting...' : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit & Claim Reward
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="text-center text-gray-500">
                    Please login to submit an opportunity
                  </p>
                )}
              </div>
            )}

            {/* Submissions Section (for creators) */}
            {isCreator && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Submissions ({submissions.length})
                </h4>

                {loadingSubmissions ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No submissions yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-xl border ${
                          sub.status === 'approved' ? 'bg-green-50 border-green-200' :
                          sub.status === 'rejected' ? 'bg-red-50 border-red-200' :
                          'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{sub.user_name}</p>
                            <p className="text-xs text-gray-500">{formatDate(sub.created_at)}</p>
                          </div>
                          <Badge
                            className={
                              sub.status === 'approved' ? 'bg-green-500' :
                              sub.status === 'rejected' ? 'bg-red-500' :
                              'bg-amber-500'
                            }
                          >
                            {sub.status}
                          </Badge>
                        </div>

                        {sub.opportunity && (
                          <div className="p-3 bg-gray-50 rounded-lg mb-3">
                            <p className="font-medium text-sm">{sub.opportunity.title}</p>
                            {sub.opportunity.estimated_price && (
                              <p className="text-sm text-gray-600">
                                Price: {formatPrice(sub.opportunity.estimated_price)}
                              </p>
                            )}
                          </div>
                        )}

                        {sub.note && (
                          <p className="text-sm text-gray-600 mb-3 italic">"{sub.note}"</p>
                        )}

                        {sub.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(sub.id)}
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              data-testid={`approve-${sub.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve & Pay
                            </Button>
                            <Button
                              onClick={() => handleReject(sub.id)}
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              data-testid={`reject-${sub.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Padding */}
            <div className="h-20"></div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default BountyDetail;
