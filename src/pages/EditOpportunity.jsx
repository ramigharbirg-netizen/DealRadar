import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const categories = [
  { id: 'store_liquidation', name: 'Liquidazione negozio' },
  { id: 'product_stock', name: 'Stock prodotti' },
  { id: 'equipment', name: 'Attrezzature e macchinari' },
  { id: 'business_sale', name: 'Attività in vendita' },
  { id: 'auctions', name: 'Aste e fallimenti' },
  { id: 'user_reported', name: 'Segnalata dagli utenti' },
  { id: 'free_deals', name: 'Occasioni gratis' },
];

const EditOpportunity = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    estimated_price: '',
    estimated_resale_value: '',
    contact_phone: '',
    contact_email: '',
    contact_link: '',
  });

  useEffect(() => {
    const loadOpportunity = async () => {
      if (!user?.id || !id) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          address: data.address || '',
          estimated_price:
            data.estimated_price !== null && data.estimated_price !== undefined
              ? String(data.estimated_price)
              : '',
          estimated_resale_value:
            data.estimated_resale_value !== null &&
            data.estimated_resale_value !== undefined
              ? String(data.estimated_resale_value)
              : '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          contact_link: data.contact_link || '',
        });
      } catch (err) {
        console.error('Load opportunity error:', err);
        toast.error('Opportunità non trovata o non modificabile');
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();
  }, [id, user?.id, navigate]);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id || !id) return;

    if (!formData.title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Inserisci una descrizione');
      return;
    }

    if (!formData.category) {
      toast.error('Seleziona una categoria');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        address: formData.address.trim() || null,
        estimated_price:
          formData.estimated_price === ''
            ? null
            : Number(formData.estimated_price),
        estimated_resale_value:
          formData.estimated_resale_value === ''
            ? null
            : Number(formData.estimated_resale_value),
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_link: formData.contact_link.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('opportunities')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Opportunità aggiornata');
      navigate('/profile');
    } catch (err) {
      console.error('Update opportunity error:', err);
      toast.error('Impossibile aggiornare l’opportunità');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Modifica opportunità
            </h1>
            <p className="text-sm text-gray-500">
              Aggiorna le informazioni pubblicate
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl space-y-5 p-4"
      >
        <div className="space-y-2">
          <Label>Titolo *</Label>
          <Input
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Titolo opportunità"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrizione *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Descrivi l'opportunità"
            className="min-h-[120px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateField('category', value)}
          >
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label>Indirizzo</Label>
          <Input
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Indirizzo opportunità"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Prezzo stimato</Label>
            <Input
              type="number"
              value={formData.estimated_price}
              onChange={(e) => updateField('estimated_price', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Valore rivendita</Label>
            <Input
              type="number"
              value={formData.estimated_resale_value}
              onChange={(e) =>
                updateField('estimated_resale_value', e.target.value)
              }
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Telefono</Label>
          <Input
            value={formData.contact_phone}
            onChange={(e) => updateField('contact_phone', e.target.value)}
            placeholder="Numero opzionale"
          />
        </div>

        <div className="space-y-2">
          <Label>Email contatto</Label>
          <Input
            type="email"
            value={formData.contact_email}
            onChange={(e) => updateField('contact_email', e.target.value)}
            placeholder="Email opzionale"
          />
        </div>

        <div className="space-y-2">
          <Label>Link</Label>
          <Input
            value={formData.contact_link}
            onChange={(e) => updateField('contact_link', e.target.value)}
            placeholder="Link opzionale"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-xl bg-primary"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salva modifiche
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default EditOpportunity;