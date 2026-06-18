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
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { trackEvent } from '../lib/analytics';

const categories = [
  { id: 'store_liquidation', name: 'Liquidazione negozio' },
  { id: 'product_stock', name: 'Stock prodotti' },
  { id: 'equipment', name: 'Attrezzature e macchinari' },
  { id: 'business_sale', name: 'Attività in vendita' },
  { id: 'objects', name: 'Oggetti' },
  { id: 'auctions', name: 'Aste e fallimenti' },
  { id: 'user_reported', name: 'Qualsiasi / Altro' },
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
      toast.error('Accedi per creare una richiesta');
      navigate('/login');
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.reward_amount) {
      toast.error('Compila tutti i campi obbligatori');
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
      
      const payload = {
        ...data,
        user_id: user.id,
        user_name: user.name || user.email,
        status: 'active',
      };

      const { data: createdBounty, error } = await supabase
        .from('bounties')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      await trackEvent({
        userId: user.id,
        eventName: 'create_bounty',
        entityType: 'bounty',
        entityId: createdBounty.id,
        category: createdBounty.category,
        metadata: {
          title: createdBounty.title,
          reward_amount: createdBounty.reward_amount,
          max_price: createdBounty.max_price,
        },
      });

      toast.success('Richiesta creata! Gli utenti verranno avvisati.');
      navigate('/bounties');
    } catch (err) {
      console.error('Create bounty error:', err);
      toast.error(err.message || 'Impossibile creare la richiesta');
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
          toast.success('Posizione aggiornata');
        },
        () => toast.error('Impossibile ottenere la tua posizione')
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accesso richiesto</h2>
          <p className="text-gray-500 mb-6">
            Devi accedere per creare una richiesta
          </p>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl h-12"
          >
            Accedi per continuare
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
            <h1 className="text-lg font-bold text-white">Crea richiesta</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Come funzionano le richieste:</strong> pubblica cosa stai cercando e imposta una ricompensa.
            Gli utenti troveranno opportunità compatibili e te le invieranno.
            Quando approvi un invio, chi l’ha trovata guadagna la ricompensa.
          </p>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">Cosa stai cercando? *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Es. macchina da caffè professionale"
            className="mt-1.5 h-12 rounded-xl"
            required
            data-testid="bounty-title-input"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Descrizione *</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descrivi esattamente cosa ti serve, eventuali marche, caratteristiche o requisiti specifici..."
            className="mt-1.5 min-h-[120px] rounded-xl"
            required
            data-testid="bounty-description-input"
          />
        </div>

        {/* Category */}
        <div>
          <Label>Categoria *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-xl" data-testid="bounty-category-select">
              <SelectValue placeholder="Seleziona categoria" />
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
              Ricompensa *
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
            <p className="text-xs text-gray-500 mt-1">Pagata a chi trova l’occasione</p>
          </div>
          <div>
            <Label htmlFor="max_price">
              <Euro className="w-4 h-4 inline mr-1" />
              Budget massimo
            </Label>
            <Input
              id="max_price"
              name="max_price"
              type="number"
              value={formData.max_price}
              onChange={handleChange}
              placeholder="Opzionale"
              className="mt-1.5 h-12 rounded-xl"
              data-testid="bounty-budget-input"
            />
            <p className="text-xs text-gray-500 mt-1">Il tuo prezzo massimo</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <Label>Area di ricerca</Label>
          <div className="mt-1.5 space-y-2">
            <Input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Nome zona (opzionale)"
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
                Usa la mia posizione
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
              Creazione in corso...
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Crea richiesta
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default CreateBounty;