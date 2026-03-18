import React, { useState, useEffect } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { favoritesAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
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

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const res = await favoritesAPI.getAll();
      setFavorites(res.data);
    } catch (err) {
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (e, opportunityId) => {
    e.stopPropagation();
    try {
      await favoritesAPI.remove(opportunityId);
      setFavorites(prev => prev.filter(f => f.id !== opportunityId));
      toast.success('Removed from favorites');
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Save Your Favorites</h2>
          <p className="text-gray-500 mb-6">
            Login to save and access your favorite opportunities
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full bg-primary rounded-xl h-12"
            data-testid="login-btn"
          >
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="favorites-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Saved</h1>
          <p className="text-sm text-gray-500">Your favorite opportunities</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-64 rounded-xl"></div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty-state py-20">
            <Heart className="empty-state-icon" />
            <h3 className="empty-state-title">No saved opportunities</h3>
            <p className="empty-state-text">
              Tap the heart icon on any opportunity to save it here
            </p>
            <Button
              onClick={() => navigate('/')}
              className="mt-4 bg-primary rounded-xl"
            >
              Explore Opportunities
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
                  onClick={(e) => removeFavorite(e, opp.id)}
                  data-testid={`remove-favorite-${opp.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opportunity Detail Sheet */}
      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default Favorites;
