import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { toast } from 'sonner';
import { isOpportunityPubliclyActive } from '../utils/opportunityLifecycle';
import { useNavigate } from 'react-router-dom';

const FAVORITES_PAGE_SIZE = 25;

const FAVORITE_OPPORTUNITY_SELECT = `
  id,
  opportunity_id,
  created_at,
  opportunities (
    id,
    created_at,
    title,
    description,
    category,
    subcategory,
    content_type,
    latitude,
    longitude,
    address,
    estimated_price,
    estimated_resale_value,
    contact_phone,
    contact_email,
    contact_link,
    images,
    user_name,
    user_id,
    confirmations,
    reports,
    verified_count,
    is_verified,
    attributes,
    merchant_name,
    is_hidden,
    expires_at,
    lifecycle_status
  )
`;

export const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadMoreRef = useRef(null);
  const cursorRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    const handleHardwareBack = (event) => {
      if (detailOpen) {
        setDetailOpen(false);
        setSelectedOpportunity(null);
        event.detail.handled = true;
      }
    };

    window.addEventListener(
      'dealradar:hardware-back',
      handleHardwareBack
    );

    return () => {
      window.removeEventListener(
        'dealradar:hardware-back',
        handleHardwareBack
      );
    };
  }, [detailOpen]);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;

    const loadFavorites = async () => {
      if (!user?.id) {
        if (loadGenerationRef.current !== generation) return;

        setFavorites([]);
        cursorRef.current = null;
        setHasMore(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFavorites([]);
      cursorRef.current = null;
      setHasMore(false);

      try {
        const { data, error } = await supabase
          .from('favorites')
          .select(FAVORITE_OPPORTUNITY_SELECT)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(FAVORITES_PAGE_SIZE);

        if (error) throw error;

        if (loadGenerationRef.current !== generation) return;

        const rows = data || [];

        const validFavorites = rows
          .map((favorite) => favorite.opportunities)
          .filter(
            (opportunity) =>
              opportunity &&
              isOpportunityPubliclyActive(opportunity)
          );

        setFavorites(validFavorites);

        const lastRow = rows[rows.length - 1];

        cursorRef.current = lastRow
          ? {
              createdAt: lastRow.created_at,
              id: lastRow.id,
            }
          : null;

        setHasMore(rows.length === FAVORITES_PAGE_SIZE);
      } catch (err) {
        if (loadGenerationRef.current !== generation) return;

        console.error('Load favorites error:', err);
        toast.error('Impossibile caricare i preferiti');

        setFavorites([]);
        cursorRef.current = null;
        setHasMore(false);
      } finally {
        if (loadGenerationRef.current === generation) {
          setLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      if (loadGenerationRef.current === generation) {
        loadGenerationRef.current += 1;
      }
    };
  }, [user?.id]);

  const loadMoreFavorites = useCallback(async () => {
    if (
      !user?.id ||
      !hasMore ||
      loadingMoreRef.current ||
      !cursorRef.current
    ) {
      return;
    }

    const generation = loadGenerationRef.current;
    const requestedUserId = user.id;
    const cursor = cursorRef.current;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(FAVORITE_OPPORTUNITY_SELECT)
        .eq('user_id', requestedUserId)
        .or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(FAVORITES_PAGE_SIZE);

      if (error) throw error;

      if (loadGenerationRef.current !== generation) return;

      const rows = data || [];

      const nextFavorites = rows
        .map((favorite) => favorite.opportunities)
        .filter(
          (opportunity) =>
            opportunity &&
            isOpportunityPubliclyActive(opportunity)
        );

      setFavorites((currentFavorites) => {
        const existingIds = new Set(
          currentFavorites.map((opportunity) => opportunity.id)
        );

        const uniqueNewFavorites = nextFavorites.filter(
          (opportunity) => !existingIds.has(opportunity.id)
        );

        return [...currentFavorites, ...uniqueNewFavorites];
      });

      const lastRow = rows[rows.length - 1];

      cursorRef.current = lastRow
        ? {
            createdAt: lastRow.created_at,
            id: lastRow.id,
          }
        : cursorRef.current;

      setHasMore(rows.length === FAVORITES_PAGE_SIZE);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;

      console.error('Load more favorites error:', err);
      toast.error('Impossibile caricare altri preferiti');
    } finally {
      if (loadGenerationRef.current === generation) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [hasMore, user?.id]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore || loading) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreFavorites();
        }
      },
      {
        rootMargin: '1600px 0px',
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMoreFavorites]);

  const removeFavorite = async (event, opportunityId) => {
    event.stopPropagation();

    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('opportunity_id', opportunityId);

      if (error) throw error;

      setFavorites((currentFavorites) =>
        currentFavorites.filter(
          (opportunity) => opportunity.id !== opportunityId
        )
      );

      if (selectedOpportunity?.id === opportunityId) {
        setDetailOpen(false);
        setSelectedOpportunity(null);
      }

      toast.success('Rimosso dai preferiti');
    } catch (err) {
      console.error('Remove favorite error:', err);
      toast.error('Impossibile rimuovere il preferito');
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedOpportunity(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-red-400" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Salva le tue opportunità
          </h2>

          <p className="text-gray-500 mb-6">
            Accedi per salvare e ritrovare le opportunità che ti interessano.
          </p>

          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-primary rounded-xl h-12"
            data-testid="login-btn"
          >
            Accedi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background pb-20"
      data-testid="favorites-page"
    >
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Preferiti
          </h1>

          <p className="text-sm text-gray-500">
            Le opportunità che hai salvato
          </p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton h-64 rounded-xl"
              />
            ))}
          </div>
        ) : favorites.length === 0 && !hasMore ? (
          <div className="empty-state py-20">
            <Heart className="empty-state-icon" />

            <h3 className="empty-state-title">
              Nessuna opportunità salvata
            </h3>

            <p className="empty-state-text">
              Tocca il cuore su un’opportunità per salvarla qui.
            </p>

            <Button
              onClick={() => navigate('/feed')}
              className="mt-4 bg-primary rounded-xl"
            >
              Esplora opportunità
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((opportunity) => (
              <div
                key={opportunity.id}
                className="relative"
              >
                <OpportunityCard
                  opportunity={opportunity}
                  onClick={() => {
                    setSelectedOpportunity(opportunity);
                    setDetailOpen(true);
                  }}
                />

                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 h-9 w-9 rounded-full"
                  onClick={(event) =>
                    removeFavorite(event, opportunity.id)
                  }
                  data-testid={`remove-favorite-${opportunity.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {hasMore && (
              <div
                ref={loadMoreRef}
                className="py-6 text-center text-sm text-gray-500"
              >
                {loadingMore
                  ? 'Caricamento altri preferiti...'
                  : 'Caricamento...'}
              </div>
            )}
          </div>
        )}
      </div>

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={closeDetail}
      />
    </div>
  );
};

export default Favorites;