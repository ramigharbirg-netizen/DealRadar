import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, RefreshCw, Sparkles, MapPin } from 'lucide-react';
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

const calculateOpportunityScore = (opp) => {
  let score = 0;

  if (opp.is_verified) {
    score += 30;
  }

  score -= Number(opp.reports || 0) * 15;

  const createdAt = new Date(opp.created_at || 0).getTime();
  const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);

  if (!Number.isNaN(ageHours) && ageHours <= 24) {
    score += 15;
  }

  return score;
};

export const FeedView = () => {
  const { location, radius } = useLocation();

  const [allOpportunities, setAllOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('smart');
  const [feedError, setFeedError] = useState('');
  const [debugError, setDebugError] = useState('');

  useEffect(() => {
  const handleHardwareBack = (event) => {
    if (detailOpen) {
      setDetailOpen(false);
      setSelectedOpportunity(null);
      event.detail.handled = true;
    }
  };

  window.addEventListener('dealradar:hardware-back', handleHardwareBack);

  return () => {
    window.removeEventListener('dealradar:hardware-back', handleHardwareBack);
  };
}, [detailOpen]);

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
  .select(`
  *,
  user_profiles (
    trust_score,
    verified_deals,
    points,
    approved_submissions,
    total_opportunities,
    avatar_url,
    is_premium
  )
`)
  .eq('is_hidden', false)
  .order('created_at', { ascending: false })
  .limit(100);

      if (error) throw error;

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

  trust_score: opp.user_profiles?.trust_score || 0,
  verified_deals: opp.user_profiles?.verified_deals || 0,
  avatar_url: opp.user_profiles?.avatar_url || null,
  is_premium: opp.user_profiles?.is_premium || false,
  profile_points: opp.user_profiles?.points || 0,
  approved_submissions:
    opp.user_profiles?.approved_submissions || 0,
  total_opportunities_profile:
    opp.user_profiles?.total_opportunities || 0,
}));

      setAllOpportunities(valid);
    } catch (err) {
      console.error('FEED REAL ERROR:', err);
      setAllOpportunities([]);
      setFeedError('Feed non disponibile');
      setDebugError(err?.message || JSON.stringify(err));
    } finally {
      if (!silent) setLoading(false);
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


    return filtered;
  }, [allOpportunities, category, location?.lat, location?.lng]);

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
    if (sortBy === 'smart') {
      return [...opportunities].sort(
        (a, b) => calculateOpportunityScore(b) - calculateOpportunityScore(a)
      );
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
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }, [opportunities, sortBy]);

  return (
  <div className="min-h-screen bg-background pb-20" data-testid="feed-view">
    <div
      className="sticky top-0 z-20 backdrop-blur-md shadow-md"
      style={{
        background: "#FF7A00",
        boxShadow: "0 4px 18px rgba(255, 122, 0, 0.12)",
        borderBottom: "1px solid rgba(255,122,0,0.15)",
      }}
    >
      <div className="px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-black-900">Scopri</h1>
              <p className="text-xs text-black-500">
                Nuove opportunità disponibili oggi
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="-mx-4">
            <CategoryFilter selected={category} onSelect={setCategory} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-0 py-0">

        <div className="mt-4">
          {feedError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-semibold text-red-700">
                {feedError}
              </div>

              <div className="mt-1 break-words text-xs text-red-600">
                {debugError}
              </div>

              <button
                onClick={() => loadOpportunities()}
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

              <h3 className="empty-state-title">
                Nessuna opportunità trovata
              </h3>

              <p className="empty-state-text">
                Prova a cambiare i filtri o ad aumentare il raggio di ricerca
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl pb-20">
              {sortBy === 'newest' && todayOpportunities.length > 0 && (
                <div className="mb-6">
                  <span className="text-sm font-semibold text-primary">
                    Nuove oggi ({todayOpportunities.length})
                  </span>
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
        </div>
</div>

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default FeedView;