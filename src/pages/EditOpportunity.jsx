import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import OpportunityWizard from '../components/opportunity-wizard/OpportunityWizard';
import {
  getSubcategories,
  getSubcategoryAttributes,
  optionalLocationCategoryIds,
} from '../data/categories';
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
  toLocalDateTimeInputValue,
} from '../utils/opportunityLifecycle';

const MAX_IMAGES = 5;
const MAX_UPLOAD_IMAGE_SIZE_MB = 15;

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

const inferLegacyContentType = (category) => {
  if (category === 'job_offers') return 'job';
  if (category === 'rental_homes') return 'real_estate';
  return 'sale';
};

const sanitizeCategoryAttributes = (
  categoryId,
  subcategoryId,
  rawAttributes
) => {
  if (
    !categoryId ||
    !subcategoryId ||
    !rawAttributes ||
    typeof rawAttributes !== 'object'
  ) {
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
      if (typeof rawValue === 'string' && allowedOptionIds.has(rawValue)) {
        sanitized[definition.id] = rawValue;
      }
      return;
    }

    if (definition.type === 'multi_select' && Array.isArray(rawValue)) {
      const cleanValues = Array.from(
        new Set(
          rawValue.filter(
            (value) =>
              typeof value === 'string' && allowedOptionIds.has(value)
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

const parseOptionalNonNegativeNumber = (value, label) => {
  if (value === '' || value === null || value === undefined) return null;

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} non valido`);
  }

  return number;
};

const EditOpportunity = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { requestLocation } = useLocation();
  const navigate = useNavigate();

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [publicationType, setPublicationType] = useState('');
  const [wizardEntryId, setWizardEntryId] = useState('');
  const [images, setImages] = useState([]);
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [authenticityDeclared, setAuthenticityDeclared] = useState(false);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);

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
    deal_expiry_option: 'custom',
    custom_expires_at: getDefaultDealCustomExpiry(),
  });

  const selectedWizardEntry = wizardEntryId
    ? getWizardEntryById(wizardEntryId, publicationType)
    : getWizardEntryForValue(
        publicationType,
        formData.category,
        formData.attributes,
        formData.subcategory
      );

  const detectedCounterfeitTerms = useMemo(
    () =>
      detectCounterfeitRiskTerms(formData.title, formData.description),
    [formData.title, formData.description]
  );

  const hasCounterfeitRisk = detectedCounterfeitTerms.length > 0;

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      toast.error('Devi fare login per modificare una pubblicazione');
      navigate('/login');
      return;
    }

    if (!id) {
      toast.error('Pubblicazione non valida');
      navigate('/profile');
      return;
    }

    let cancelled = false;

    const loadOpportunity = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('opportunities')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (cancelled) return;

        const resolvedType =
          data.content_type || inferLegacyContentType(data.category);
        const resolvedAttributes =
          data.attributes && typeof data.attributes === 'object'
            ? data.attributes
            : {};
        const resolvedSubcategory = data.subcategory || '';
        const resolvedEntry = getWizardEntryForValue(
          resolvedType,
          data.category || '',
          resolvedAttributes,
          resolvedSubcategory
        );

        setPublicationType(resolvedType);
        setWizardEntryId(resolvedEntry?.id || '');
        setImages(Array.isArray(data.images) ? data.images.filter(Boolean) : []);
        setPositionConfirmed(
          data.latitude !== null &&
            data.latitude !== undefined &&
            data.longitude !== null &&
            data.longitude !== undefined
        );

        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          subcategory: resolvedSubcategory,
          attributes: resolvedAttributes,
          latitude:
            data.latitude !== null && data.latitude !== undefined
              ? Number(data.latitude)
              : null,
          longitude:
            data.longitude !== null && data.longitude !== undefined
              ? Number(data.longitude)
              : null,
          address: data.address || '',
          estimated_price:
            data.estimated_price !== null &&
            data.estimated_price !== undefined
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
          merchant_name: data.merchant_name || '',
          deal_expiry_option: 'custom',
          custom_expires_at:
            toLocalDateTimeInputValue(data.expires_at) ||
            getDefaultDealCustomExpiry(),
        });
      } catch (error) {
        console.error('Load opportunity error:', error);
        toast.error('Pubblicazione non trovata o non modificabile');
        navigate('/profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOpportunity();

    return () => {
      cancelled = true;
    };
  }, [authLoading, id, navigate, user?.id]);

  const handlePublicationTypeSelect = (type) => {
    if (!type?.id || type.id !== publicationType) return;
  };

  const handleWizardEntrySelect = (entry) => {
    if (!entry?.id) return;

    setWizardEntryId(entry.id);
    setAuthenticityDeclared(false);

    setFormData((previous) => {
      const nextFormData = applyWizardEntry(entry, previous);
      const isFreeDeal = entry.categoryId === 'free_deals';

      if (publicationType === 'deal') {
        return {
          ...nextFormData,
          estimated_price: '',
          estimated_resale_value: '',
          contact_phone: '',
          contact_email: '',
          contact_link: '',
        };
      }

      if (publicationType === 'job') {
        return {
          ...nextFormData,
          merchant_name: '',
          estimated_price: '',
          estimated_resale_value: '',
        };
      }

      if (publicationType === 'real_estate') {
        return {
          ...nextFormData,
          merchant_name: '',
          attributes: {
            ...nextFormData.attributes,
            rental_period:
              entry.preferredSubcategory === 'casa_vacanze'
                ? ''
                : 'monthly',
          },
          estimated_resale_value: '',
        };
      }

      return {
        ...nextFormData,
        merchant_name: '',
        estimated_price: isFreeDeal ? '' : previous.estimated_price,
        estimated_resale_value: isFreeDeal
          ? ''
          : previous.estimated_resale_value,
      };
    });
  };

  const handleWizardSubcategorySelect = (subcategoryId) => {
    setFormData((previous) =>
      applyWizardSubcategory(
        selectedWizardEntry,
        subcategoryId,
        previous
      )
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'address') {
      setPositionConfirmed(false);
      setFormData((previous) => ({
        ...previous,
        address: value,
        latitude: null,
        longitude: null,
      }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const useCurrentLocation = async () => {
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

setFormData((previous) => ({
  ...previous,
  address: reverseGeocoded.displayName,
  latitude,
  longitude,
}));

setPositionConfirmed(true);
toast.success('Posizione attuale selezionata');
    } catch (error) {
      console.error('Use current location error:', error);
      toast.error('Impossibile ottenere la tua posizione');
    }
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
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Ricerca indirizzo non riuscita (${response.status})`);
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) return null;

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
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
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  };
};

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading || authLoading || !user?.id || !id) return;

    const title = formData.title.trim();
    const description = formData.description.trim();
    const category = formData.category;
    const subcategory = formData.subcategory;
    const merchantName = formData.merchant_name.trim();
    const isDeal = publicationType === 'deal';
    const isJob = publicationType === 'job';
    const isRealEstate = publicationType === 'real_estate';
    const isFreeDeal = category === 'free_deals';
    const locationOptional =
      !isDeal && optionalLocationCategoryIds.includes(category);

    if (!publicationType || !title || !description || !category) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (getSubcategories(category).length > 0 && !subcategory) {
      toast.error('Seleziona una sottocategoria');
      return;
    }

    if (isDeal && (merchantName.length < 2 || merchantName.length > 120)) {
      toast.error('Inserisci un nome del negozio valido');
      return;
    }

    if (isDeal && images.length === 0) {
      toast.error('Un affare deve avere almeno una foto');
      return;
    }

    if (hasCounterfeitRisk && !authenticityDeclared) {
      toast.error('Conferma la dichiarazione di autenticità');
      return;
    }

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
      isRealEstate &&
      typeof selectedRentPeriod === 'string' &&
      allowedRentPeriods.has(selectedRentPeriod)
        ? {
            ...sanitizedAttributes,
            rental_period: selectedRentPeriod,
          }
        : sanitizedAttributes;

    if (
      isRealEstate &&
      formData.estimated_price !== '' &&
      !attributes.rental_period
    ) {
      toast.error('Seleziona il periodo del canone di affitto');
      return;
    }

    setSaving(true);

    try {
      let finalAddress = formData.address.trim() || null;
      let finalLatitude = formData.latitude;
      let finalLongitude = formData.longitude;

      if (formData.address.trim() && (!finalLatitude || !finalLongitude)) {
        const geocoded = await geocodeAddress(formData.address.trim());

        if (!geocoded) {
          toast.error('Indirizzo non trovato. Prova a scriverlo meglio.');
          return;
        }

        finalAddress = geocoded.displayName || formData.address.trim();
        finalLatitude = geocoded.latitude;
        finalLongitude = geocoded.longitude;
      }

      const hasLocation = Boolean(
        finalAddress ||
          (Number.isFinite(Number(finalLatitude)) &&
            Number.isFinite(Number(finalLongitude)))
      );

      if (!locationOptional && !hasLocation) {
        toast.error('Inserisci un indirizzo oppure usa la posizione attuale');
        return;
      }

      const estimatedPrice =
        isDeal || isJob || isFreeDeal
          ? null
          : parseOptionalNonNegativeNumber(
              formData.estimated_price,
              isRealEstate ? 'Canone' : 'Prezzo'
            );
      const estimatedResaleValue =
        isDeal || isJob || isRealEstate || isFreeDeal
          ? null
          : parseOptionalNonNegativeNumber(
              formData.estimated_resale_value,
              'Valore stimato'
            );

      const dealExpiresAt = isDeal
        ? resolveDealExpiryIso(
            formData.deal_expiry_option,
            formData.custom_expires_at
          )
        : null;

      const payload = {
        title,
        description,
        content_type: publicationType,
        category,
        subcategory: subcategory || null,
        attributes,
        merchant_name: isDeal ? merchantName : null,
        ...(isDeal ? { expires_at: dealExpiresAt } : {}),
        address: finalAddress,
        latitude:
          finalLatitude !== null && finalLatitude !== undefined
            ? Number(finalLatitude)
            : null,
        longitude:
          finalLongitude !== null && finalLongitude !== undefined
            ? Number(finalLongitude)
            : null,
        estimated_price: estimatedPrice,
        estimated_resale_value: estimatedResaleValue,
        contact_phone: isDeal
          ? null
          : formData.contact_phone.trim() || null,
        contact_email: isDeal
          ? null
          : formData.contact_email.trim() || null,
        contact_link: isDeal
          ? null
          : formData.contact_link.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('opportunities')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pubblicazione aggiornata');
      navigate('/profile');
    } catch (error) {
      console.error('Update opportunity error:', error);
      toast.error(error?.message || 'Impossibile aggiornare la pubblicazione');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
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
      uploadingImages={false}
      loading={saving}
      authLoading={authLoading}
      photoSourceOpen={photoSourceOpen}
      setPhotoSourceOpen={setPhotoSourceOpen}
      cameraInputRef={cameraInputRef}
      fileInputRef={fileInputRef}
      onImageUpload={() => {}}
      onRemoveImage={() => {}}
      onChange={handleChange}
      useCurrentLocation={useCurrentLocation}
      positionConfirmed={positionConfirmed}
      authenticityDeclared={authenticityDeclared}
      setAuthenticityDeclared={setAuthenticityDeclared}
      hasCounterfeitRisk={hasCounterfeitRisk}
      onSubmit={handleSubmit}
      onExit={() => navigate(-1)}
      maxImages={MAX_IMAGES}
      maxUploadMb={MAX_UPLOAD_IMAGE_SIZE_MB}
      mode="edit"
      publicationTypeLocked
      imagesReadOnly
    />
  );
};

export default EditOpportunity;