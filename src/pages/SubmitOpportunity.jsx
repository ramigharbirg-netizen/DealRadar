import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ImagePlus,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
import {
  categories,
  getSubcategories,
  getSubcategoryAttributes,
  optionalLocationCategoryIds,
} from "../data/categories";
import OpportunityCategoryFields from '../components/OpportunityCategoryFields';
import OpportunityWizard from '../components/opportunity-wizard/OpportunityWizard';
import {
  applyWizardEntry,
  applyWizardSubcategory,
  getRealEstateRentPeriodOptions,
  getWizardEntryById,
  getWizardEntryForValue,
} from '../data/opportunityWizardCatalog';
import {
  getDefaultDealCustomExpiry,
  resolveDealExpiryIso,
} from '../utils/opportunityLifecycle';

const MAX_IMAGES = 5;
const MAX_UPLOAD_IMAGE_SIZE_MB = 15;
const MAX_UPLOAD_IMAGE_SIZE_BYTES = MAX_UPLOAD_IMAGE_SIZE_MB * 1024 * 1024;

const MAX_STORED_IMAGE_SIZE_MB = 2;
const MAX_STORED_IMAGE_SIZE_BYTES = MAX_STORED_IMAGE_SIZE_MB * 1024 * 1024;

const COMPRESSED_IMAGE_MAX_WIDTH = 1400;
const COMPRESSED_IMAGE_MAX_HEIGHT = 1400;
const COMPRESSED_IMAGE_QUALITY = 0.78;
const DEFAULT_MAX_OPPORTUNITIES_PER_24H = 20;
const NEW_USER_MAX_OPPORTUNITIES_PER_24H = 20;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];


const COUNTERFEIT_RISK_TERMS = [
  'replica',
  'repliche',
  'fake',
  'falso',
  'falsa',
  'falsi',
  'false',
  'contraffatto',
  'contraffatta',
  'contraffatti',
  'contraffatte',
  'imitazione',
  'imitazioni',
  'clone',
  'cloni',
  'tarocco',
  'tarocca',
  'tarocchi',
  'tarocche',
  'non originale',
  'non autentico',
  'non autentica',
  '1:1',
  'mirror quality',
];

const detectCounterfeitRiskTerms = (title = '', description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  return COUNTERFEIT_RISK_TERMS.filter((term) => text.includes(term));
};

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

const sanitizeImageFile = async (file, extension) => {
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

      const outputMime =
        extension === 'png'
          ? 'image/png'
          : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

      const outputExtension =
        outputMime === 'image/png'
          ? 'png'
          : outputMime === 'image/webp'
            ? 'webp'
            : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Sanitizzazione immagine non riuscita'));
            return;
          }

          const sanitizedFile = new File(
            [blob],
            `immagine.${outputExtension}`,
            {
              type: outputMime,
              lastModified: Date.now(),
            }
          );

          resolve({ file: sanitizedFile, extension: outputExtension });
        },
        outputMime,
        outputMime === 'image/png' ? undefined : COMPRESSED_IMAGE_QUALITY
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Compressione immagine non riuscita'));
    };

    image.src = objectUrl;
  });
};

const sanitizeCategoryAttributes = (
  categoryId,
  subcategoryId,
  rawAttributes
) => {
  if (!categoryId || !subcategoryId || !rawAttributes || typeof rawAttributes !== 'object') {
    return {};
  }

  const definitions = getSubcategoryAttributes(categoryId, subcategoryId);
  const sanitized = {};

  definitions.forEach((definition) => {
    const rawValue = rawAttributes[definition.id];
    const allowedOptionIds = new Set(
      definition.options.map((option) => option.id)
    );

    if (definition.type === 'single_select') {
      if (
        typeof rawValue === 'string' &&
        allowedOptionIds.has(rawValue)
      ) {
        sanitized[definition.id] = rawValue;
      }

      return;
    }

    if (definition.type === 'multi_select' && Array.isArray(rawValue)) {
      const cleanValues = Array.from(
        new Set(
          rawValue.filter(
            (value) =>
              typeof value === 'string' &&
              allowedOptionIds.has(value)
          )
        )
      );

      if (cleanValues.length > 0) {
        sanitized[definition.id] = cleanValues;
      }
    }
  });

  return sanitized;
};

export const SubmitOpportunity = () => {
  const { user, loading: authLoading } = useAuth();
  const { location, requestLocation } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [publicationType, setPublicationType] = useState('');

  const uploadedFingerprintsRef = useRef(new Set());
  const uploadedImagePathsRef = useRef(new Set());
  const submittedRef = useRef(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    attributes: {},
    latitude: null,
    longitude: null,
    address: '',
    estimated_price: '',
    estimated_resale_value: '',
    contact_phone: '',
    contact_email: '',
    contact_link: '',
    merchant_name: '',
    deal_expiry_option: '7d',
    custom_expires_at: getDefaultDealCustomExpiry(),
  });

  const [images, setImages] = useState([]);
  const [uploadedImageItems, setUploadedImageItems] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [wizardEntryId, setWizardEntryId] = useState('');
  const [positionConfirmed, setPositionConfirmed] = useState(false);

  const [authenticityDeclared, setAuthenticityDeclared] = useState(false);

  useEffect(() => {
  if (authLoading) return;

  if (!user) {
    navigate('/login', { replace: true });
  }
}, [authLoading, user, navigate]);

  const detectedCounterfeitTerms = detectCounterfeitRiskTerms(
  formData.title,
  formData.description
);

const hasCounterfeitRisk = detectedCounterfeitTerms.length > 0;

  const selectedCategorySubcategories = formData.category
    ? getSubcategories(formData.category)
    : [];

  const requiresSubcategory = selectedCategorySubcategories.length > 0;

  const selectedWizardEntry = wizardEntryId
    ? getWizardEntryById(wizardEntryId, publicationType)
    : getWizardEntryForValue(
        publicationType,
        formData.category,
        formData.attributes,
        formData.subcategory
      );

  const handlePublicationTypeSelect = (type) => {
    if (!type?.id) return;

    setPublicationType(type.id);
    setWizardEntryId('');
    setAuthenticityDeclared(false);
    setPositionConfirmed(false);
    setFormData((previous) => ({
      ...previous,
      category: '',
      subcategory: '',
      attributes: {},
      latitude: null,
      longitude: null,
      address: '',
      estimated_price: '',
      estimated_resale_value: '',
      contact_phone: '',
      contact_email: '',
      contact_link: '',
      merchant_name: '',
    }));
  };

  const handleWizardEntrySelect = (entry) => {
    setWizardEntryId(entry.id);
    setFormData((previous) => {
      const nextFormData = applyWizardEntry(entry, previous);

      if (publicationType !== 'real_estate') {
        return nextFormData;
      }

      return {
        ...nextFormData,
        attributes: {
          ...nextFormData.attributes,
          rental_period:
            entry.preferredSubcategory === 'casa_vacanze'
              ? ''
              : 'monthly',
        },
        estimated_resale_value: '',
      };
    });
  };

  const handleWizardSubcategorySelect = (subcategoryId) => {
    setFormData((previous) =>
      applyWizardSubcategory(selectedWizardEntry, subcategoryId, previous)
    );
  };

  const cleanupPendingImageUploads = async ({ blockNavigationOnError = false } = {}) => {
    if (submittedRef.current) return true;

    const pathsToDelete = Array.from(uploadedImagePathsRef.current);

    if (pathsToDelete.length === 0) return true;

    const { error } = await supabase.storage
      .from('opportunity-images')
      .remove(pathsToDelete);

    if (error) {
      console.error('Cleanup orphan images error:', error);

      if (blockNavigationOnError) {
        toast.error(
          'Non riesco a rimuovere le foto temporanee. Riprova tra qualche secondo.'
        );
      }

      return false;
    }

    pathsToDelete.forEach((path) => {
      uploadedImagePathsRef.current.delete(path);
    });

    return true;
  };

  const handleExit = async () => {
    if (submittedRef.current) {
      navigate(-1);
      return;
    }

    const cleanupSucceeded = await cleanupPendingImageUploads({
      blockNavigationOnError: true,
    });

    if (!cleanupSucceeded) return;

    navigate(-1);
  };

  useEffect(() => {
    return () => {
      if (submittedRef.current) return;

      const pathsToDelete = Array.from(uploadedImagePathsRef.current);

      if (pathsToDelete.length === 0) return;

      void supabase.storage
        .from('opportunity-images')
        .remove(pathsToDelete)
        .then(({ error }) => {
          if (error) {
            console.error('Unmount orphan image cleanup error:', error);
          }
        });
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

    if (file.size > MAX_UPLOAD_IMAGE_SIZE_BYTES) {
  toast.error(`${file.name} è troppo grande. Massimo ${MAX_UPLOAD_IMAGE_SIZE_MB} MB per foto.`);
  return null;
}

    if (file.size <= 0) {
      toast.error(`${file.name} non è un file valido.`);
      return null;
    }

    const fingerprint = getImageFingerprint(file);

    if (uploadedFingerprintsRef.current.has(fingerprint)) {
      toast.error(`${file.name} è già stata caricata.`);
      return null;
    }

    const extension = getFileExtension(file.name);
    const declaredMime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    const hasValidType = ALLOWED_IMAGE_TYPES.includes(file.type);
    const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.includes(extension);
    const detected = await detectImageTypeFromFile(file);

    if (!hasValidType || !hasValidExtension || !detected) {
      toast.error(`Formato non valido: ${file.name}. Usa solo JPG, PNG o WEBP.`);
      return null;
    }

    const extensionMatchesDetected =
      detected.extension === 'jpg'
        ? extension === 'jpg' || extension === 'jpeg'
        : extension === detected.extension;

    if (declaredMime !== detected.mime || !extensionMatchesDetected) {
      toast.error(`Il contenuto di ${file.name} non corrisponde al formato dichiarato.`);
      return null;
    }

    return {
      file,
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
          const sanitized = await sanitizeImageFile(file, extension);
          file = sanitized.file;
          extension = sanitized.extension;
        } catch (sanitizationError) {
          console.error('Image sanitization error:', sanitizationError);
          toast.error(`Impossibile elaborare ${file.name}.`);
          continue;
        }

        if (file.size > MAX_STORED_IMAGE_SIZE_BYTES) {
  toast.error(
    `${file.name} resta troppo grande anche dopo la compressione. Prova con un'altra foto.`
  );
  continue;
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

  const reverseGeocodeCoordinates = async (latitude, longitude) => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'it',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Reverse geocoding non riuscito (${response.status})`
    );
  }

  const result = await response.json();

  if (!result || !result.display_name) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    displayName: result.display_name,
  };
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
    const subcategory = formData.subcategory;
    const sanitizedAttributes = sanitizeCategoryAttributes(
      category,
      subcategory,
      formData.attributes
    );

    const allowedRentPeriods = new Set(
      getRealEstateRentPeriodOptions(subcategory).map((option) => option.id)
    );
    const selectedRentPeriod = formData.attributes?.rental_period;
    const attributes =
      publicationType === 'real_estate' &&
      typeof selectedRentPeriod === 'string' &&
      allowedRentPeriods.has(selectedRentPeriod)
        ? {
            ...sanitizedAttributes,
            rental_period: selectedRentPeriod,
          }
        : sanitizedAttributes;
    const address = formData.address.trim();
    const merchantName = formData.merchant_name.trim();
    const isDeal = publicationType === 'deal';
    const isFreeDeal = category === 'free_deals';
    const locationOptional = !isDeal && optionalLocationCategoryIds.includes(category);

    if (!publicationType) {
      toast.error('Seleziona il tipo di pubblicazione');
      return;
    }

    if (!title || !description || !category) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (getSubcategories(category).length > 0 && !subcategory) {
      toast.error('Seleziona una sottocategoria');
      return;
    }

    if (
      publicationType === 'real_estate' &&
      formData.estimated_price !== '' &&
      !attributes.rental_period
    ) {
      toast.error('Seleziona il periodo del canone di affitto');
      return;
    }

    if (isDeal && merchantName.length < 2) {
      toast.error('Inserisci il nome del negozio in cui hai trovato l’affare');
      return;
    }

    if (isDeal && merchantName.length > 120) {
      toast.error('Il nome del negozio non può superare 120 caratteri');
      return;
    }

    if (isDeal && images.length === 0) {
      toast.error('Aggiungi almeno una foto dell’affare');
      return;
    }

    const counterfeitRiskTerms = detectCounterfeitRiskTerms(title, description);
const counterfeitRiskFlag = counterfeitRiskTerms.length > 0;

if (counterfeitRiskFlag && !authenticityDeclared) {
  toast.error('Per pubblicare questo annuncio devi confermare la dichiarazione di autenticità.');
  return;
}

    if (!locationOptional && !address && !positionConfirmed) {
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

      if (
  positionConfirmed &&
  formData.latitude &&
  formData.longitude
) {
  finalLatitude = Number(formData.latitude);
  finalLongitude = Number(formData.longitude);
  finalAddress = address || null;

  if (!finalAddress) {
    const reverseGeocoded = await reverseGeocodeCoordinates(
      finalLatitude,
      finalLongitude
    );

    if (!reverseGeocoded) {
      toast.error(
        'Posizione rilevata, ma non è stato possibile ricavare l’indirizzo.'
      );
      setLoading(false);
      return;
    }

    finalAddress = reverseGeocoded.displayName;
  }
} else if (finalAddress) {
  const geocoded = await geocodeAddress(finalAddress);

  if (!geocoded) {
    toast.error('Indirizzo non trovato. Prova a scriverlo meglio.');
    setLoading(false);
    return;
  }

  finalLatitude = geocoded.lat;
  finalLongitude = geocoded.lng;
  finalAddress = geocoded.displayName || finalAddress;
}

      if (
  !locationOptional &&
  (
    finalLatitude === null ||
    finalLongitude === null ||
    Number.isNaN(finalLatitude) ||
    Number.isNaN(finalLongitude)
  )
) {
  toast.error('Mancano le coordinate. Inserisci un indirizzo o usa la posizione attuale.');
  setLoading(false);
  return;
}

      const estimatedPrice =
  publicationType === 'deal' || category === 'job_offers' || isFreeDeal
    ? null
    : formData.estimated_price !== ''
      ? Number(formData.estimated_price)
      : null;

const estimatedResaleValue =
  publicationType === 'deal' || category === 'job_offers' || isFreeDeal
    ? null
    : formData.estimated_resale_value !== ''
      ? Number(formData.estimated_resale_value)
      : null;

      if (estimatedPrice !== null && Number.isNaN(estimatedPrice)) {
        toast.error('Prezzo richiesto non valido');
        setLoading(false);
        return;
      }

      if (estimatedResaleValue !== null && Number.isNaN(estimatedResaleValue)) {
  toast.error('Valore stimato non valido');
  setLoading(false);
  return;
}

      const dealExpiresAt = isDeal
        ? resolveDealExpiryIso(
            formData.deal_expiry_option,
            formData.custom_expires_at
          )
        : null;

      const payload = {
        content_type: publicationType,
        merchant_name: isDeal ? merchantName : null,
        ...(isDeal ? { expires_at: dealExpiresAt } : {}),
        title,
        description,
        category,
        subcategory: subcategory || null,
        attributes,
        latitude: finalLatitude,
        longitude: finalLongitude,
        address: finalAddress,
        estimated_price: estimatedPrice,
        estimated_resale_value: estimatedResaleValue,
        contact_phone:
          publicationType === 'deal' ? null : formData.contact_phone.trim() || null,
        contact_email:
          publicationType === 'deal' ? null : formData.contact_email.trim() || null,
        contact_link:
          publicationType === 'deal' ? null : formData.contact_link.trim() || null,
        images: images.length > 0 ? images : [],
        authenticity_declared: counterfeitRiskFlag && authenticityDeclared,
        counterfeit_risk_flag: counterfeitRiskFlag,
        counterfeit_risk_terms: counterfeitRiskTerms,
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

if (counterfeitRiskFlag) {
  const { error: counterfeitReportError } = await supabase.rpc(
    'create_counterfeit_risk_report',
    {
      p_opportunity_id: createdOpportunity.id,
      p_terms: counterfeitRiskTerms,
    }
  );

  if (counterfeitReportError) {
    console.error('Counterfeit risk report error:', counterfeitReportError);
  }
}

      await trackEvent({
        userId: user.id,
        eventName: 'create_opportunity',
        entityType: 'opportunity',
        entityId: createdOpportunity.id,
        category: createdOpportunity.category,
        metadata: {
          publication_type: publicationType,
          content_type: createdOpportunity.content_type,
          merchant_name: createdOpportunity.merchant_name,
          title: createdOpportunity.title,
          subcategory: createdOpportunity.subcategory,
          attributes: createdOpportunity.attributes,
          estimated_price: createdOpportunity.estimated_price,
          estimated_resale_value: createdOpportunity.estimated_resale_value,
        },
      });

      toast.success('Opportunità pubblicata con successo!');

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

      const latitude = position.coords.latitude;
const longitude = position.coords.longitude;

const reverseGeocoded = await reverseGeocodeCoordinates(
  latitude,
  longitude
);

if (!reverseGeocoded) {
  toast.error(
    'Posizione rilevata, ma non è stato possibile ricavare l’indirizzo.'
  );
  return;
}

setFormData((prev) => ({
  ...prev,
  address: reverseGeocoded.displayName,
  latitude,
  longitude,
}));

setPositionConfirmed(true);
toast.success('Posizione attuale selezionata');
    } catch (err) {
      console.error('Use current location error:', err);
      toast.error('Impossibile ottenere la tua posizione');
    }
  };

  if (authLoading || !user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

  return (
    <OpportunityWizard
      step={step}
      setStep={setStep}
      publicationType={publicationType}
      onSelectPublicationType={handlePublicationTypeSelect}
      selectedEntry={selectedWizardEntry}
      onSelectEntry={handleWizardEntrySelect}
      onSelectSubcategory={handleWizardSubcategorySelect}
      formData={formData}
      setFormData={setFormData}
      images={images}
      uploadingImages={uploadingImages}
      loading={loading}
      authLoading={authLoading}
      photoSourceOpen={photoSourceOpen}
      setPhotoSourceOpen={setPhotoSourceOpen}
      cameraInputRef={cameraInputRef}
      fileInputRef={fileInputRef}
      onImageUpload={handleImageUpload}
      onRemoveImage={removeImage}
      onChange={handleChange}
      useCurrentLocation={useCurrentLocation}
      positionConfirmed={positionConfirmed}
      authenticityDeclared={authenticityDeclared}
      setAuthenticityDeclared={setAuthenticityDeclared}
      hasCounterfeitRisk={hasCounterfeitRisk}
      onSubmit={handleSubmit}
      onExit={handleExit}
      maxImages={MAX_IMAGES}
      maxUploadMb={MAX_UPLOAD_IMAGE_SIZE_MB}
    />
  );
};

export default SubmitOpportunity;