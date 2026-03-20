import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { CategoryFilter } from '../components/CategoryFilter';
import { toast } from 'sonner';

export const FeedView = () => {
  const { location, radius } = useLocation();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
  loadOpportunities();
}, [location, radius, category, sortBy]);

  const loadOpportunities = async () => {
  setLoading(true);

  try {
    let query = supabase
      .from('opportunities')
      .select('*');

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'profit') {
      query = query.order('estimated_resale_value', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    setOpportunities(data || []);
  } catch (err) {
    console.error('Supabase load opportunities error:', err);
    toast.error('Failed to load opportunities');
    setOpportunities([]);
  } finally {
    setLoading(false);
  }
};

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOpportunities();
    setRefreshing(false);
    toast.success('Feed refreshed');
  };

  const todayOpportunities = opportunities.filter(opp => {
    const created = new Date(opp.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });

  const highProfitOpportunities = [...opportunities]
    .filter(opp => opp.estimated_resale_value && opp.estimated_price)
    .sort((a, b) => {
      const profitA = (a.estimated_resale_value || 0) - (a.estimated_price || 0);
      const profitB = (b.estimated_resale_value || 0) - (b.estimated_price || 0);
      return profitB - profitA;
    });

  return (
    <div className="min-h-screen bg-background" data-testid="feed-view">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
              <p className="text-sm text-gray-500">New opportunities today</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-feed-btn"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Category Filter */}
          <div className="-mx-4">
            <CategoryFilter selected={category} onSelect={setCategory} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={sortBy} onValueChange={setSortBy} className="px-4 py-4">
        <TabsList className="w-full grid grid-cols-3 h-11 bg-gray-100 rounded-xl p-1">
          <TabsTrigger
            value="newest"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="tab-newest"
          >
            <Clock className="w-4 h-4 mr-2" />
            Newest
          </TabsTrigger>
          <TabsTrigger
            value="profit"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="tab-profit"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Top Profit
          </TabsTrigger>
          <TabsTrigger
            value="distance"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            data-testid="tab-distance"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Nearby
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <TabsContent value={sortBy} className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-64 rounded-xl"></div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="empty-state py-20">
              <Sparkles className="empty-state-icon" />
              <h3 className="empty-state-title">No opportunities found</h3>
              <p className="empty-state-text">
                Try changing filters or expanding your search radius
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {/* Today's Section */}
              {sortBy === 'newest' && todayOpportunities.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-primary">
                      New Today ({todayOpportunities.length})
                    </span>
                  </div>
                </div>
              )}

              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Opportunity Detail Sheet */}
      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default FeedView;
