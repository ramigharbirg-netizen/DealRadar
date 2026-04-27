import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  Link as LinkIcon,
  X,
  Loader2,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const categories = [
  { id: 'store_liquidation', name: 'Store Liquidation' },
  { id: 'product_stock', name: 'Product Stock' },
  { id: 'equipment', name: 'Equipment & Machinery' },
  { id: 'business_sale', name: 'Business for Sale' },
  { id: 'auctions', name: 'Auctions & Bankruptcies' },
  { id: 'user_reported', name: 'User Reported' },
  { id: 'free_deals', name: 'Free Deals' },
];

export const SubmitOpportunity = () => {
  const { user, loading: authLoading } = useAuth();
  const { location, requestLocation, isUsingUserLocation } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    latitude: location?.lat || null,
    longitude: location?.lng || null,
    address: '',
    estimated_price: '',
    estimated_resale_value: '',
    contact_phone: '',
    contact_email: '',
    contact_link: '',
  });

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isUsingUserLocation && location?.lat && location?.lng) {
      setFormData((prev) => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
      }));
    }
  }, [isUsingUserLocation, location?.lat, location?.lng]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event?.target?.result;
        if (!result) return;

        setImages((prev) => {
          if (prev.length >= 5) {
            toast.error('Puoi caricare massimo 5 immagini');
            return prev;
          }
          return [...prev, result];
        });
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const geocodeAddress = async (address) => {
    const params = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'it',
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Address search failed (${response.status})`);
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
      displayName: results[0].display_name,
    };
  };

  const createAutomaticBountyMatches = async (opportunity) => {
  try {
    const { data: activeBounties, error: bountyError } = await supabase
      .from('bounties')
      .select('*')
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (bountyError) throw bountyError;

    const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();

    const matches = (activeBounties || [])
      .map((bounty) => {
        let score = 0;

        if (bounty.category === opportunity.category) {
          score += 50;
        }

        const bountyWords = `${bounty.title} ${bounty.description}`
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 3);

        const commonWords = bountyWords.filter((word) => text.includes(word));

        score += Math.min(commonWords.length * 10, 30);

        if (
          bounty.max_price &&
          opportunity.estimated_price &&
          Number(opportunity.estimated_price) <= Number(bounty.max_price)
        ) {
          score += 20;
        }

        return {
          bounty_id: bounty.id,
          opportunity_id: opportunity.id,
          hunter_id: user.id,
          match_score: score,
          status: 'suggested',
        };
      })
      .filter((match) => match.match_score >= 50);

    if (matches.length === 0) {
      return 0;
    }

    const { error: matchError } = await supabase
      .from('bounty_matches')
      .upsert(matches, {
        onConflict: 'bounty_id,opportunity_id',
      });

    if (matchError) throw matchError;

    return matches.length;
  } catch (err) {
    console.error('Auto match error:', err);
    return 0;
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (authLoading || loading) return;

    if (!user) {
      toast.error('Devi fare login per pubblicare un’opportunità');
      navigate('/login');
      return;
    }

    const title = formData.title.trim();
    const description = formData.description.trim();
    const category = formData.category;
    const address = formData.address.trim();

    if (!title || !description || !category) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      let finalLatitude =
        formData.latitude !== null && formData.latitude !== ''
          ? Number(formData.latitude)
          : null;

      let finalLongitude =
        formData.longitude !== null && formData.longitude !== ''
          ? Number(formData.longitude)
          : null;

      let finalAddress = address || null;

      if (finalAddress) {
        const geocoded = await geocodeAddress(finalAddress);

        if (!geocoded) {
          toast.error('Indirizzo non trovato. Prova a scriverlo meglio.');
          setLoading(false);
          return;
        }

        finalLatitude = geocoded.lat;
        finalLongitude = geocoded.lng;
        finalAddress = geocoded.displayName || finalAddress;
      } else if (location?.lat && location?.lng) {
        finalLatitude = Number(location.lat);
        finalLongitude = Number(location.lng);
      }

      if (
        finalLatitude === null ||
        finalLongitude === null ||
        Number.isNaN(finalLatitude) ||
        Number.isNaN(finalLongitude)
      ) {
        toast.error('Mancano le coordinate. Inserisci un indirizzo o usa la posizione attuale.');
        setLoading(false);
        return;
      }

      const estimatedPrice =
        formData.estimated_price !== '' ? Number(formData.estimated_price) : null;

      const estimatedResaleValue =
        formData.estimated_resale_value !== ''
          ? Number(formData.estimated_resale_value)
          : null;

      if (estimatedPrice !== null && Number.isNaN(estimatedPrice)) {
        toast.error('Asking Price non valido');
        setLoading(false);
        return;
      }

      if (estimatedResaleValue !== null && Number.isNaN(estimatedResaleValue)) {
        toast.error('Resale Value non valido');
        setLoading(false);
        return;
      }

      const isHighValue =
        estimatedPrice !== null &&
        estimatedResaleValue !== null &&
        estimatedResaleValue - estimatedPrice >= 10000;

      const payload = {
        title,
        description,
        category,
        latitude: finalLatitude,
        longitude: finalLongitude,
        address: finalAddress,
        estimated_price: estimatedPrice,
        estimated_resale_value: estimatedResaleValue,
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_link: formData.contact_link.trim() || null,
        images: images.length > 0 ? images : [],
        is_high_value: isHighValue,
        confirmations: 0,
        reports: 0,
        user_name: user.name || user.email || null,
          user_id: user.id,
      };

      console.log('SUBMIT PAYLOAD:', payload);

    const { data: createdOpportunity, error } = await supabase
  .from('opportunities')
  .insert([payload])
  .select()
  .single();

if (error) {
  throw error;
}

const matchesCount = await createAutomaticBountyMatches(createdOpportunity);

if (matchesCount > 0) {
  toast.success(`Opportunity submitted! ${matchesCount} possible bounty match found.`);
} else {
  toast.success('Opportunity submitted successfully!');
}

navigate('/feed');

    } catch (err) {
      console.error('Submit opportunity error FULL:', err);
      console.error('Submit opportunity message:', err?.message);
      console.error('Submit opportunity details:', err?.details);
      console.error('Submit opportunity hint:', err?.hint);
      console.error('Submit opportunity code:', err?.code);
      toast.error(err?.message || 'Failed to submit opportunity');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    if (!user) {
      toast.error('Devi fare login per pubblicare un’opportunità');
      navigate('/login');
      return;
    }

    try {
      const position = await requestLocation();

      if (!position) {
        toast.error('Could not get your location');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));

      toast.success('Location updated');
    } catch (err) {
      console.error('Use current location error:', err);
      toast.error('Could not get your location');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="submit-opportunity-page">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => navigate(-1)}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Submit Opportunity</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Step {step}/2
          </div>
        </div>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${step * 50}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {step === 1 && (
          <>
            <div>
              <Label className="mb-2 block">Photos</Label>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={img}
                      alt={`Upload ${index + 1}`}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                  data-testid="add-photo-btn"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">Add Photo</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Electronics Store Closing Sale"
                className="mt-1.5 h-12 rounded-xl"
                required
                data-testid="title-input"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the opportunity in detail..."
                className="mt-1.5 min-h-[120px] rounded-xl"
                required
                data-testid="description-input"
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="mt-1.5 h-12 rounded-xl" data-testid="category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-12 bg-primary rounded-xl"
              disabled={
                !formData.title.trim() || !formData.description.trim() || !formData.category
              }
              data-testid="next-step-btn"
            >
              Continue
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>Location</Label>
              <div className="mt-1.5 space-y-2">
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Address or area name"
                  className="h-12 rounded-xl"
                  data-testid="address-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={useCurrentLocation}
                  data-testid="use-location-btn"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_price">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Asking Price
                </Label>
                <Input
                  id="estimated_price"
                  name="estimated_price"
                  type="number"
                  value={formData.estimated_price}
                  onChange={handleChange}
                  placeholder="0"
                  className="mt-1.5 h-12 rounded-xl"
                  data-testid="price-input"
                />
              </div>
              <div>
                <Label htmlFor="estimated_resale_value">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Resale Value
                </Label>
                <Input
                  id="estimated_resale_value"
                  name="estimated_resale_value"
                  type="number"
                  value={formData.estimated_resale_value}
                  onChange={handleChange}
                  placeholder="0"
                  className="mt-1.5 h-12 rounded-xl"
                  data-testid="resale-input"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Contact Information</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="pl-10 h-12 rounded-xl"
                  data-testid="phone-input"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="Email address"
                  className="pl-10 h-12 rounded-xl"
                  data-testid="email-input"
                />
              </div>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="contact_link"
                  value={formData.contact_link}
                  onChange={handleChange}
                  placeholder="Website or listing URL"
                  className="pl-10 h-12 rounded-xl"
                  data-testid="link-input"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-xl"
                data-testid="back-step-btn"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 bg-primary rounded-xl"
                disabled={loading || authLoading}
                data-testid="submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default SubmitOpportunity;