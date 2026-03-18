import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, MapPin, Euro, ArrowLeft, Check, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { bountiesAPI } from '../lib/api';
import { toast } from 'sonner';

const categories = [
  { id: 'store_liquidation', name: 'Store Liquidation' },
  { id: 'product_stock', name: 'Product Stock' },
  { id: 'equipment', name: 'Equipment & Machinery' },
  { id: 'business_sale', name: 'Business for Sale' },
  { id: 'auctions', name: 'Auctions & Bankruptcies' },
  { id: 'user_reported', name: 'Any / Other' },
];

export const CreateBounty = () => {
  const { user } = useAuth();
  const { location } = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    reward_amount: '',
    max_price: '',
    radius_km: '20',
    latitude: location.lat,
    longitude: location.lng,
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to create a bounty');
      navigate('/login');
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.reward_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        reward_amount: Number(formData.reward_amount),
        max_price: formData.max_price ? Number(formData.max_price) : null,
        radius_km: Number(formData.radius_km),
      };
      
      await bountiesAPI.create(data);
      toast.success('Bounty created! Hunters will be notified.');
      navigate('/bounties');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create bounty');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          toast.success('Location updated');
        },
        () => toast.error('Could not get your location')
      );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">
            You need to be logged in to create a bounty
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl h-12"
          >
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="create-bounty-page">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-white" />
            <h1 className="text-lg font-bold text-white">Create Bounty</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>How bounties work:</strong> Post what you're looking for and set a reward. 
            Hunters will find matching opportunities and submit them. 
            When you approve a submission, the hunter earns the reward!
          </p>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">What are you looking for? *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Commercial Espresso Machine"
            className="mt-1.5 h-12 rounded-xl"
            required
            data-testid="bounty-title-input"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe exactly what you need, any specific brands or requirements..."
            className="mt-1.5 min-h-[120px] rounded-xl"
            required
            data-testid="bounty-description-input"
          />
        </div>

        {/* Category */}
        <div>
          <Label>Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-xl" data-testid="bounty-category-select">
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

        {/* Reward & Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reward_amount">
              <Euro className="w-4 h-4 inline mr-1" />
              Reward Amount *
            </Label>
            <Input
              id="reward_amount"
              name="reward_amount"
              type="number"
              value={formData.reward_amount}
              onChange={handleChange}
              placeholder="100"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="bounty-reward-input"
            />
            <p className="text-xs text-gray-500 mt-1">Paid to the finder</p>
          </div>
          <div>
            <Label htmlFor="max_price">
              <Euro className="w-4 h-4 inline mr-1" />
              Max Budget
            </Label>
            <Input
              id="max_price"
              name="max_price"
              type="number"
              value={formData.max_price}
              onChange={handleChange}
              placeholder="Optional"
              className="mt-1.5 h-12 rounded-xl"
              data-testid="bounty-budget-input"
            />
            <p className="text-xs text-gray-500 mt-1">Your max price</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <Label>Search Area</Label>
          <div className="mt-1.5 space-y-2">
            <Input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Area name (optional)"
              className="h-12 rounded-xl"
              data-testid="bounty-address-input"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={useCurrentLocation}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use My Location
              </Button>
              <Select
                value={formData.radius_km}
                onValueChange={(value) => setFormData(prev => ({ ...prev, radius_km: value }))}
              >
                <SelectTrigger className="w-32 h-11 rounded-xl" data-testid="bounty-radius-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="20">20 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 rounded-xl"
          disabled={loading}
          data-testid="create-bounty-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Create Bounty
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default CreateBounty;
