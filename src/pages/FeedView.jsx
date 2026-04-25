import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, TrendingUp, RefreshCw, Sparkles, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { CategoryFilter } from '../components/CategoryFilter';

const toRadians = (deg) => (deg * Math.PI) / 180;

const distanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (
    Number.isNaN(nLat1) ||
    Number.isNaN(nLon1) ||
    Number.isNaN(nLat2) ||
    Number.isNaN(nLon2)
  ) {
    return null;
  }

  const R = 6371;
  const dLat = toRadians(nLat2 - nLat1);
  const dLon = toRadians(nLon2 - nLon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(nLat1)) *
      Math.cos(toRadians(nLat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const FeedView = () => {
  const { location, radius } = useLocation();

  const [allOpportunities, setAllOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [feedError, setFeedError] = useState('');
  const [debugError, setDebugError] = useState('');

  const hasLoadedRef = useRef(false);

  const loadOpportunities = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setFeedError('');
    setDebugError('');

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const valid = (data || [])
        .filter((opp) => {
          if (!opp) return false;

          const lat = Number(opp.latitude);
          const lng = Number(opp.longitude);

          return !Number.isNaN(lat) && !Number.isNaN(lng);
        })
        .map((opp) => ({
          ...opp,
          latitude: Number(opp.latitude),
          longitude: Number(opp.longitude),
        }));

      setAllOpportunities(valid);
    } catch (err) {
      console.error('FEED REAL ERROR:', err);
      setAllOpportunities([]);
      setFeedError('Feed non disponibile');
      setDebugError(err?.message || JSON.stringify(err));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    loadOpportunities({ silent: false });
  }, [loadOpportunities]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOpportunities({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const opportunities = useMemo(() => {
    let filtered = [...allOpportunities];

    if (category !== 'all') {
      filtered = filtered.filter((opp) => opp.category === category);
    }

    filtered = filtered.map((opp) => ({
      ...opp,
      distance_km:
        location?.lat != null && location?.lng != null
          ? distanceKm(location.lat, location.lng, opp.latitude, opp.longitude)
          : null,
    }));

    if (location?.lat != null && location?.lng != null) {
      filtered = filtered.filter(
        (opp) => opp.distance_km == null || opp.distance_km <= radius
      );
    }

    return filtered;
  }, [allOpportunities, category, radius, location?.lat, location?.lng]);

  const todayOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (!opp.created_at) return false;

      const created = new Date(opp.created_at);
      if (Number.isNaN(created.getTime())) return false;

      const today = new Date();
      return created.toDateString() === today.toDateString();
    });
  }, [opportunities]);

  const displayedOpportunities = useMemo(() => {
    if (sortBy === 'profit') {
      return [...opportunities]
        .filter(
          (opp) =>
            opp.estimated_resale_value != null &&
            opp.estimated_price != null &&
            !Number.isNaN(Number(opp.estimated_resale_value)) &&
            !Number.isNaN(Number(opp.estimated_price))
        )
        .sort((a, b) => {
          const profitA =
            Number(a.estimated_resale_value || 0) - Number(a.estimated_price || 0);
          const profitB =
            Number(b.estimated_resale_value || 0) - Number(b.estimated_price || 0);
          return profitB - profitA;
        });
    }

    if (sortBy === 'distance') {
      return [...opportunities].sort((a, b) => {
        const aDist = a.distance_km ?? Number.MAX_SAFE_INTEGER;
        const bDist = b.distance_km ?? Number.MAX_SAFE_INTEGER;
        return aDist - bDist;
      });
    }

    return [...opportunities].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [opportunities, sortBy]);

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="feed-view">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
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
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="-mx-4">
            <CategoryFilter selected={category} onSelect={setCategory} />
          </div>
        </div>
      </div>

      <Tabs value={sortBy} onValueChange={setSortBy} className="mx-auto max-w-4xl px-4 py-4">
        <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-gray-100 p-1">
          <TabsTrigger
            value="newest"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Clock className="mr-2 h-4 w-4" />
            Newest
          </TabsTrigger>

          <TabsTrigger
            value="profit"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Top Profit
          </TabsTrigger>

          <TabsTrigger
            value="distance"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Nearby
          </TabsTrigger>
        </TabsList>

        <TabsContent value={sortBy} className="mt-4">
          {feedError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-semibold text-red-700">{feedError}</div>
              <div className="mt-1 break-words text-xs text-red-600">{debugError}</div>
              <button
                type="button"
                onClick={() => loadOpportunities({ silent: false })}
                className="mt-2 text-sm font-semibold text-primary"
              >
                Riprova
              </button>
            </div>
          )}

          {loading ? (
            <div className="mx-auto max-w-4xl space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-64 rounded-xl"></div>
              ))}
            </div>
          ) : displayedOpportunities.length === 0 ? (
            <div className="empty-state py-20">
              <Sparkles className="empty-state-icon" />
              <h3 className="empty-state-title">No opportunities found</h3>
              <p className="empty-state-text">
                Try changing filters or expanding your search radius
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-3 pb-20">
              {sortBy === 'newest' && todayOpportunities.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                    <span className="text-sm font-semibold text-primary">
                      New Today ({todayOpportunities.length})
                    </span>
                  </div>
                </div>
              )}

              {displayedOpportunities.map((opp) => (
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

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default FeedView;