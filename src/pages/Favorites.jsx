import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          opportunity_id,
          opportunities (
            *
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validFavorites = (data || [])
        .map((fav) => fav.opportunities)
        .filter((opp) => opp && opp.is_hidden !== true);

      setFavorites(validFavorites);
    } catch (err) {
      console.error('Load favorites error:', err);
      toast.error('Impossibile caricare i preferiti');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user, loadFavorites]);

  const removeFavorite = async (e, opportunityId) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('opportunity_id', opportunityId);

      if (error) throw error;

      setFavorites((prev) =>
        prev.filter((opp) => opp.id !== opportunityId)
      );

      toast.success('Rimosso dai preferiti');
    } catch (err) {
      console.error('Remove favorite error:', err);
      toast.error('Impossibile rimuovere il preferito');
    }
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
              ></div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
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
            {favorites.map((opp) => (
              <div key={opp.id} className="relative">
                <OpportunityCard
                  opportunity={opp}
                  onClick={() => {
                    setSelectedOpportunity(opp);
                    setDetailOpen(true);
                  }}
                />

                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 h-9 w-9 rounded-full"
                  onClick={(e) =>
                    removeFavorite(e, opp.id)
                  }
                  data-testid={`remove-favorite-${opp.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default Favorites;