import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Star,
  ShieldCheck,
  MapPin,
  ChevronLeft,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';

const levelLabels = {
  new_member: 'Nuovo membro',
  contributor: 'Contributor',
  trusted_member: 'Trusted Member',
  elite_member: 'Elite Member',
};

const PUBLIC_PROFILE_PAGE_SIZE = 25;

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hasMoreOpportunities, setHasMoreOpportunities] = useState(true);
  const [loadingMoreOpportunities, setLoadingMoreOpportunities] =
    useState(false);

  const opportunitiesCursorRef = useRef(null);
  const opportunitiesLoadMoreRef = useRef(null);
  const opportunitiesLoadMoreInFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;

    const loadPublicProfile = async () => {
      try {
        setLoading(true);
        setProfile(null);
        setOpportunities([]);
        setHasMoreOpportunities(true);
        setLoadingMoreOpportunities(false);

        opportunitiesCursorRef.current = null;
        opportunitiesLoadMoreInFlightRef.current = false;

        const [
          { data: profileData, error: profileError },
          { data: oppsData, error: oppsError },
        ] = await Promise.all([
          supabase
            .from('public_user_profiles')
            .select(`
              user_id,
              display_name,
              avatar_url,
              is_premium,
              trust_score,
              points,
              reputation_level,
              total_opportunities,
              verified_deals
            `)
            .eq('user_id', userId)
            .single(),

          supabase
            .from('opportunities')
            .select(`
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
              thumbnail_url,
              user_name,
              user_id,
              confirmations,
              reports,
              verified_count,
              is_verified,
              attributes,
              merchant_name,
              expires_at,
              lifecycle_status
            `)
            .eq('user_id', userId)
            .eq('is_hidden', false)
            .eq('lifecycle_status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(PUBLIC_PROFILE_PAGE_SIZE),
        ]);

        if (profileError) throw profileError;
        if (oppsError) throw oppsError;

        if (loadGenerationRef.current !== generation) {
          return;
        }

        const firstPage = oppsData || [];
        const lastOpportunity = firstPage[firstPage.length - 1];

        opportunitiesCursorRef.current = lastOpportunity
          ? {
              createdAt: lastOpportunity.created_at,
              id: lastOpportunity.id,
            }
          : null;

        setHasMoreOpportunities(
          firstPage.length === PUBLIC_PROFILE_PAGE_SIZE
        );

        setProfile(profileData);
        setOpportunities(firstPage);
      } catch (err) {
        if (loadGenerationRef.current === generation) {
          console.error('Public profile error:', err);
        }
      } finally {
        if (loadGenerationRef.current === generation) {
          setLoading(false);
        }
      }
    };

    if (userId) {
      loadPublicProfile();
    }

    return () => {
      if (loadGenerationRef.current === generation) {
        loadGenerationRef.current += 1;
      }
    };
  }, [userId]);

  const loadMoreOpportunities = useCallback(async () => {
    if (
      !userId ||
      opportunitiesLoadMoreInFlightRef.current ||
      !hasMoreOpportunities ||
      !opportunitiesCursorRef.current
    ) {
      return;
    }

    const generation = loadGenerationRef.current;
    const requestedUserId = userId;
    const cursor = opportunitiesCursorRef.current;

    opportunitiesLoadMoreInFlightRef.current = true;
    setLoadingMoreOpportunities(true);

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
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
          thumbnail_url,
          user_name,
          user_id,
          confirmations,
          reports,
          verified_count,
          is_verified,
          attributes,
          merchant_name,
          expires_at,
          lifecycle_status
        `)
        .eq('user_id', requestedUserId)
        .eq('is_hidden', false)
        .eq('lifecycle_status', 'active')
        .gt('expires_at', new Date().toISOString())
        .or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PUBLIC_PROFILE_PAGE_SIZE);

      if (error) throw error;

      if (loadGenerationRef.current !== generation) {
        return;
      }

      const nextPage = data || [];
      const lastOpportunity = nextPage[nextPage.length - 1];

      if (lastOpportunity) {
        opportunitiesCursorRef.current = {
          createdAt: lastOpportunity.created_at,
          id: lastOpportunity.id,
        };
      }

      setHasMoreOpportunities(
        nextPage.length === PUBLIC_PROFILE_PAGE_SIZE
      );

      setOpportunities((current) => {
        const existingIds = new Set(current.map((opp) => opp.id));

        return [
          ...current,
          ...nextPage.filter((opp) => !existingIds.has(opp.id)),
        ];
      });
    } catch (err) {
      if (loadGenerationRef.current === generation) {
        console.error(
          'Error loading more public profile opportunities:',
          err
        );
      }
    } finally {
      if (loadGenerationRef.current === generation) {
        opportunitiesLoadMoreInFlightRef.current = false;
        setLoadingMoreOpportunities(false);
      }
    }
  }, [userId, hasMoreOpportunities]);

  useEffect(() => {
    const sentinel = opportunitiesLoadMoreRef.current;

    if (loading || !sentinel || !hasMoreOpportunities) {
      return;
    }

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
  }, [
    loading,
    hasMoreOpportunities,
    loadMoreOpportunities,
    opportunities.length,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <User className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h2 className="font-bold text-lg mb-2">Profilo non trovato</h2>
            <Button onClick={() => navigate(-1)} variant="outline">
              Torna indietro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const level = profile.reputation_level || 'new_member';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-primary to-emerald-400 px-4 pt-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Indietro
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-white/20 overflow-hidden border-2 border-white flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Utente'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-white">
                  {(profile.display_name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="truncate">
                  {profile.display_name || 'Utente DealRadar'}
                </span>

                {profile.is_premium && (
                  <span
                    title="Premium"
                    className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white"
                  >
                    ✓
                  </span>
                )}
              </h1>

              <Badge className="mt-2 bg-white text-primary hover:bg-white">
                {levelLabels[level] || 'Nuovo membro'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <StatItem
                icon={<Star className="w-4 h-4 text-primary" />}
                value={profile.points || 0}
                label="Punti"
              />

              <StatItem
                icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
                value={profile.trust_score || 0}
                label="Trust"
              />

              <StatItem
                icon={<MapPin className="w-4 h-4 text-blue-500" />}
                value={profile.total_opportunities || 0}
                label="Opportunità"
              />

              <StatItem
                icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
                value={profile.verified_deals || 0}
                label="Verificate"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Opportunità pubblicate
        </h2>

        {opportunities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Questo utente non ha opportunità attive.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={{
                  ...opp,
                  avatar_url: profile.avatar_url,
                  is_premium: profile.is_premium,
                  trust_score: profile.trust_score,
                  verified_deals: profile.verified_deals,
                  profile_points: profile.points,
                }}
                onClick={() => {
                  setSelectedOpportunity({
                    ...opp,
                    avatar_url: profile.avatar_url,
                    is_premium: profile.is_premium,
                    trust_score: profile.trust_score,
                    verified_deals: profile.verified_deals,
                    profile_points: profile.points,
                  });
                  setDetailOpen(true);
                }}
              />
            ))}

            {hasMoreOpportunities && (
              <div
                ref={opportunitiesLoadMoreRef}
                className="h-1"
                aria-hidden="true"
              />
            )}

            {loadingMoreOpportunities && (
              <p className="py-3 text-center text-xs text-gray-400">
                Caricamento altre opportunità...
              </p>
            )}
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

const StatItem = ({ icon, value, label }) => (
  <div className="text-center px-2">
    <div className="flex items-center justify-center mb-1">{icon}</div>
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

export default PublicProfile;