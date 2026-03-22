import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, Filter, Navigation, ChevronUp, MapPin, TrendingUp,
  Store, Package, Wrench, Building2, Gavel, Star, MapPinOff, Bell, Target
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { bountiesAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { CategoryFilter } from '../components/CategoryFilter';
import { DistanceFilter } from '../components/DistanceFilter';
import { MapPreviewCard } from '../components/MapPreviewCard';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { BountyCard } from '../components/BountyCard';
import { BountyDetail } from '../components/BountyDetail';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Updated category icons and colors per user request
const categoryIcons = {
  store_liquidation: { icon: Store, color: '#00C853', name: 'Store Liquidation' }, // Green
  product_stock: { icon: Package, color: '#F59E0B', name: 'Product Stock' }, // Yellow
  equipment: { icon: Wrench, color: '#3B82F6', name: 'Equipment' }, // Blue
  business_sale: { icon: Building2, color: '#8B5CF6', name: 'Business Sale' }, // Purple
  auctions: { icon: Gavel, color: '#EF4444', name: 'Auctions' }, // Red
  user_reported: { icon: Star, color: '#F97316', name: 'User Reported' }, // Orange
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

const getIconSvg = (category) => {
  const paths = {
    store_liquidation: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    product_stock: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
    equipment: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    business_sale: '<path d="M6 22V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/><path d="M18 11h4v11h-9"/><path d="M6 12H2v10h4"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    auctions: '<path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-11 11"/>',
    user_reported: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  };
  return paths[category] || paths.user_reported;
};

// Component to handle map view changes
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
};

// User location marker with pulse animation
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

// Bounty marker icon (target)
const createBountyIcon = () => {
  return L.divIcon({
    className: 'bounty-marker-icon',
    html: `
      <div class="bounty-marker">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
  });
};

export const MapView = () => {
  const { 
    location, 
    radius, 
    updateRadius, 
    loading: locationLoading,
    permissionState,
    isUsingUserLocation,
    requestLocation,
    error: locationError
  } = useLocation();
  const { user } = useAuth();
  
  const [opportunities, setOpportunities] = useState([]);
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bountyDetailOpen, setBountyDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [listOpen, setListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const mapRef = useRef(null);

  // Show location permission modal on first visit if not granted
  useEffect(() => {
    const hasSeenModal = localStorage.getItem('location_modal_seen');
    if (!hasSeenModal && permissionState === 'prompt' && !locationLoading) {
      setShowLocationModal(true);
    }
  }, [permissionState, locationLoading]);

  useEffect(() => {
  loadOpportunities();
  loadBounties();
  // eslint-disable-next-line
}, []);

  useEffect(() => {
    loadOpportunities();
    loadBounties();
    // eslint-disable-next-line
  }, [location, radius, category, sortBy]);

  

  const loadOpportunities = async () => {
  setLoading(true);

  try {
    let query = supabase
      .from('opportunities')
      .select('*');

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'profit') {
      query = query.order('estimated_resale_value', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const validOpportunities = (data || []).filter(
      (opp) =>
        opp.latitude !== null &&
        opp.latitude !== undefined &&
        opp.longitude !== null &&
        opp.longitude !== undefined
    );

    setOpportunities(validOpportunities);
  } catch (err) {
    console.error('Supabase load opportunities error:', err);
    toast.error('Failed to load opportunities');
    setOpportunities([]);
  } finally {
    setLoading(false);
  }
};

  const loadBounties = async () => {
    try {
      const params = {
        lat: location.lat,
        lon: location.lng,
        category: category !== 'all' ? category : undefined,
        status: 'active',
      };
      const res = await bountiesAPI.getAll(params);
      setBounties(res.data);
    } catch (err) {
      console.error('Failed to load bounties:', err);
    }
  };

  const handleMarkerClick = (opp) => {
    setSelectedOpportunity(opp);
  };

  const handleLocateMe = () => {
    if (permissionState !== 'granted') {
      setShowLocationModal(true);
      return;
    }
    
    requestLocation();
    if (mapRef.current && location) {
      mapRef.current.setView([location.lat, location.lng], 13);
    }
    toast.success('Location updated');
  };

  const handleLocationPermission = () => {
    localStorage.setItem('location_modal_seen', 'true');
    requestLocation();
    setShowLocationModal(false);
  };

  const handleCloseLocationModal = () => {
    localStorage.setItem('location_modal_seen', 'true');
    setShowLocationModal(false);
  };

  const filteredOpportunities = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative h-screen" data-testid="map-view">
      {/* Map */}
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={12}
        className="map-container z-0"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={[location.lat, location.lng]} />
        
        {/* User location marker */}
        <UserLocationMarker position={[location.lat, location.lng]} />
        
        {/* Radius circle */}
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
        
        {/* Opportunity markers with preview popup */}
        {filteredOpportunities.map((opp) => (
          <Marker
            key={opp.id}
            position={[opp.latitude, opp.longitude]}
            icon={createCustomIcon(opp.category)}
            eventHandlers={{
              click: () => handleMarkerClick(opp),
            }}
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
        
        {/* Bounty markers */}
        {bounties.map((bounty) => (
          <Marker
            key={`bounty-${bounty.id}`}
            position={[bounty.latitude, bounty.longitude]}
            icon={createBountyIcon()}
            eventHandlers={{
              click: () => {
                setSelectedBounty(bounty);
                setBountyDetailOpen(true);
              },
            }}
          >
            <Popup closeButton={false} className="map-preview-popup">
              <div className="w-[260px] bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-xl p-4 border-2 border-dashed border-amber-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-amber-600 uppercase">Bounty</span>
                  <span className="ml-auto text-lg font-bold text-amber-600">€{bounty.reward_amount}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2">{bounty.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{bounty.description}</p>
                <Button
                  onClick={() => {
                    setSelectedBounty(bounty);
                    setBountyDetailOpen(true);
                  }}
                  className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm"
                >
                  View Bounty
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 bg-white/95 backdrop-blur-md border-0 shadow-lg rounded-xl"
            data-testid="search-input"
          />
        </div>

        {/* Category Filter */}
        <CategoryFilter selected={category} onSelect={setCategory} />
        
        {/* Distance Filter - Prominent */}
        <div className="flex justify-center">
          <DistanceFilter selected={radius} onSelect={updateRadius} />
        </div>
      </div>

      {/* Location Status Banner */}
      {!isUsingUserLocation && (
        <div 
          className="absolute top-44 left-4 right-4 z-10 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between cursor-pointer"
          onClick={() => setShowLocationModal(true)}
          data-testid="location-banner"
        >
          <div className="flex items-center gap-2">
            <MapPinOff className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800">
              Using default location (NYC)
            </span>
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

      {/* Map Controls */}
      <div className="absolute right-4 top-56 z-10 flex flex-col gap-2">
        {/* Locate Me */}
        <Button
          size="icon"
          variant="secondary"
          className={`h-11 w-11 rounded-full shadow-lg ${
            isUsingUserLocation ? 'bg-primary text-white' : 'bg-white'
          }`}
          onClick={handleLocateMe}
          data-testid="locate-me-btn"
        >
          <Navigation className={`w-5 h-5 ${isUsingUserLocation ? 'text-white' : 'text-primary'}`} />
        </Button>

        {/* Filter Sheet */}
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
              {/* Radius */}
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

              {/* Sort */}
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

      {/* Map Legend */}
      <div className="absolute left-4 bottom-24 z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Legend</p>
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
            {/* Bounty marker legend */}
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
      </div>

      {/* Bottom List Sheet */}
      <div className="absolute bottom-20 left-0 right-0 z-10">
        <Sheet open={listOpen} onOpenChange={setListOpen}>
          <SheetTrigger asChild>
            <div className="flex justify-center">
              <Button
                variant="secondary"
                className="rounded-full bg-white shadow-lg px-6 h-11 gap-2"
                data-testid="show-list-btn"
              >
                <ChevronUp className={`w-5 h-5 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
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
              {filteredOpportunities.length === 0 ? (
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

      {/* Opportunity Detail Sheet */}
      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />

      {/* Location Permission Modal */}
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
