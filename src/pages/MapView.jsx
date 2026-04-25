import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Filter,
  Navigation,
  ChevronUp,
  MapPin,
  Store,
  Package,
  Wrench,
  Building2,
  Gavel,
  Star,
  MapPinOff,
  Target,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { CategoryFilter } from '../components/CategoryFilter';
import { DistanceFilter } from '../components/DistanceFilter';
import { MapPreviewCard } from '../components/MapPreviewCard';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER = [41.9028, 12.4964]; // Rome

const categoryIcons = {
  store_liquidation: { icon: Store, color: '#00C853', name: 'Store Liquidation' },
  product_stock: { icon: Package, color: '#F59E0B', name: 'Product Stock' },
  equipment: { icon: Wrench, color: '#3B82F6', name: 'Equipment' },
  business_sale: { icon: Building2, color: '#8B5CF6', name: 'Business Sale' },
  auctions: { icon: Gavel, color: '#EF4444', name: 'Auctions' },
  user_reported: { icon: Star, color: '#F97316', name: 'User Reported' },
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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getIconSvg = (category) => {
  const paths = {
    store_liquidation:
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    product_stock:
      '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
    equipment:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    business_sale:
      '<path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/><path d="M18 11h4v11h-9"/><path d="M6 12H2v10h4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    auctions:
      '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-11 11"/>',
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

export const MapView = () => {
  const {
    location,
    radius,
    updateRadius,
    permissionState,
    isUsingUserLocation,
    requestLocation,
    error: locationError,
  } = useLocation();

  const [allOpportunities, setAllOpportunities] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [listOpen, setListOpen] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [manualCenter, setManualCenter] = useState(null);
  const [shouldRecenter, setShouldRecenter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState('');
  const [debugError, setDebugError] = useState('');

  const mapRef = useRef(null);
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
            headers: {
              Accept: 'application/json',
            },
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
          console.error('Nominatim raw response:', rawText);
          parsedResults = [];
        }

        if (!isCancelled) {
          setPlaceResults(Array.isArray(parsedResults) ? parsedResults : []);
        }
      } catch (err) {
        console.error('Place search error:', err);
        if (!isCancelled) {
          setPlaceResults([]);
        }
      } finally {
        if (!isCancelled) {
          setSearchingPlaces(false);
        }
      }
    };

    const timer = setTimeout(() => {
      runPlaceSearch();
    }, 350);

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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

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

    if (sortBy === 'profit') {
      filtered.sort(
        (a, b) =>
          Number(b.estimated_resale_value || 0) - Number(a.estimated_resale_value || 0)
      );
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => {
        const aDist = a.distance_km ?? Number.MAX_SAFE_INTEGER;
        const bDist = b.distance_km ?? Number.MAX_SAFE_INTEGER;
        return aDist - bDist;
      });
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return filtered;
  }, [allOpportunities, category, sortBy, radius, location?.lat, location?.lng]);

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

  const handleCloseLocationModal = () => {
    setShowLocationModal(false);
  };

  const mapCenter =
    manualCenter ||
    (location?.lat && location?.lng
      ? [location.lat, location.lng]
      : DEFAULT_MAP_CENTER);

  return (
    <div className="relative h-screen" data-testid="map-view">
      <MapContainer
        center={mapCenter}
        zoom={12}
        className="map-container z-0"
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
        zoomControl={false}
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

      <div className="absolute top-4 left-4 right-4 z-10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
          <Input
            placeholder="Cerca un luogo o indirizzo..."
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            className="pl-10 pr-4 h-12 bg-white/95 backdrop-blur-md border-0 shadow-lg rounded-xl"
            data-testid="place-search-input"
          />

          {(searchingPlaces || placeResults.length > 0) && (
            <div className="absolute top-14 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20">
              {searchingPlaces && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Sto cercando il luogo...
                </div>
              )}

              {!searchingPlaces &&
                placeResults.map((place) => (
                  <button
                    key={place.place_id}
                    type="button"
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {place.display_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{place.type}</div>
                  </button>
                ))}
            </div>
          )}
        </div>

        <CategoryFilter selected={category} onSelect={setCategory} />

        <div className="flex justify-center">
          <DistanceFilter selected={radius} onSelect={updateRadius} />
        </div>
      </div>

      {!isUsingUserLocation && (
        <div
          className="absolute top-44 left-4 right-4 z-10 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between cursor-pointer"
          onClick={() => setShowLocationModal(true)}
          data-testid="location-banner"
        >
          <div className="flex items-center gap-2">
            <MapPinOff className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800">Using default location (Rome)</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100 h-8"
          >
            Enable GPS
          </Button>
        </div>
      )}

      {opportunitiesError && (
        <div className="absolute left-1/2 top-56 z-20 -translate-x-1/2 w-[90%] max-w-md">
          <div className="rounded-xl bg-white px-4 py-3 shadow-lg border border-red-200">
            <div className="text-sm font-semibold text-red-700">{opportunitiesError}</div>
            <div className="text-xs text-red-600 mt-1 break-words">{debugError}</div>
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

      <div className="absolute right-4 top-56 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className={`h-11 w-11 rounded-full shadow-lg ${
            isUsingUserLocation ? 'bg-primary text-white' : 'bg-white'
          }`}
          onClick={handleLocateMe}
          data-testid="locate-me-btn"
        >
          <Navigation
            className={`w-5 h-5 ${isUsingUserLocation ? 'text-white' : 'text-primary'}`}
          />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full bg-white shadow-lg"
              data-testid="filter-btn"
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Radius
                </label>

                <Select value={String(radius)} onValueChange={(v) => updateRadius(Number(v))}>
                  <SelectTrigger data-testid="radius-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="20">20 km</SelectItem>
                    <SelectItem value="50">50 km</SelectItem>
                    <SelectItem value="100">100 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sort By
                </label>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="sort-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="profit">Highest Profit</SelectItem>
                    <SelectItem value="distance">Closest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="absolute left-4 bottom-24 z-10">
        {!legendOpen ? (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-white/95 text-gray-800 backdrop-blur-md shadow-lg px-4 h-10 border border-gray-200"
            onClick={() => setLegendOpen(true)}
            data-testid="open-legend-btn"
          >
            Legend
          </Button>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 w-48">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">Legend</p>
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-1.5">
              {Object.entries(categoryIcons).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: val.color }}
                  >
                    <val.icon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-xs text-gray-600">{val.name}</span>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-200 mt-1">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)' }}
                >
                  <Target className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs text-amber-600 font-medium">Bounty</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-20 left-0 right-0 z-10">
        <Sheet open={listOpen} onOpenChange={setListOpen}>
          <SheetTrigger asChild>
            <div className="flex justify-center">
              <Button
                variant="secondary"
                className="rounded-full bg-white text-gray-800 border border-gray-200 shadow-lg px-6 h-11 gap-2"
                data-testid="show-list-btn"
              >
                <ChevronUp
                  className={`w-5 h-5 transition-transform ${listOpen ? 'rotate-180' : ''}`}
                />
                <span className="font-semibold">
                  {filteredOpportunities.length} Deals within {radius} km
                </span>
              </Button>
            </div>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Deals Near You</SheetTitle>
            </SheetHeader>

            <div className="overflow-y-auto h-[calc(60vh-80px)] space-y-4 pb-8">
              {loading ? (
                <div className="empty-state">
                  <MapPin className="empty-state-icon" />
                  <h3 className="empty-state-title">Loading deals...</h3>
                  <p className="empty-state-text">Please wait a moment</p>
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <div className="empty-state">
                  <MapPin className="empty-state-icon" />
                  <h3 className="empty-state-title">No deals found</h3>
                  <p className="empty-state-text">
                    Try expanding your search radius or changing filters
                  </p>
                </div>
              ) : (
                filteredOpportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onClick={() => {
                      setSelectedOpportunity(opp);
                      setDetailOpen(true);
                      setListOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />

      <LocationPermissionModal
        open={showLocationModal}
        onClose={handleCloseLocationModal}
        onRequestPermission={handleLocationPermission}
        permissionState={permissionState}
        error={locationError}
      />
    </div>
  );
};

export default MapView;