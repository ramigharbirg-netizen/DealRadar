import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, MapPin, DollarSign, Phone, Mail, Link,
  X, Plus, Loader2, ArrowLeft, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
];

export const SubmitOpportunity = () => {
  const { user } = useAuth();
  const { location } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    latitude: location?.lat || 0,
    longitude: location?.lng || 0,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to submit opportunities');
      navigate('/login');
      return;
    }

    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const estimatedPrice = formData.estimated_price
        ? Number(formData.estimated_price)
        : null;

      const estimatedResaleValue = formData.estimated_resale_value
        ? Number(formData.estimated_resale_value)
        : null;

      const isHighValue =
        estimatedPrice !== null &&
        estimatedResaleValue !== null &&
        estimatedResaleValue - estimatedPrice >= 10000;

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        address: formData.address || null,
        estimated_price: estimatedPrice,
        estimated_resale_value: estimatedResaleValue,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        contact_link: formData.contact_link || null,
        images: images.length > 0 ? images : [],
        is_high_value: isHighValue,
        confirmations: 0,
        reports: 0,
        user_name: user?.name || user?.email || 'Anonymous',
        user_id: user?.id || null,
      };

      const { error } = await supabase
        .from('opportunities')
        .insert([payload]);

      if (error) {
        throw error;
      }

      toast.success('Opportunity submitted successfully!');
      navigate('/feed');
    } catch (err) {
      console.error('Submit opportunity error:', err);
      toast.error(err.message || 'Failed to submit opportunity');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          toast.success('Location updated');
        },
        () => {
          toast.error('Could not get your location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">
            You need to be logged in to submit opportunities
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-primary rounded-xl h-12"
            data-testid="login-redirect-btn"
          >
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="submit-opportunity-page">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
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
              disabled={!formData.title || !formData.description || !formData.category}
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
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                disabled={loading}
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
