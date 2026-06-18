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
import { trackEvent } from '../lib/analytics';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const COMPRESSED_IMAGE_MAX_WIDTH = 1600;
const COMPRESSED_IMAGE_MAX_HEIGHT = 1600;
const COMPRESSED_IMAGE_QUALITY = 0.82;
const MAX_IMAGE_WIDTH = 4000;
const MAX_IMAGE_HEIGHT = 4000;
const DEFAULT_MAX_OPPORTUNITIES_PER_24H = 5;
const NEW_USER_MAX_OPPORTUNITIES_PER_24H = 2;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

const categories = [
  { id: 'store_liquidation', name: 'Liquidazione negozio' },
  { id: 'product_stock', name: 'Stock prodotti' },
  { id: 'equipment', name: 'Attrezzature e macchinari' },
  { id: 'business_sale', name: 'Attività in vendita' },
  { id: 'objects', name: 'Oggetti' },
  { id: 'auctions', name: 'Aste e fallimenti' },
  { id: 'user_reported', name: 'Segnalata dagli utenti' },
  { id: 'free_deals', name: 'Occasioni gratis' },
];

const getFileExtension = (filename = '') => {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return '';
  return parts.pop();
};

const getImageFingerprint = (file) => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

const detectImageTypeFromFile = async (file) => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: 'image/png', extension: 'png' };
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
};

const compressImageFile = async (file, extension) => {
  if (extension === 'png') return file;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = image;

      if (width > COMPRESSED_IMAGE_MAX_WIDTH || height > COMPRESSED_IMAGE_MAX_HEIGHT) {
        const ratio = Math.min(
          COMPRESSED_IMAGE_MAX_WIDTH / width,
          COMPRESSED_IMAGE_MAX_HEIGHT / height
        );

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        COMPRESSED_IMAGE_QUALITY
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Compressione immagine non riuscita'));
    };

    image.src = objectUrl;
  });
};

const validateImageDimensions = async (file) => {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (
        image.width > MAX_IMAGE_WIDTH ||
        image.height > MAX_IMAGE_HEIGHT
      ) {
        resolve(false);
        return;
      }

      resolve(true);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };

    image.src = objectUrl;
  });
};

export const SubmitOpportunity = () => {
  const { user, loading: authLoading } = useAuth();
  const { location, requestLocation } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const uploadedFingerprintsRef = useRef(new Set());
  const uploadedImagePathsRef = useRef(new Set());
  const submittedRef = useRef(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    latitude: null,
    longitude: null,
    address: '',
    estimated_price: '',
    estimated_resale_value: '',
    contact_phone: '',
    contact_email: '',
    contact_link: '',
  });

  const [images, setImages] = useState([]);
  const [uploadedImageItems, setUploadedImageItems] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [positionConfirmed, setPositionConfirmed] = useState(false);

  useEffect(() => {
    return () => {
      if (submittedRef.current) return;

      const pathsToDelete = Array.from(uploadedImagePathsRef.current);

      if (pathsToDelete.length > 0) {
        supabase.storage
          .from('opportunity-images')
          .remove(pathsToDelete)
          .then(({ error }) => {
            if (error) {
              console.error('Cleanup orphan images error:', error);
            }
          });
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'address') {
      setPositionConfirmed(false);
      setFormData((prev) => ({
        ...prev,
        address: value,
        latitude: null,
        longitude: null,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateImageBeforeUpload = async (file) => {
    if (!file) return null;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`${file.name} è troppo grande. Massimo ${MAX_IMAGE_SIZE_MB} MB per foto.`);
      return null;
    }

    if (file.size <= 0) {
      toast.error(`${file.name} non è un file valido.`);
      return null;
    }

const validDimensions = await validateImageDimensions(file);

if (!validDimensions) {
  toast.error(
    `${file.name} ha dimensioni troppo grandi. Max ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`
  );
  return null;
}
    const fingerprint = getImageFingerprint(file);

    if (uploadedFingerprintsRef.current.has(fingerprint)) {
      toast.error(`${file.name} è già stata caricata.`);
      return null;
    }

    const extension = getFileExtension(file.name);
    const hasValidType = ALLOWED_IMAGE_TYPES.includes(file.type);
    const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.includes(extension);

    if (hasValidType && hasValidExtension) {
      return { file, extension, fingerprint };
    }

    const detected = await detectImageTypeFromFile(file);

    if (!detected) {
      toast.error(`Formato non valido: ${file.name}. Usa solo JPG, PNG o WEBP.`);
      return null;
    }

    const cleanName = file.name || `immagine-${Date.now()}`;
    const fixedFile = new File([file], `${cleanName}.${detected.extension}`, {
      type: detected.mime,
      lastModified: file.lastModified,
    });

    return {
      file: fixedFile,
      extension: detected.extension,
      fingerprint,
    };
  };

  const handleImageUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > MAX_IMAGES) {
  toast.error(`Puoi selezionare massimo ${MAX_IMAGES} immagini`);
  return;
}

    if (selectedFiles.length === 0) return;

    if (!user) {
      toast.error('Devi fare login per caricare immagini');
      e.target.value = '';
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      toast.error(`Puoi caricare massimo ${MAX_IMAGES} immagini`);
      e.target.value = '';
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      if (validFiles.length >= remainingSlots) break;

      const validatedFile = await validateImageBeforeUpload(file);

      if (validatedFile) {
        validFiles.push(validatedFile);
      }
    }

    if (selectedFiles.length > remainingSlots) {
      toast.warning(`Puoi aggiungere solo altre ${remainingSlots} immagini`);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setUploadingImages(true);

    try {
      for (const item of validFiles) {
        let file = item.file;
        let extension = item.extension;
        const fingerprint = item.fingerprint;

        try {
          const compressedFile = await compressImageFile(file, extension);

          if (compressedFile.size < file.size) {
            file = compressedFile;
            extension = 'jpg';
          }
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
        }

        const safeFileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}.${extension}`;

        const filePath = `${user.id}/${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('opportunity-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
  console.error('Upload error:', uploadError);

  const message = String(uploadError.message || '').toLowerCase();

  if (
    message.includes('jwt') ||
    message.includes('unauthorized') ||
    message.includes('not authorized') ||
    message.includes('permission') ||
    message.includes('row-level security') ||
    message.includes('policy')
  ) {
    toast.error(
      'Devi confermare la tua email prima di caricare immagini. Controlla la casella email e clicca sul link di conferma.'
    );
    continue;
  }

  toast.error(`Errore upload ${file.name}`);
  continue;
}

        const { data: publicUrlData } = supabase.storage
          .from('opportunity-images')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          toast.error(`Errore URL immagine ${file.name}`);
          await supabase.storage.from('opportunity-images').remove([filePath]);
          continue;
        }

        uploadedFingerprintsRef.current.add(fingerprint);
        uploadedImagePathsRef.current.add(filePath);

        const uploadedItem = {
          url: publicUrlData.publicUrl,
          path: filePath,
          fingerprint,
        };

        setUploadedImageItems((prev) => [...prev, uploadedItem]);

        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, publicUrlData.publicUrl];
        });

        toast.success(`${file.name} caricata`);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Errore durante upload immagini');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = async (index) => {
    const imageToRemove = uploadedImageItems[index];

    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedImageItems((prev) => prev.filter((_, i) => i !== index));

    if (imageToRemove?.path) {
      uploadedImagePathsRef.current.delete(imageToRemove.path);
      uploadedFingerprintsRef.current.delete(imageToRemove.fingerprint);

      const { error } = await supabase.storage
        .from('opportunity-images')
        .remove([imageToRemove.path]);

      if (error) {
        console.error('Remove image error:', error);
        toast.error('Foto rimossa dalla preview, ma non dallo storage');
        return;
      }
    }

    toast.success('Foto rimossa');
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
      throw new Error(`Ricerca indirizzo non riuscita (${response.status})`);
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

  const validateImagesBeforeSubmit = () => {
    if (!Array.isArray(images)) {
      toast.error('Errore immagini: formato non valido');
      return false;
    }

    if (images.length > MAX_IMAGES) {
      toast.error(`Puoi pubblicare massimo ${MAX_IMAGES} immagini`);
      return false;
    }

    const invalidImage = images.find(
      (img) =>
        typeof img !== 'string' ||
        (!img.startsWith('https://') && !img.startsWith('http://'))
    );

    if (invalidImage) {
      toast.error('Una o più immagini non sono valide');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (authLoading || loading || uploadingImages) return;

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

    if (!address && !positionConfirmed) {
      toast.error('Inserisci un indirizzo o clicca su “Usa posizione attuale”.');
      return;
    }

    if (!validateImagesBeforeSubmit()) {
      return;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: recentOpportunitiesCount, error: rateLimitError } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      toast.error('Impossibile verificare il limite pubblicazioni');
      return;
    }

    const accountCreatedAt = new Date(user.created_at);
const hoursSinceRegistration =
  (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60);

const isNewUser = hoursSinceRegistration < 24;

const maxAllowedOpportunities = isNewUser
  ? NEW_USER_MAX_OPPORTUNITIES_PER_24H
  : DEFAULT_MAX_OPPORTUNITIES_PER_24H;

if ((recentOpportunitiesCount || 0) >= maxAllowedOpportunities) {
  toast.error(
    `Hai raggiunto il limite di ${maxAllowedOpportunities} opportunità nelle ultime 24 ore.`
  );

  return;
}

    setLoading(true);

    try {
      let finalLatitude = null;
      let finalLongitude = null;
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
      } else if (positionConfirmed && formData.latitude && formData.longitude) {
        finalLatitude = Number(formData.latitude);
        finalLongitude = Number(formData.longitude);
        finalAddress = 'Posizione attuale';
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
        toast.error('Prezzo richiesto non valido');
        setLoading(false);
        return;
      }

      if (estimatedResaleValue !== null && Number.isNaN(estimatedResaleValue)) {
        toast.error('Valore di rivendita non valido');
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

      const { data: createdOpportunity, error } = await supabase
        .from('opportunities')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      submittedRef.current = true;
      uploadedImagePathsRef.current = new Set();

      const matchesCount = await createAutomaticBountyMatches(createdOpportunity);

      await trackEvent({
        userId: user.id,
        eventName: 'create_opportunity',
        entityType: 'opportunity',
        entityId: createdOpportunity.id,
        category: createdOpportunity.category,
        metadata: {
          title: createdOpportunity.title,
          estimated_price: createdOpportunity.estimated_price,
          estimated_resale_value: createdOpportunity.estimated_resale_value,
          matches_count: matchesCount,
        },
      });

      if (matchesCount > 0) {
        toast.success(
          `Opportunità pubblicata! Trovate ${matchesCount} possibili richieste compatibili.`
        );
      } else {
        toast.success('Opportunità pubblicata con successo!');
      }

      navigate('/feed');
    } catch (err) {
      console.error('Submit opportunity error FULL:', err);
      toast.error(err?.message || 'Impossibile pubblicare l’opportunità');
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
        toast.error('Impossibile ottenere la tua posizione');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        address: '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));

      setPositionConfirmed(true);
      toast.success('Posizione attuale selezionata');
    } catch (err) {
      console.error('Use current location error:', err);
      toast.error('Impossibile ottenere la tua posizione');
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
            <h1 className="text-lg font-bold">Invia opportunità</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Fase {step}/2
          </div>
        </div>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${step * 50}%` }}
          />
        </div>
      </div>

      <form
  onSubmit={handleSubmit}
  className="mx-auto max-w-4xl space-y-6 px-4 py-6"
>
        {step === 1 && (
          <>
            <div>
              <Label className="mb-2 block">Foto</Label>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={img}
                      alt={`Foto caricata ${index + 1}`}
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

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
                    data-testid="add-photo-btn"
                  >
                    {uploadingImages ? (
                      <Loader2 className="w-6 h-6 mb-1 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 mb-1" />
                    )}
                    <span className="text-xs">
                      {uploadingImages ? 'Carico...' : 'Aggiungi foto'}
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Puoi caricare fino a {MAX_IMAGES} immagini. Formati: JPG, PNG, WEBP. Max{' '}
                {MAX_IMAGE_SIZE_MB} MB per foto.
              </p>
            </div>

            <div>
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Es. liquidazione negozio di elettronica"
                className="mt-1.5 h-12 rounded-xl"
                required
                data-testid="title-input"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descrivi l’opportunità nel dettaglio..."
                className="mt-1.5 min-h-[120px] rounded-xl"
                required
                data-testid="description-input"
              />
            </div>

            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="mt-1.5 h-12 rounded-xl" data-testid="category-select">
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

            <Button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-12 bg-primary rounded-xl"
              disabled={
                uploadingImages ||
                !formData.title.trim() ||
                !formData.description.trim() ||
                !formData.category
              }
              data-testid="next-step-btn"
            >
              Continua
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>Posizione *</Label>
              <div className="mt-1.5 space-y-2">
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Inserisci indirizzo o nome della zona"
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
                  {positionConfirmed ? 'Posizione attuale selezionata' : 'Usa posizione attuale'}
                </Button>

                <p className="text-xs text-gray-500">
                  Devi inserire un indirizzo oppure usare la posizione attuale.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_price">
                  <span className="mr-1 inline text-sm font-semibold">€</span>
                  Prezzo richiesto
                </Label>
                <Input
                  id="estimated_price"
                  name="estimated_price"
                  type="number"
                  min="0"
                  value={formData.estimated_price}
                  onChange={handleChange}
                  placeholder="0"
                  className="mt-1.5 h-12 rounded-xl"
                  data-testid="price-input"
                />
              </div>
              <div>
                <Label htmlFor="estimated_resale_value">
                  <span className="mr-1 inline text-sm font-semibold">€</span>
                  Valore rivendita
                </Label>
                <Input
                  id="estimated_resale_value"
                  name="estimated_resale_value"
                  type="number"
                  min="0"
                  value={formData.estimated_resale_value}
                  onChange={handleChange}
                  placeholder="0"
                  className="mt-1.5 h-12 rounded-xl"
                  data-testid="resale-input"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Informazioni di contatto</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="Numero di telefono"
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
                  placeholder="Indirizzo email"
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
                  placeholder="Sito web o link annuncio"
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
                Indietro
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 bg-primary rounded-xl"
                disabled={loading || authLoading || uploadingImages}
                data-testid="submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Invia
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