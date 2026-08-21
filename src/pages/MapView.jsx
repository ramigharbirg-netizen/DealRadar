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
  Smartphone,
  Shirt,
  Armchair,
  Car,
  Boxes,
  Gift,
  Gavel,
  MapPinOff,
  Heart,
  Clock,
  SlidersHorizontal,
  X,
  Check,
  Euro,
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
import { categories, getCategoryById } from '../data/categories';
import {
  contentTypeFilterOptions,
  getContentTypeConfig,
  inferOpportunityContentType,
  opportunityMatchesContentType,
} from '../data/contentTypeCatalog';
import {
  formatOpportunityPrice,
  isExplicitlyFreeOpportunity,
} from '../utils/opportunityPricing';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER = [41.9028, 12.4964];

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


const getMarkerIconSvg = (categoryId) => {
  const paths = {
    store_liquidation:
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',

    product_stock:
      '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/>',

    equipment:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',

    business_sale:
      '<path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/><path d="M18 11h4v11h-9"/><path d="M6 12H2v10h4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',

    electronics:
      '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',

    clothing:
      '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.22l.58 3.47A2 2 0 0 0 4.83 10H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h1.17a2 2 0 0 0 1.97-1.85l.58-3.47a2 2 0 0 0-1.34-2.22z"/>',

    games_sports_hobbies:
      '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.152A4 4 0 0 0 17.32 5z"/>',

    home:
      '<path d="M6 19v-7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7"/><path d="M6 19H4v-5a2 2 0 0 1 2-2"/><path d="M18 19h2v-5a2 2 0 0 0-2-2"/><path d="M8 19v3"/><path d="M16 19v3"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',

          animals:
      '<circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M12 11c-3 0-5.5 2.4-5.5 5.2 0 2.1 1.6 3.8 3.6 3.8.8 0 1.4-.3 1.9-.7.5.4 1.1.7 1.9.7 2 0 3.6-1.7 3.6-3.8C17.5 13.4 15 11 12 11Z"/>',
    
      vehicles:
      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 10l-1.4-3.5A2 2 0 0 0 15.4 5H8.6a2 2 0 0 0-1.9 1.5L5.3 10l-1.8 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',

    auctions:
      '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/>',

    free_deals:
      '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',

    user_reported:
      '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',

    job_offers:
      '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 12h20"/><path d="M10 12v2h4v-2"/>',

    rental_homes:
      '<path d="m3 11 9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/><path d="M9 21v-6h6v6"/>',

    other:
      '<path d="M2.97 12.92 12 17.5l9.03-4.58"/><path d="M12 22V12"/><path d="M2.97 7.08 12 2.5l9.03 4.58L12 12 2.97 7.08Z"/><path d="m7 4.5 10 5"/>',
  };

  return paths[categoryId] || paths.user_reported;
};

const createCustomIcon = (opportunity) => {
  const categoryId = opportunity?.category;
  const contentType = inferOpportunityContentType(opportunity);
  const typeConfig = getContentTypeConfig(contentType);

  const safeContentType = String(contentType).replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  );

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div
        class="custom-marker marker-content-${safeContentType}"
        style="background-color: ${typeConfig.color}"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          ${getMarkerIconSvg(categoryId)}
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

const estimatedValue =
  opportunity.estimated_resale_value !== null &&
  opportunity.estimated_resale_value !== undefined
    ? Number(opportunity.estimated_resale_value)
    : null;

    const contentType = inferOpportunityContentType(opportunity);
    const typeConfig = getContentTypeConfig(contentType);
    const TypeIcon = typeConfig.icon;
    const isDeal = contentType === 'deal';
    const isJobOffer = contentType === 'job';
    const displayedPrice = formatOpportunityPrice(opportunity);
    const isExplicitlyFree = isExplicitlyFreeOpportunity(opportunity);
    const shouldShowPrice =
      !isDeal && !isJobOffer && displayedPrice !== null;
  const categoryConfig =
  getCategoryById(opportunity.category) ||
  getCategoryById('user_reported');

  const CategoryIcon = categoryConfig?.icon || MapPin;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[215px] w-[142px] flex-col overflow-hidden rounded-[18px] bg-white text-left shadow-[0_8px_22px_rgba(78,40,10,0.12)] transition duration-300 hover:-translate-y-0.5"
    >
      <div className="relative h-[92px] overflow-hidden bg-orange-100">
        {firstImage ? (
          <img
            src={firstImage}
            alt={opportunity.title || 'Opportunità'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: `${typeConfig.color}18` }}
          >
            <TypeIcon className="h-8 w-8" style={{ color: typeConfig.color }} />
          </div>
        )}

        <div className="absolute left-2 top-2 flex max-w-[126px] flex-col items-start gap-1">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow"
            style={{ backgroundColor: typeConfig.color }}
          >
            {typeConfig.label}
          </span>

          <span
            className="max-w-[126px] truncate rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[9px] font-bold shadow-sm"
            style={{ color: typeConfig.color }}
          >
            {categoryConfig.shortName || categoryConfig.name}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2.5">
        <div>
          <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-gray-950">
            {opportunity.title || 'Opportunità'}
          </h3>

          <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-gray-500">
            {opportunity.address || 'Zona non specificata'}
          </p>
        </div>

        <div>
  {shouldShowPrice && (
  <div className="mt-2 flex items-end justify-between gap-2">
    <p
      className={`text-sm font-black ${
        isExplicitlyFree ? 'text-green-600' : 'text-gray-950'
      }`}
    >
      {displayedPrice}
    </p>

    {!isExplicitlyFree && estimatedValue !== null && (
      <p className="text-[11px] font-semibold text-gray-500">
        Valore:{' '}
        {estimatedValue.toLocaleString('it-IT', {
          style: 'currency',
          currency: 'EUR',
        })}
      </p>
    )}
  </div>
)}

  <div
    className={`mt-2 flex items-center gap-1 text-[11px] font-bold ${typeConfig.softTextColor}`}
  >
    <MapPin className="h-3 w-3" />
    {opportunity.distance_km
      ? `${opportunity.distance_km.toFixed(1)} km`
      : 'Vicino'}
  </div>
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
  const [contentType, setContentType] = useState('all');
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
const [maxPrice, setMaxPrice] = useState('');

useEffect(() => {
  const handleHardwareBack = (event) => {
    if (filtersOpen) {
      setFiltersOpen(false);
      event.detail.handled = true;
      return;
    }

    if (detailOpen) {
      setDetailOpen(false);
      setSelectedOpportunity(null);
      event.detail.handled = true;
      return;
    }

    if (showLocationModal) {
      setShowLocationModal(false);
      event.detail.handled = true;
    }
  };

  window.addEventListener('dealradar:hardware-back', handleHardwareBack);

  return () => {
    window.removeEventListener('dealradar:hardware-back', handleHardwareBack);
  };
}, [filtersOpen, detailOpen, showLocationModal]);

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
  .eq('lifecycle_status', 'active')
  .gt('expires_at', new Date().toISOString())
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

    filtered = filtered.filter((opp) =>
      opportunityMatchesContentType(opp, contentType)
    );

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

    filtered.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    return filtered;
  }, [
    allOpportunities,
    contentType,
    category,
    location?.lat,
    location?.lng,
  ]);

  const latestOpportunities = useMemo(() => {
  let items = [...allOpportunities];

  items = items.filter((opp) =>
    opportunityMatchesContentType(opp, contentType)
  );

  if (category !== 'all') {
    items = items.filter((opp) => opp.category === category);
  }

  if (onlyVerified) {
    items = items.filter((opp) => opp.is_verified === true);
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
  contentType,
  category,
  location?.lat,
  location?.lng,
  homeSort,
  onlyVerified,
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

        <div className="relative z-20 mx-auto max-w-7xl px-4 pt-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <img
        src="/brand/dealradar-pin.png"
        alt="DealRadar"
        className="h-12 w-auto object-contain"
      />

      <h1 className="text-3xl font-black tracking-tight leading-none">
        <span className="text-gray-950">Deal</span>
        <span className="text-orange-600">Radar</span>
      </h1>
    </div>
  </div>

  <div className="relative mt-4">
    <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

    <Input
      placeholder="Trova e condividi opportunità"
      value={placeQuery}
      onChange={(e) => setPlaceQuery(e.target.value)}
      className="h-13 rounded-2xl border-0 bg-white/95 pl-12 pr-4 text-base font-semibold shadow-[0_12px_35px_rgba(91,45,12,0.16)]"
      data-testid="place-search-input"
    />

    {(searchingPlaces || searchResults.length > 0 || placeResults.length > 0) && (
      <div className="absolute left-0 right-0 top-[115%] z-[9999] max-h-[300px] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
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

  <div className="mt-4 rounded-[26px] bg-white/55 p-2 shadow-[0_18px_55px_rgba(91,45,12,0.20)] backdrop-blur-md">
    <div className="relative h-[245px] overflow-hidden rounded-[22px] bg-white">
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
            icon={createCustomIcon(opp)}
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
          className="absolute left-3 top-3 z-10 flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/85 shadow-lg backdrop-blur-md"
          data-testid="location-banner"
        >
          <MapPinOff className="h-4 w-4 text-orange-400" />
          <span className="mt-0.5 text-[9px] text-white">GPS</span>
        </button>
      )}

      <Button
        size="icon"
        variant="secondary"
        className={`absolute right-3 top-3 z-10 h-10 w-10 rounded-xl shadow-lg ${
          isUsingUserLocation ? 'bg-primary text-white' : 'bg-white'
        }`}
        onClick={handleLocateMe}
        data-testid="locate-me-btn"
      >
        <Navigation
          className={`h-4 w-4 ${
            isUsingUserLocation ? 'text-white' : 'text-primary'
          }`}
        />
      </Button>

      {!mapInteractive ? (
        <button
          type="button"
          onClick={() => setMapInteractive(true)}
          className="absolute bottom-3 right-3 z-10 flex h-10 items-center gap-1.5 rounded-full bg-green-600 px-4 text-xs font-black text-white shadow-xl"
        >
          <MapPin className="h-4 w-4" />
          Attiva
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMapInteractive(false)}
          className="absolute bottom-3 right-3 z-10 flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-black text-gray-800 shadow-xl"
        >
          Blocca
        </button>
      )}

      {opportunitiesError && (
        <div className="absolute left-1/2 top-16 z-20 w-[90%] max-w-md -translate-x-1/2">
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

<div className="relative z-20 mx-auto max-w-7xl px-4 pt-0 -mt-6">
  <div className="horizontal-scroll -mx-4 overflow-x-auto px-4 pb-1">
    <div className="flex gap-2">
      {contentTypeFilterOptions.map((type) => {
        const Icon = type.icon;
        const isSelected = contentType === type.id;

        return (
          <button
            key={type.id}
            type="button"
            onClick={() => setContentType(type.id)}
            className={`flex h-10 flex-shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-black shadow-sm ${
              isSelected
                ? 'border-transparent text-white'
                : 'border-gray-200 bg-white/90 text-gray-800'
            }`}
            style={{
              backgroundColor: isSelected ? type.color : undefined,
            }}
          >
            <Icon className="h-4 w-4" />
            {type.pluralLabel}
          </button>
        );
      })}
    </div>
  </div>

  <div className="horizontal-scroll -mx-4 mt-2 overflow-x-auto px-4 pb-1">
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setCategory('all')}
        className={`flex h-10 flex-shrink-0 items-center rounded-full px-4 text-sm font-black shadow-sm ${
          category === 'all'
            ? 'bg-gray-700 text-white'
            : 'bg-white/90 text-gray-800'
        }`}
      >
        Tutte
      </button>

      {categories.map((config) => {
        const key = config.id;
        const Icon = config.icon;

        return (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`flex h-10 flex-shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black shadow-sm ${
              category === key
                ? 'text-white'
                : 'bg-white/90 text-gray-800'
            }`}
            style={{
              backgroundColor: category === key ? config.color : undefined,
            }}
          >
            <Icon className="h-4 w-4" />
            {config.name}
          </button>
        );
      })}
    </div>
  </div>
</div>

      <div className="mx-auto max-w-7xl px-4 pt-1 pb-8">

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
    <div className="flex gap-3">
      {latestOpportunities.map((opp) => (
        <div key={opp.id} className="w-[142px] flex-shrink-0">
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

<div className="mt-4 flex justify-center">
  <button
    type="button"
    onClick={() => setFiltersOpen(true)}
    className="rounded-full bg-white/90 px-5 py-2.5 text-sm font-black text-gray-800 shadow-sm"
  >
    Vedi filtri
  </button>
</div>
      </div>

            <div className="mx-auto max-w-7xl px-4 pb-8">
        <section
          className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 px-5 py-5 text-white shadow-[0_14px_38px_rgba(234,88,12,0.24)] sm:px-7 sm:py-6"
          aria-labelledby="home-community-banner-title"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100 sm:text-[11px]">
            La community cresce con te
          </p>

          <h2
            id="home-community-banner-title"
            className="mt-2 text-[20px] font-black leading-tight sm:text-[24px]"
          >
            Hai trovato un affare?
            <br />
            Condividilo su DealRadar.
          </h2>

          <p className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-orange-50 sm:text-sm">
            Segnala occasioni, vendite, offerte di lavoro e immobili vicino a
            te. Più persone partecipano, più opportunità reali scoprirà tutta
            la community.
          </p>
        </section>
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

            <FilterButton active={homeSort === 'price_low'} onClick={() => setHomeSort('price_low')}>
              <Euro className="h-4 w-4" />
              Prezzo basso
            </FilterButton>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">
            Tipo di contenuto
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {contentTypeFilterOptions.map((type) => {
              const Icon = type.icon;

              return (
                <FilterButton
                  key={type.id}
                  active={contentType === type.id}
                  onClick={() => setContentType(type.id)}
                >
                  <Icon className="h-4 w-4" />
                  {type.pluralLabel}
                </FilterButton>
              );
            })}
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

            {categories.map((config) => {
              const key = config.id;
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
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-2xl"
            onClick={() => {
              setHomeSort('recent');
              setContentType('all');
              setCategory('all');
              setOnlyVerified(false);
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