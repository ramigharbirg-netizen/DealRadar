import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Navigation,
  MapPin,
  Store,
  Package,
  Wrench,
  Building2,
  Box,
  Gift,
  Gavel,
  Star,
  MapPinOff,
  Heart,
  Clock,
  SlidersHorizontal,
  X,
  Check,
  Euro,
  TrendingUp,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { MapPreviewCard } from '../components/MapPreviewCard';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER = [41.9028, 12.4964];

const categoryIcons = {
  store_liquidation: { icon: Store, color: '#00C853', name: 'Liquidazione' },
  product_stock: { icon: Package, color: '#F59E0B', name: 'Stock' },
  equipment: { icon: Wrench, color: '#3B82F6', name: 'Attrezzatura' },
  business_sale: { icon: Building2, color: '#8B5CF6', name: 'Attività' },
  objects: { icon: Box, color: '#06B6D4', name: 'Oggetti' },
  free_deals: { icon: Gift, color: '#16A34A', name: 'Gratis' },
  auctions: { icon: Gavel, color: '#EF4444', name: 'Aste' },
  user_reported: { icon: Star, color: '#F97316', name: 'Segnalate' },
};

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

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getIconSvg = (category) => {
  const paths = {
    store_liquidation:
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
    product_stock:
      '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/>',
    equipment:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    business_sale:
      '<path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/><path d="M18 11h4v11h-9"/><path d="M6 12H2v10h4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',
      objects:
  '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    free_deals:
  '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
    auctions:
      '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/>',
    user_reported:
      '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  };

  return paths[category] || paths.user_reported;
};

const createCustomIcon = (category) => {
  const config = categoryIcons[category] || categoryIcons.user_reported;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="custom-marker marker-${category}" style="background-color: ${config.color}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${getIconSvg(category)}
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
};

const MapController = ({ center, zoom, shouldRecenter, onRecenterDone }) => {
  const map = useMap();

  useEffect(() => {
    if (center && shouldRecenter) {
      map.setView(center, zoom || map.getZoom());
      onRecenterDone?.();
    }
  }, [center, zoom, shouldRecenter, map, onRecenterDone]);

  return null;
};

const MapInteractionController = ({ enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (enabled) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } else {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }
  }, [enabled, map]);

  return null;
};

const UserLocationMarker = ({ position }) => {
  const userIcon = L.divIcon({
    className: 'user-location-icon',
    html: `
      <div class="user-location-marker">
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return <Marker position={position} icon={userIcon} />;
};

const HomeOpportunityCard = ({ opportunity, onClick }) => {
  const firstImage =
    Array.isArray(opportunity.images) && opportunity.images.length > 0
      ? opportunity.images[0]
      : null;

  const price = Number(opportunity.estimated_price || 0);
  const resale = Number(opportunity.estimated_resale_value || 0);
  const profit = resale > price ? resale - price : null;
  const categoryConfig = categoryIcons[opportunity.category] || categoryIcons.user_reported;
  const CategoryIcon = categoryConfig.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[390px] w-[270px] flex-col overflow-hidden rounded-[28px] bg-white text-left shadow-[0_14px_40px_rgba(78,40,10,0.14)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(78,40,10,0.20)]"
    >
      <div className="relative h-40 overflow-hidden bg-orange-100">
        {firstImage ? (
          <img
            src={firstImage}
            alt={opportunity.title || 'Opportunità'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: `${categoryConfig.color}22` }}
          >
            <CategoryIcon className="h-12 w-12" style={{ color: categoryConfig.color }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        <div
          className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black text-white shadow-lg"
          style={{ backgroundColor: categoryConfig.color }}
        >
          {categoryConfig.name}
        </div>

        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow">
          <Heart className="h-4 w-4 text-orange-500" />
        </div>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 min-h-[48px] text-lg font-black leading-tight text-gray-950">
          {opportunity.title || 'Opportunità senza titolo'}
        </h3>

        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-500">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span className="line-clamp-1">
            {opportunity.address || 'Zona non specificata'}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Prezzo
            </p>
            <p className="text-2xl font-black text-emerald-700">
              € {price.toLocaleString('it-IT')}
            </p>
          </div>

          {profit != null && (
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase text-emerald-500">
                Profitto
              </p>
              <p className="text-sm font-black text-emerald-700">
                +€ {profit.toLocaleString('it-IT')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {opportunity.distance_km
              ? `${opportunity.distance_km.toFixed(1)} km`
              : 'Vicino'}
          </span>

          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {opportunity.created_at
              ? new Date(opportunity.created_at).toLocaleDateString('it-IT')
              : 'Nuova'}
          </span>
        </div>
      </div>
    </button>
  );
};
export const MapView = () => {
  const {
    location,
    radius,
    permissionState,
    isUsingUserLocation,
    requestLocation,
    error: locationError,
  } = useLocation();

  const [allOpportunities, setAllOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [manualCenter, setManualCenter] = useState(null);
  const [shouldRecenter, setShouldRecenter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState('');
  const [debugError, setDebugError] = useState('');
  const [mapInteractive, setMapInteractive] = useState(false);
const [filtersOpen, setFiltersOpen] = useState(false);
const [homeSort, setHomeSort] = useState('recent');
const [onlyVerified, setOnlyVerified] = useState(false);
const [onlyHighValue, setOnlyHighValue] = useState(false);
const [maxPrice, setMaxPrice] = useState('');

  const mapRef = useRef(null);
  const opportunitiesScrollRef = useRef(null);
  const hasLoadedOpportunitiesRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const runPlaceSearch = async () => {
      const cleanQuery = placeQuery.trim();

      if (cleanQuery.length < 3) {
        setPlaceResults([]);
        setSearchingPlaces(false);
        return;
      }

      setSearchingPlaces(true);

      try {
        const params = new URLSearchParams({
          q: cleanQuery,
          format: 'jsonv2',
          limit: '5',
          countrycodes: 'it',
          addressdetails: '1',
        });

        if (location?.lat && location?.lng) {
          params.append(
            'viewbox',
            `${location.lng - 0.25},${location.lat + 0.15},${location.lng + 0.25},${location.lat - 0.15}`
          );
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          }
        );

        const rawText = await res.text();

        if (!res.ok) {
          throw new Error(`Nominatim HTTP ${res.status}: ${rawText || 'Empty response'}`);
        }

        let parsedResults = [];

        try {
          parsedResults = JSON.parse(rawText);
        } catch (parseErr) {
          console.error('Nominatim JSON parse error:', parseErr);
          parsedResults = [];
        }

        if (!isCancelled) {
          setPlaceResults(Array.isArray(parsedResults) ? parsedResults : []);
        }
      } catch (err) {
        console.error('Place search error:', err);
        if (!isCancelled) setPlaceResults([]);
      } finally {
        if (!isCancelled) setSearchingPlaces(false);
      }
    };

    const timer = setTimeout(runPlaceSearch, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [placeQuery, location?.lat, location?.lng]);

  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    setOpportunitiesError('');
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

      const validOpportunities = (data || [])
        .filter(
          (opp) =>
            opp &&
            opp.latitude !== null &&
            opp.latitude !== undefined &&
            opp.longitude !== null &&
            opp.longitude !== undefined &&
            !Number.isNaN(Number(opp.latitude)) &&
            !Number.isNaN(Number(opp.longitude))
        )
        .map((opp) => ({
          ...opp,
          latitude: Number(opp.latitude),
          longitude: Number(opp.longitude),
          trust_score: opp.user_profiles?.trust_score || 0,
verified_deals: opp.user_profiles?.verified_deals || 0,
profile_points: opp.user_profiles?.points || 0,
avatar_url: opp.user_profiles?.avatar_url || null,
is_premium: opp.user_profiles?.is_premium || false,
approved_submissions:
  opp.user_profiles?.approved_submissions || 0,
total_opportunities_profile:
  opp.user_profiles?.total_opportunities || 0,
        }));

      setAllOpportunities(validOpportunities);
    } catch (err) {
      console.error('MAP REAL ERROR:', err);
      setAllOpportunities([]);
      setOpportunitiesError('Opportunità non disponibili');
      setDebugError(err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedOpportunitiesRef.current) return;
    hasLoadedOpportunitiesRef.current = true;
    loadOpportunities();
  }, [loadOpportunities]);

  const filteredOpportunities = useMemo(() => {
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

    filtered.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    return filtered;
  }, [allOpportunities, category, radius, location?.lat, location?.lng]);

  const categoryStats = useMemo(() => {
    const stats = Object.entries(categoryIcons).map(([key, config]) => {
      const items = filteredOpportunities.filter((opp) => opp.category === key);

      return {
        key,
        name: config.name,
        Icon: config.icon,
        color: config.color,
        count: items.length,
      };
    });

    return stats.filter((item) => item.count > 0);
  }, [filteredOpportunities]);
const latestOpportunities = useMemo(() => {
  let items = [...allOpportunities];

  if (category !== 'all') {
    items = items.filter((opp) => opp.category === category);
  }

  if (onlyVerified) {
    items = items.filter((opp) => opp.is_verified === true);
  }

  if (onlyHighValue) {
    items = items.filter((opp) => opp.is_high_value === true);
  }

  if (maxPrice !== '') {
    items = items.filter((opp) => {
      const price = Number(opp.estimated_price);
      return !Number.isNaN(price) && price <= Number(maxPrice);
    });
  }

  items = items.map((opp) => ({
    ...opp,
    distance_km:
      location?.lat != null && location?.lng != null
        ? distanceKm(location.lat, location.lng, opp.latitude, opp.longitude)
        : null,
  }));

  if (homeSort === 'distance') {
    items.sort((a, b) => {
      const aDist = a.distance_km ?? Number.MAX_SAFE_INTEGER;
      const bDist = b.distance_km ?? Number.MAX_SAFE_INTEGER;
      return aDist - bDist;
    });
  } else if (homeSort === 'profit') {
    items.sort((a, b) => {
      const profitA =
        Number(a.estimated_resale_value || 0) - Number(a.estimated_price || 0);
      const profitB =
        Number(b.estimated_resale_value || 0) - Number(b.estimated_price || 0);
      return profitB - profitA;
    });
  } else if (homeSort === 'price_low') {
    items.sort(
      (a, b) =>
        Number(a.estimated_price || 0) - Number(b.estimated_price || 0)
    );
  } else {
    items.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }

  return items;
}, [
  allOpportunities,
  category,
  location?.lat,
  location?.lng,
  homeSort,
  onlyVerified,
  onlyHighValue,
  maxPrice,
]);

const featuredOpportunities = useMemo(() => {
  return latestOpportunities.slice(0, 5);
}, [latestOpportunities]);

  const searchResults = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();

    if (q.length < 2) return [];

    return allOpportunities
      .filter((opp) => {
        const title = String(opp.title || '').toLowerCase();
        const description = String(opp.description || '').toLowerCase();
        const categoryValue = String(opp.category || '').toLowerCase();

        return title.includes(q) || description.includes(q) || categoryValue.includes(q);
      })
      .slice(0, 5);
  }, [placeQuery, allOpportunities]);

  const isSearchActive =
    placeQuery.trim().length >= 2 ||
    searchingPlaces ||
    placeResults.length > 0 ||
    searchResults.length > 0;

  const handleMarkerClick = (opp) => {
    setSelectedOpportunity(opp);
  };

  const handlePlaceSelect = (place) => {
    const lat = Number(place.lat);
    const lng = Number(place.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Coordinate luogo non valide');
      return;
    }

    setSelectedPlace(place);
    setManualCenter([lat, lng]);
    setPlaceQuery(place.display_name);
    setPlaceResults([]);
    setShouldRecenter(true);

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 14);
    }

    toast.success('Luogo trovato');
  };

  const handleLocateMe = async () => {
    try {
      const position = await requestLocation();

      if (!position) {
        setShowLocationModal(true);
        return;
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setSelectedPlace(null);
      setManualCenter([lat, lng]);
      setShouldRecenter(true);

      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
      }

      toast.success('Posizione aggiornata');
    } catch (err) {
      console.error('Locate me error:', err);
      toast.error('Impossibile aggiornare la posizione');
    }
  };

  const scrollOpportunities = (direction) => {
  if (!opportunitiesScrollRef.current) return;

  const scrollAmount = 320;

  opportunitiesScrollRef.current.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth',
  });
};

  const handleLocationPermission = async () => {
    try {
      const position = await requestLocation();

      if (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setSelectedPlace(null);
        setManualCenter([lat, lng]);
        setShouldRecenter(true);

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 13);
        }

        toast.success('Posizione aggiornata');
      }
    } catch (err) {
      console.error('Location permission error:', err);
    } finally {
      setShowLocationModal(false);
    }
  };

  const mapCenter =
    manualCenter ||
    (location?.lat && location?.lng ? [location.lat, location.lng] : DEFAULT_MAP_CENTER);

  return (
    <div
  className="min-h-screen pb-24"
  data-testid="map-view"
  style={{
    background: '#FFE6C7',
  }}
    >
      <div
  className="relative overflow-hidden pb-16"
  style={{
    background: '#FFE6C7',
  }}
>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.45),transparent_35%)]" />

        <div className="relative z-20 mx-auto max-w-7xl px-6 pt-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
  <img
    src="/brand/dealradar-pin.png"
    alt="DealRadar"
    className="h-20 w-auto object-contain"
  />

  <h1 className="text-5xl font-black tracking-tight leading-none">
    <span className="text-gray-950">Deal</span>
    <span className="text-orange-600">Radar</span>
  </h1>
</div>

          </div>

          <div className="mt-12 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              {!isSearchActive && (
                <>
                  <h2 className="max-w-xl text-5xl font-black leading-tight text-gray-950 md:text-6xl">
                    Trova occasioni reali vicino a te.
                  </h2>

                  <p className="mt-5 max-w-lg text-xl font-semibold leading-relaxed text-gray-800/80">
                    Stock, liquidazioni, aste e opportunità business scoperte dalla community.
                  </p>
                </>
              )}

              <div className="relative mt-8 max-w-xl">
                <Search className="absolute left-5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 text-gray-400" />

                <Input
                  placeholder="Cerca città, zona o opportunità..."
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  className="h-20 rounded-[28px] border-0 bg-white/95 pl-16 pr-5 text-xl shadow-2xl"
                  data-testid="place-search-input"
                />

                {(searchingPlaces || searchResults.length > 0 || placeResults.length > 0) && (
                  <div className="absolute left-0 right-0 top-[110%] z-[9999] max-h-[320px] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
                    {searchingPlaces && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        Sto cercando il luogo...
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-bold uppercase text-gray-400">
                          Opportunità trovate
                        </div>

                        {searchResults.map((opp) => (
                          <button
                            key={opp.id}
                            type="button"
                            onClick={() => {
                              setSelectedOpportunity(opp);
                              setDetailOpen(true);
                              setPlaceQuery('');
                              setPlaceResults([]);
                            }}
                            className="w-full border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <div className="line-clamp-1 text-sm font-bold text-gray-900">
                              {opp.title}
                            </div>
                            <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                              {opp.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!searchingPlaces &&
                      placeResults.map((place) => (
                        <button
                          key={place.place_id}
                          type="button"
                          onClick={() => handlePlaceSelect(place)}
                          className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="line-clamp-1 text-sm font-medium text-gray-900">
                            {place.display_name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{place.type}</div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[36px] bg-white/45 p-3 shadow-[0_30px_90px_rgba(91,45,12,0.22)] backdrop-blur-md">
              <div className="relative h-[430px] overflow-hidden rounded-[28px] bg-white">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  className="map-container z-0"
                  whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                  }}
                  zoomControl={false}
                  scrollWheelZoom={mapInteractive}
                  dragging={mapInteractive}
                  doubleClickZoom={mapInteractive}
                  touchZoom={mapInteractive}
                  boxZoom={mapInteractive}
                  keyboard={mapInteractive}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapController
                    center={mapCenter}
                    shouldRecenter={shouldRecenter}
                    onRecenterDone={() => setShouldRecenter(false)}
                  />

                  <MapInteractionController enabled={mapInteractive} />

                  {isUsingUserLocation && location?.lat && location?.lng && (
                    <UserLocationMarker position={[location.lat, location.lng]} />
                  )}

                  {selectedPlace && (
                    <Marker position={[Number(selectedPlace.lat), Number(selectedPlace.lon)]}>
                      <Popup>{selectedPlace.display_name}</Popup>
                    </Marker>
                  )}

                  {isUsingUserLocation && location?.lat && location?.lng && (
                    <Circle
                      center={[location.lat, location.lng]}
                      radius={radius * 1000}
                      pathOptions={{
                        color: '#00C853',
                        fillColor: '#00C853',
                        fillOpacity: 0.05,
                        weight: 2,
                        dashArray: '5, 10',
                      }}
                    />
                  )}

                  {filteredOpportunities.map((opp) => (
                    <Marker
                      key={opp.id}
                      position={[opp.latitude, opp.longitude]}
                      icon={createCustomIcon(opp.category)}
                      eventHandlers={{ click: () => handleMarkerClick(opp) }}
                    >
                      <Popup closeButton={false} className="map-preview-popup">
                        <MapPreviewCard
                          opportunity={opp}
                          onViewDetails={() => {
                            setSelectedOpportunity(opp);
                            setDetailOpen(true);
                          }}
                        />
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {!isUsingUserLocation && (
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="absolute left-5 top-5 z-10 flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/85 shadow-lg backdrop-blur-md"
                    data-testid="location-banner"
                  >
                    <MapPinOff className="h-5 w-5 text-orange-400" />
                    <span className="mt-1 text-[10px] text-white">GPS</span>
                  </button>
                )}

                <Button
                  size="icon"
                  variant="secondary"
                  className={`absolute right-5 top-5 z-10 h-12 w-12 rounded-2xl shadow-lg ${
                    isUsingUserLocation ? 'bg-primary text-white' : 'bg-white'
                  }`}
                  onClick={handleLocateMe}
                  data-testid="locate-me-btn"
                >
                  <Navigation
                    className={`h-5 w-5 ${
                      isUsingUserLocation ? 'text-white' : 'text-primary'
                    }`}
                  />
                </Button>

                {!mapInteractive ? (
                  <button
                    type="button"
                    onClick={() => setMapInteractive(true)}
                    className="absolute bottom-6 right-5 z-10 flex h-12 items-center gap-2 rounded-full bg-green-600 px-5 font-bold text-white shadow-xl"
                  >
                    <MapPin className="h-5 w-5" />
                    Attiva mappa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMapInteractive(false)}
                    className="absolute bottom-6 right-5 z-10 flex h-12 items-center gap-2 rounded-full bg-white px-5 font-bold text-gray-800 shadow-xl"
                  >
                    Blocca
                  </button>
                )}

                {opportunitiesError && (
                  <div className="absolute left-1/2 top-24 z-20 w-[90%] max-w-md -translate-x-1/2">
                    <div className="rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg">
                      <div className="text-sm font-semibold text-red-700">
                        {opportunitiesError}
                      </div>
                      <div className="mt-1 break-words text-xs text-red-600">
                        {debugError}
                      </div>
                      <button
                        type="button"
                        onClick={loadOpportunities}
                        className="mt-2 text-sm font-semibold text-primary"
                      >
                        Riprova
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-950">
              Opportunità vicino a te
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-800/80">
              {latestOpportunities.length} opportunità pubblicate nella community
            </p>
          </div>
          <Button
  type="button"
  onClick={() => setFiltersOpen(true)}
  className="flex items-center gap-2 rounded-full bg-black/80 px-5 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:scale-[1.03] hover:bg-black"
>
  <SlidersHorizontal className="h-4 w-4" />
  Filtri
</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 rounded-[28px] bg-white/70 shadow-sm" />
            ))}
          </div>
        ) : featuredOpportunities.length === 0 ? (
          <div className="rounded-3xl bg-white/80 p-10 text-center shadow-sm">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-orange-300" />
            <h3 className="font-bold text-gray-900">Nessuna opportunità ancora</h3>
            <p className="mt-1 text-sm text-gray-500">
              Prova a cambiare categoria o raggio di ricerca.
            </p>
          </div>
        ) : (
          <div className="relative">
  <button
    type="button"
    onClick={() => scrollOpportunities('left')}
    className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white md:flex"
  >
    <ChevronLeft className="h-6 w-6" />
  </button>

  <div
    ref={opportunitiesScrollRef}
    className="-mx-6 overflow-x-auto px-6 pb-2 horizontal-scroll"
  >
    <div className="flex gap-6">
      {latestOpportunities.map((opp) => (
        <div key={opp.id} className="w-[270px] flex-shrink-0">
          <HomeOpportunityCard
            opportunity={opp}
            onClick={() => {
              setSelectedOpportunity(opp);
              setDetailOpen(true);
            }}
          />
        </div>
      ))}
    </div>
  </div>

  <button
    type="button"
    onClick={() => scrollOpportunities('right')}
    className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white md:flex"
  >
    <ChevronRight className="h-6 w-6" />
  </button>
</div>
        )}

        {categoryStats.length > 0 && (
          <div className="mt-10 rounded-[32px] bg-white/55 p-5 shadow-[0_18px_50px_rgba(78,40,10,0.14)] backdrop-blur-md">
            <h2 className="mb-4 text-xl font-black text-gray-950">
              Sfoglia per categoria
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {categoryStats.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    category === cat.key
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-white/60 bg-white/80'
                  }`}
                >
                  <div
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: cat.color }}
                  >
                    <cat.Icon className="h-5 w-5 text-white" />
                  </div>

                  <h3 className="line-clamp-1 text-sm font-black text-gray-900">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {cat.count} offerte
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {filtersOpen && (
  <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm">
    <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Filtri</h2>
          <p className="text-sm text-gray-500">
            Personalizza le opportunità mostrate
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
            Ordina per
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <FilterButton active={homeSort === 'recent'} onClick={() => setHomeSort('recent')}>
              <Clock className="h-4 w-4" />
              Recenti
            </FilterButton>

            <FilterButton active={homeSort === 'distance'} onClick={() => setHomeSort('distance')}>
              <MapPin className="h-4 w-4" />
              Vicine
            </FilterButton>

            <FilterButton active={homeSort === 'profit'} onClick={() => setHomeSort('profit')}>
              <TrendingUp className="h-4 w-4" />
              Profitto
            </FilterButton>

            <FilterButton active={homeSort === 'price_low'} onClick={() => setHomeSort('price_low')}>
              <Euro className="h-4 w-4" />
              Prezzo basso
            </FilterButton>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
            Categoria
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>
              Tutte
            </FilterButton>

            {Object.entries(categoryIcons).map(([key, config]) => {
              const Icon = config.icon;

              return (
                <FilterButton
                  key={key}
                  active={category === key}
                  onClick={() => setCategory(key)}
                >
                  <Icon className="h-4 w-4" />
                  {config.name}
                </FilterButton>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
            Prezzo massimo
          </h3>

          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Es. 500"
            className="h-12 w-full rounded-2xl border border-gray-200 px-4 font-semibold outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
            Solo opportunità speciali
          </h3>

          <div className="space-y-3">
            <ToggleRow
              active={onlyVerified}
              onClick={() => setOnlyVerified((prev) => !prev)}
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Solo verificate"
              subtitle="Mostra opportunità confermate dalla community"
            />

            <ToggleRow
              active={onlyHighValue}
              onClick={() => setOnlyHighValue((prev) => !prev)}
              icon={<Star className="h-4 w-4" />}
              title="Solo alto valore"
              subtitle="Mostra opportunità con profitto potenziale alto"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-2xl"
            onClick={() => {
              setHomeSort('recent');
              setCategory('all');
              setOnlyVerified(false);
              setOnlyHighValue(false);
              setMaxPrice('');
            }}
          >
            Reset
          </Button>

          <Button
            type="button"
            className="h-12 flex-1 rounded-2xl bg-orange-600 font-bold hover:bg-orange-700"
            onClick={() => setFiltersOpen(false)}
          >
            Applica filtri
          </Button>
        </div>
      </div>
    </div>
  </div>
)}

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />

      <LocationPermissionModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRequestPermission={handleLocationPermission}
        permissionState={permissionState}
        error={locationError}
      />
    </div>
  );
};

const FilterButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition ${
      active
        ? 'border-orange-500 bg-orange-50 text-orange-700'
        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
);

const ToggleRow = ({ active, onClick, icon, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
      active
        ? 'border-orange-500 bg-orange-50'
        : 'border-gray-200 bg-white hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>

    {active && <Check className="h-5 w-5 text-orange-600" />}
  </button>
);

export default MapView;