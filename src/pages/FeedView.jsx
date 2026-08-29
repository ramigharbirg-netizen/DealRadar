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

const feedCache = new Map();
const FEED_PAGE_SIZE = 25;

export const FeedView = () => {
  const { location, radius } = useLocation();

  const [allOpportunities, setAllOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contentType, setContentType] = useState('all');
  const [category, setCategory] = useState('all');
  const [feedError, setFeedError] = useState('');
  const [debugError, setDebugError] = useState('');

    const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const feedCursorRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const loadMoreInFlightRef = useRef(false);

  const activeFeedKeyRef = useRef(`${contentType}:${category}`);
  activeFeedKeyRef.current = `${contentType}:${category}`;

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

  const loadOpportunities = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setFeedError('');
      setDebugError('');

      try {
        const requestKey = `${contentType}:${category}`;

        const { data, error } = await supabase.rpc('get_smart_feed_page', {
          p_content_type: contentType,
          p_category: category,
          p_limit: FEED_PAGE_SIZE,
          p_cursor_score: null,
          p_cursor_created_at: null,
          p_cursor_id: null,
        });

        if (error) throw error;

        if (activeFeedKeyRef.current !== requestKey) {
          return;
        }

        const valid = (data || []).map((opp) => ({
          ...opp,
          latitude: Number(opp.latitude),
          longitude: Number(opp.longitude),
          avatar_url: opp.avatar_url || null,
          is_premium: opp.is_premium || false,
        }));

        const lastOpportunity = valid[valid.length - 1];

        feedCursorRef.current = lastOpportunity
          ? {
              score: lastOpportunity.smart_score,
              createdAt: lastOpportunity.created_at,
              id: lastOpportunity.id,
            }
          : null;

        setHasMore(valid.length === FEED_PAGE_SIZE);

        const cacheKey = `${contentType}:${category}`;

        feedCache.set(cacheKey, {
          items: valid,
          cursor: feedCursorRef.current,
          hasMore: valid.length === FEED_PAGE_SIZE,
        });

        setAllOpportunities(valid);
      } catch (err) {
        console.error('FEED REAL ERROR:', err);

        const cacheKey = `${contentType}:${category}`;
        const cachedFeed = feedCache.get(cacheKey);

        if (!cachedFeed) {
          setAllOpportunities([]);
          setFeedError('Feed non disponibile');
        }

        setDebugError(err?.message || JSON.stringify(err));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [contentType, category]
  );

  const loadMoreOpportunities = useCallback(async () => {
    if (
      loadMoreInFlightRef.current ||
      !hasMore ||
      !feedCursorRef.current
    ) {
      return;
    }

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);

    try {
      const requestKey = `${contentType}:${category}`;
      const cursor = feedCursorRef.current;

      const { data, error } = await supabase.rpc('get_smart_feed_page', {
        p_content_type: contentType,
        p_category: category,
        p_limit: FEED_PAGE_SIZE,
        p_cursor_score: cursor.score,
        p_cursor_created_at: cursor.createdAt,
        p_cursor_id: cursor.id,
      });

      if (error) throw error;

      if (activeFeedKeyRef.current !== requestKey) {
        return;
      }

      const nextPage = (data || []).map((opp) => ({
        ...opp,
        latitude: Number(opp.latitude),
        longitude: Number(opp.longitude),
        avatar_url: opp.avatar_url || null,
        is_premium: opp.is_premium || false,
      }));

      const lastOpportunity = nextPage[nextPage.length - 1];

      if (lastOpportunity) {
        feedCursorRef.current = {
          score: lastOpportunity.smart_score,
          createdAt: lastOpportunity.created_at,
          id: lastOpportunity.id,
        };
      }

      setHasMore(nextPage.length === FEED_PAGE_SIZE);

      setAllOpportunities((current) => {
        const existingIds = new Set(current.map((opp) => opp.id));

        const merged = [
          ...current,
          ...nextPage.filter((opp) => !existingIds.has(opp.id)),
        ];

        const cacheKey = `${contentType}:${category}`;

        feedCache.set(cacheKey, {
          items: merged,
          cursor: feedCursorRef.current,
          hasMore: nextPage.length === FEED_PAGE_SIZE,
        });

        return merged;
      });
    } catch (err) {
      console.error('FEED LOAD MORE ERROR:', err);
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [contentType, category, hasMore]);

useEffect(() => {
  const sentinel = loadMoreSentinelRef.current;

  if (loading || !sentinel || !hasMore) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const firstEntry = entries[0];

      if (firstEntry?.isIntersecting) {
        loadMoreOpportunities();
      }
    },
    {
      root: null,
      rootMargin: '1600px 0px',
      threshold: 0,
    }
  );

  observer.observe(sentinel);

  return () => {
    observer.disconnect();
  };
}, [loading, hasMore, loadMoreOpportunities, allOpportunities.length]);

useEffect(() => {
  const cacheKey = `${contentType}:${category}`;
  const cachedFeed = feedCache.get(cacheKey);

  if (cachedFeed) {
    setAllOpportunities(cachedFeed.items);
    feedCursorRef.current = cachedFeed.cursor;
    setHasMore(cachedFeed.hasMore);
    setLoading(false);
    return;
  }

  feedCursorRef.current = null;
  setHasMore(true);

  loadOpportunities({ silent: false });
}, [contentType, category, loadOpportunities]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadOpportunities({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const opportunities = useMemo(() => {
  return allOpportunities.map((opp) => ({
    ...opp,
    distance_km:
      location?.lat != null && location?.lng != null
        ? distanceKm(location.lat, location.lng, opp.latitude, opp.longitude)
        : null,
  }));
}, [
  allOpportunities,
  location?.lat,
  location?.lng,
]);

  const displayedOpportunities = opportunities;

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
            <CategoryFilter
              selectedContentType={contentType}
              onContentTypeSelect={setContentType}
              selectedCategory={category}
              onCategorySelect={setCategory}
            />
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

              <div ref={loadMoreSentinelRef} className="h-1" />

{loadingMore && (
  <div className="py-4 text-center text-sm text-muted-foreground">
    Caricamento...
  </div>
)}
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