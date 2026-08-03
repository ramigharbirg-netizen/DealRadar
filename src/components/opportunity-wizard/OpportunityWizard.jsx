import React from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import OpportunityCategoryFields from '../OpportunityCategoryFields';
import {
  getCategoryById,
  getSubcategoryById,
  optionalLocationCategoryIds,
} from '../../data/categories';
import {
  getOpportunityWizardSections,
  getPublicationTypeById,
  getRealEstateRentPeriodLabel,
  getRealEstateRentPeriodOptions,
  getWizardCategoryLabel,
  getWizardSubcategories,
  publicationTypes,
} from '../../data/opportunityWizardCatalog';

const STEP_LABELS = ['Tipo', 'Categoria', 'Dettagli', 'Posizione', 'Anteprima'];

const StepHeader = ({ step, title, accent, description }) => (
  <div className="space-y-3 text-center">
    <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em] text-orange-600">
      <span>Passo {step} di {STEP_LABELS.length}</span>
      <span className="text-gray-400">{STEP_LABELS[step - 1]}</span>
    </div>
    <div>
      <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-4xl">
        {title}{' '}
        <span className="text-orange-500">{accent}</span>
      </h2>
      {description && (
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
          {description}
        </p>
      )}
    </div>
  </div>
);

const WizardProgress = ({ step }) => (
  <div className="flex items-center justify-center" aria-label={`Passo ${step} di ${STEP_LABELS.length}`}>
    {STEP_LABELS.map((label, index) => {
      const number = index + 1;
      const completed = number < step;
      const current = number === step;
      const active = completed || current;

      return (
        <React.Fragment key={label}>
          <div className="flex min-w-0 flex-col items-center gap-1.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black transition sm:h-8 sm:w-8 ${
                active
                  ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-400'
              }`}
            >
              {completed ? <Check className="h-4 w-4" /> : number}
            </span>
            <span className={`hidden text-[11px] font-semibold sm:block ${active ? 'text-orange-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {index < STEP_LABELS.length - 1 && (
            <div className={`mx-1.5 mb-5 h-px w-5 sm:mx-3 sm:w-12 ${number < step ? 'bg-orange-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const PublicationTypeStep = ({ value, onSelect }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
    {publicationTypes.map((type) => {
      const Icon = type.icon;
      const selected = value === type.id;

      return (
        <button
          key={type.id}
          type="button"
          onClick={() => onSelect(type)}
          className={`group relative flex min-h-[205px] flex-col items-center rounded-[26px] border bg-white px-3 py-5 text-center transition-all duration-200 active:scale-[0.98] sm:min-h-[230px] sm:px-5 sm:py-6 ${
            selected
              ? type.selectedClass
              : 'border-gray-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl'
          }`}
        >
          {selected && (
            <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
              <Check className="h-4 w-4" />
            </span>
          )}
          <span className={`flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${type.iconClass}`}>
            <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2.2} />
          </span>
          <span className="mt-4 block text-base font-black leading-tight text-gray-950 sm:text-lg">
            {type.name}
          </span>
          <span className="mt-2 block text-xs leading-5 text-gray-500 sm:text-sm">
            {type.description}
          </span>
          <ChevronRight className="mt-auto h-5 w-5 pt-2 text-orange-500 transition group-hover:translate-x-0.5" />
        </button>
      );
    })}
  </div>
);

const CategoryStep = ({ publicationType, selectedEntry, onSelectEntry, subcategoryValue, onSelectSubcategory }) => {
  const sections = getOpportunityWizardSections(publicationType);
  const subcategories = getWizardSubcategories(selectedEntry);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {section.entries.map((entry) => {
              const Icon = entry.icon;
              const selected = selectedEntry?.id === entry.id;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className={`group relative min-h-[150px] rounded-[24px] border p-4 text-center transition-all duration-200 active:scale-[0.98] ${
                    selected
                      ? 'border-orange-500 bg-orange-50 shadow-[0_12px_30px_rgba(249,115,22,0.14)]'
                      : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg'
                  }`}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${entry.iconClass || 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="h-7 w-7" strokeWidth={2.2} />
                  </span>
                  <span className="mt-3 block font-extrabold leading-tight text-gray-950">{entry.name}</span>
                  <span className="mt-1.5 block text-xs leading-5 text-gray-500">{entry.description}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selectedEntry && subcategories.length > 0 && (
        <section className="rounded-[26px] border border-orange-100 bg-orange-50/50 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-black text-gray-950">Scegli una sottocategoria</h3>
            <p className="mt-1 text-sm text-gray-500">Aggiungi un dettaglio per rendere la pubblicazione più precisa.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subcategories.map((subcategory) => {
              const selected = subcategoryValue === subcategory.id;
              return (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => onSelectSubcategory(subcategory.id)}
                  className={`flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition active:scale-[0.99] ${
                    selected
                      ? 'border-orange-500 bg-white shadow-sm'
                      : 'border-orange-100 bg-white/80 hover:border-orange-300'
                  }`}
                >
                  <span className="font-bold text-gray-950">{subcategory.name}</span>
                  {selected ? <Check className="h-5 w-5 text-orange-600" /> : <ChevronRight className="h-5 w-5 text-gray-300" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
        <span className="mt-0.5 text-lg">💡</span>
        <p><strong>Consiglio:</strong> scegli la categoria più precisa per aiutare la community a trovare subito il contenuto giusto.</p>
      </div>
    </div>
  );
};

const PhotosBlock = ({ images, uploadingImages, onOpenPhotoSource, onRemoveImage, cameraInputRef, fileInputRef, onImageUpload, maxImages, maxUploadMb, required }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3">
      <Label>Foto {required ? '*' : ''}</Label>
      <span className="text-xs font-medium text-gray-400">{images.length}/{maxImages}</span>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2">
      {images.map((img, index) => (
        <div key={img} className="relative flex-shrink-0">
          <img src={img} alt={`Foto caricata ${index + 1}`} className="h-28 w-28 rounded-2xl object-cover shadow-sm" />
          <button type="button" onClick={() => onRemoveImage(index)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow" aria-label={`Rimuovi foto ${index + 1}`}><X className="h-4 w-4" /></button>
        </div>
      ))}
      {images.length < maxImages && (
        <button type="button" onClick={onOpenPhotoSource} disabled={uploadingImages} className="flex h-28 w-28 flex-shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50">
          {uploadingImages ? <Loader2 className="mb-2 h-6 w-6 animate-spin" /> : <Camera className="mb-2 h-6 w-6" />}
          <span className="text-xs font-semibold">{uploadingImages ? 'Carico...' : 'Aggiungi foto'}</span>
        </button>
      )}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onImageUpload} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={onImageUpload} className="hidden" />
    </div>
    <p className="mt-2 text-xs leading-5 text-gray-500">Fino a {maxImages} foto JPG, PNG o WEBP. Massimo {maxUploadMb} MB per immagine; la compressione è automatica.</p>
  </div>
);

const DetailsStep = (props) => {
  const isDeal = props.publicationType === 'deal';
  const isSale = props.publicationType === 'sale';
  const isJob = props.publicationType === 'job';

  const titleLabel = isDeal
    ? 'Cosa hai trovato?'
    : isSale
      ? 'Titolo dell’annuncio'
      : isJob
        ? 'Titolo dell’offerta'
        : 'Titolo dell’immobile';

  const titlePlaceholder = isDeal
    ? 'Es. AirPods Pro a metà prezzo'
    : isSale
      ? 'Es. Cuffie Bluetooth Sony WH-1000XM4'
      : isJob
        ? 'Es. Barista per turno mattutino'
        : 'Es. Bilocale luminoso vicino alla metro';

  const descriptionPlaceholder = isDeal
    ? 'Descrivi cosa hai trovato, le condizioni e i dettagli utili per la community...'
    : isSale
      ? 'Descrivi l’articolo, le condizioni e cosa è incluso...'
      : isJob
        ? 'Descrivi mansioni, requisiti, orari e informazioni importanti...'
        : 'Descrivi l’immobile, gli spazi, le caratteristiche e le condizioni...';

  return (
    <div className="space-y-6">
      <PhotosBlock {...props} required={isDeal} />
      <div>
        <Label htmlFor="title">{titleLabel} *</Label>
        <Input id="title" name="title" value={props.formData.title} onChange={props.onChange} placeholder={titlePlaceholder} className="mt-1.5 h-12 rounded-xl" />
      </div>
      <div>
        <Label htmlFor="description">Descrizione *</Label>
        <Textarea id="description" name="description" value={props.formData.description} onChange={props.onChange} placeholder={descriptionPlaceholder} className="mt-1.5 min-h-[150px] rounded-xl" />
      </div>
      <OpportunityCategoryFields
        categoryId={props.formData.category}
        subcategoryId={props.formData.subcategory}
        attributeValues={props.formData.attributes}
        onSubcategoryChange={() => {}}
        onAttributesChange={props.onAttributesChange}
        disabled={props.uploadingImages || props.loading}
        hideSubcategorySelector
      />
    </div>
  );
};

const LocationStep = ({ publicationType, formData, onChange, onAttributesChange, useCurrentLocation, positionConfirmed, authenticityDeclared, setAuthenticityDeclared, hasCounterfeitRisk }) => {
  const isDeal = publicationType === 'deal';
  const isJob = publicationType === 'job';
  const isRealEstate = publicationType === 'real_estate';
  const locationOptional = !isDeal && optionalLocationCategoryIds.includes(formData.category);
  const showPrice = !isDeal && !isJob;
  const showContacts = !isDeal;
  const rentPeriodOptions = isRealEstate
    ? getRealEstateRentPeriodOptions(formData.subcategory)
    : [];
  const rentPeriod = formData.attributes?.rental_period || '';

  return (
    <div className="space-y-7">
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <Label>Posizione {locationOptional ? '(facoltativa)' : '*'}</Label>
        <Input name="address" value={formData.address} onChange={onChange} placeholder="Indirizzo, città o zona" className="mt-2 h-12 rounded-xl" />
        <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl" onClick={useCurrentLocation}>
          <MapPin className="mr-2 h-4 w-4" />{positionConfirmed ? 'Posizione attuale selezionata' : 'Usa la mia posizione'}
        </Button>
        <p className="mt-2 text-xs leading-5 text-gray-500">
          {isDeal
            ? 'Indica dove si trova realmente l’affare per aiutare la community a raggiungerlo.'
            : locationOptional
              ? 'Puoi ometterla. Inserendola, il contenuto potrà comparire anche sulla mappa.'
              : 'Inserisci un indirizzo oppure usa la posizione attuale.'}
        </p>
      </div>

      {showPrice && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="estimated_price">
                {isRealEstate ? 'Canone di affitto' : 'Prezzo richiesto'}
              </Label>
              <Input
                id="estimated_price"
                name="estimated_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_price}
                onChange={onChange}
                placeholder={isRealEstate ? '€ 0' : '€ 0'}
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>

            {isRealEstate ? (
              <div>
                <Label>Periodo del canone</Label>
                <Select
                  value={rentPeriod}
                  onValueChange={(value) =>
                    onAttributesChange({
                      ...formData.attributes,
                      rental_period: value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                    <SelectValue placeholder="Seleziona il periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {rentPeriodOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="estimated_resale_value">
                  Valore stimato{' '}
                  <span className="text-xs font-normal text-gray-400">(facoltativo)</span>
                </Label>
                <Input
                  id="estimated_resale_value"
                  name="estimated_resale_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_resale_value}
                  onChange={onChange}
                  placeholder="€ 0"
                  className="mt-1.5 h-12 rounded-xl"
                />
              </div>
            )}
          </div>

          {isRealEstate && (
            <p className="mt-3 text-xs leading-5 text-gray-500">
              {formData.subcategory === 'casa_vacanze'
                ? 'Per le case vacanza puoi indicare il prezzo a notte, al giorno, a settimana, al mese o all’anno.'
                : 'Per gli affitti tradizionali il periodo più comune è mensile; puoi scegliere anche il canone annuale.'}
            </p>
          )}
        </div>
      )}

      {showContacts && (
        <div className="space-y-3">
          <Label>Informazioni di contatto</Label>
          <div className="relative"><Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_phone" value={formData.contact_phone} onChange={onChange} placeholder="Numero di telefono" className="h-12 rounded-xl pl-10" /></div>
          <div className="relative"><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_email" type="email" value={formData.contact_email} onChange={onChange} placeholder="Indirizzo email" className="h-12 rounded-xl pl-10" /></div>
          <div className="relative"><LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_link" value={formData.contact_link} onChange={onChange} placeholder="Sito web o link annuncio" className="h-12 rounded-xl pl-10" /></div>
        </div>
      )}

      {isDeal && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
          <p><strong>Ricorda:</strong> stai segnalando un affare, non vendendo un prodotto. Il prezzo può comparire nella foto o nella descrizione.</p>
        </div>
      )}

      {hasCounterfeitRisk && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">Possibile rischio di contraffazione</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">DealRadar ha rilevato termini sensibili. Prodotti contraffatti o informazioni ingannevoli non sono consentiti.</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={authenticityDeclared} onChange={(event) => setAuthenticityDeclared(event.target.checked)} className="mt-1 h-4 w-4" /><span className="text-sm font-semibold text-amber-950">Confermo che il prodotto è autentico e le informazioni sono veritiere.</span></label>
        </div>
      )}
    </div>
  );
};

const PreviewStep = ({ publicationType, formData, images, selectedEntry }) => {
  const category = getCategoryById(formData.category);
  const subcategory = getSubcategoryById(formData.category, formData.subcategory);
  const type = getPublicationTypeById(publicationType);
  const showPrice = publicationType !== 'deal' && publicationType !== 'job';
  const rentPeriodLabel = getRealEstateRentPeriodLabel(
    formData.attributes?.rental_period
  );
  const price = formData.estimated_price !== ''
    ? `€ ${Number(formData.estimated_price).toLocaleString('it-IT')}${publicationType === 'real_estate' && rentPeriodLabel ? ` / ${rentPeriodLabel}` : ''}`
    : 'Prezzo non indicato';

  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
      <div className="relative aspect-[16/9] bg-gray-100">
        {images[0] ? <img src={images[0]} alt="Anteprima pubblicazione" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">Nessuna foto aggiunta</div>}
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-900 shadow">{type?.shortName || 'Pubblicazione'}</span>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-semibold text-orange-600">{subcategory?.name || getWizardCategoryLabel(selectedEntry, formData.category) || category?.name}</p>
          <h3 className="mt-1 text-2xl font-black text-gray-950">{formData.title}</h3>
          {showPrice && <p className="mt-2 text-xl font-black text-gray-950">{price}</p>}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{formData.description}</p>
        <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-2">
          <div><span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Posizione</span><span className="mt-1 block font-semibold text-gray-800">{formData.address || (formData.latitude ? 'Posizione attuale' : 'Non indicata')}</span></div>
          <div><span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Contatto</span><span className="mt-1 block font-semibold text-gray-800">{publicationType === 'deal' ? 'Segnalato alla community' : formData.contact_phone || formData.contact_email || 'Tramite DealRadar'}</span></div>
        </div>
      </div>
    </div>
  );
};

const PhotoDialog = ({ open, setOpen, cameraInputRef, fileInputRef }) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="w-[calc(100%_-_32px)] max-w-sm rounded-3xl border-0 p-0 shadow-2xl">
      <DialogHeader className="px-6 pb-3 pt-6 text-left"><DialogTitle className="text-xl font-bold text-gray-900">Aggiungi una foto</DialogTitle><DialogDescription>Scatta una nuova foto oppure scegline una dalla galleria.</DialogDescription></DialogHeader>
      <div className="space-y-3 px-4 pb-5">
        <button type="button" onClick={() => { setOpen(false); cameraInputRef.current && (cameraInputRef.current.value = ''); cameraInputRef.current?.click(); }} className="flex w-full items-center gap-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-left"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white"><Camera className="h-6 w-6" /></span><span><span className="block font-bold">Scatta una foto</span><span className="text-xs text-gray-500">Apri la fotocamera</span></span></button>
        <button type="button" onClick={() => { setOpen(false); fileInputRef.current && (fileInputRef.current.value = ''); fileInputRef.current?.click(); }} className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700"><ImagePlus className="h-6 w-6" /></span><span><span className="block font-bold">Scegli dalla galleria</span><span className="text-xs text-gray-500">Seleziona una o più immagini</span></span></button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 w-full rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Annulla</button>
      </div>
    </DialogContent>
  </Dialog>
);

const OpportunityWizard = ({
  step,
  setStep,
  publicationType,
  onSelectPublicationType,
  selectedEntry,
  onSelectEntry,
  onSelectSubcategory,
  formData,
  setFormData,
  images,
  uploadingImages,
  loading,
  authLoading,
  photoSourceOpen,
  setPhotoSourceOpen,
  cameraInputRef,
  fileInputRef,
  onImageUpload,
  onRemoveImage,
  onChange,
  useCurrentLocation,
  positionConfirmed,
  authenticityDeclared,
  setAuthenticityDeclared,
  hasCounterfeitRisk,
  onSubmit,
  onExit,
  maxImages,
  maxUploadMb,
}) => {
  const subcategories = getWizardSubcategories(selectedEntry);
  const isDeal = publicationType === 'deal';
  const isRealEstate = publicationType === 'real_estate';
  const locationOptional = !isDeal && optionalLocationCategoryIds.includes(formData.category);
  const validRentPeriodIds = new Set(
    getRealEstateRentPeriodOptions(formData.subcategory).map((option) => option.id)
  );
  const hasValidRentPeriod = validRentPeriodIds.has(
    formData.attributes?.rental_period
  );

  const canContinue = (() => {
    if (step === 1) return Boolean(publicationType);
    if (step === 2) return Boolean(selectedEntry) && (subcategories.length === 0 || Boolean(formData.subcategory));
    if (step === 3) return Boolean(formData.title.trim() && formData.description.trim() && (!isDeal || images.length > 0));
    if (step === 4) {
      const hasLocation = Boolean(formData.address.trim() || (positionConfirmed && formData.latitude && formData.longitude));
      const rentPeriodIsValid =
        !isRealEstate ||
        formData.estimated_price === '' ||
        hasValidRentPeriod;

      return (
        (locationOptional || hasLocation) &&
        rentPeriodIsValid &&
        (!hasCounterfeitRisk || authenticityDeclared)
      );
    }
    return true;
  })();

  const next = () => {
    if (!canContinue) return;
    setStep((current) => Math.min(current + 1, STEP_LABELS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    if (step === 1) onExit();
    else {
      setStep((current) => Math.max(current - 1, 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const headings = {
    1: {
      title: 'Cosa vuoi',
      accent: 'pubblicare?',
      description: 'Scegli il tipo di contenuto che vuoi condividere con la community.',
    },
    2: publicationType === 'sale'
      ? { title: 'Cosa vuoi', accent: 'vendere?', description: 'Scegli la categoria che descrive meglio l’articolo.' }
      : publicationType === 'deal'
        ? { title: 'Di cosa si', accent: 'tratta?', description: 'Scegli la categoria che descrive meglio l’affare che hai trovato.' }
        : publicationType === 'job'
          ? { title: 'In quale', accent: 'settore?', description: 'Indica il settore professionale dell’offerta di lavoro.' }
          : { title: 'Che tipo di', accent: 'immobile?', description: 'Scegli la tipologia che descrive meglio l’immobile.' },
    3: publicationType === 'deal'
      ? { title: 'Raccontaci', accent: 'l’affare', description: 'Aggiungi foto chiare e le informazioni essenziali per aiutare la community.' }
      : publicationType === 'sale'
        ? { title: 'Raccontaci il tuo', accent: 'articolo', description: 'Più dettagli fornisci, più sarà facile venderlo.' }
        : publicationType === 'job'
          ? { title: 'Descrivi', accent: 'l’offerta', description: 'Spiega in modo chiaro ruolo, requisiti e condizioni.' }
          : { title: 'Descrivi', accent: 'l’immobile', description: 'Aggiungi le informazioni essenziali e le caratteristiche principali.' },
    4: publicationType === 'deal'
      ? { title: 'Dove hai trovato', accent: 'l’affare?', description: 'Indica la posizione esatta per aiutare la community a trovarlo.' }
      : publicationType === 'sale'
        ? { title: 'Dove si trova', accent: 'l’articolo?', description: 'Indica la posizione per aiutare gli acquirenti a trovarlo.' }
        : publicationType === 'job'
          ? { title: 'Dove si svolge', accent: 'il lavoro?', description: 'Indica la sede o la zona dell’offerta.' }
          : { title: 'Dove si trova', accent: 'l’immobile?', description: 'Indica la posizione dell’immobile.' },
    5: publicationType === 'deal'
      ? { title: 'Anteprima', accent: 'affare', description: 'Controlla i dettagli prima di pubblicare la segnalazione.' }
      : { title: 'Anteprima', accent: 'annuncio', description: 'Controlla i dettagli prima di pubblicare.' },
  };

  const heading = headings[step];

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-28" data-testid="submit-opportunity-page">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100" aria-label="Indietro"><ArrowLeft className="h-5 w-5" /></button>
            <div className="text-center"><p className="text-sm font-black text-gray-950">Nuova pubblicazione</p><p className="text-xs font-medium text-orange-500">DealRadar</p></div>
            <div className="h-10 w-10" />
          </div>
          <WizardProgress step={step} />
        </div>
      </header>

      <form onSubmit={(event) => event.preventDefault()} className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <StepHeader step={step} title={heading.title} accent={heading.accent} description={heading.description} />
          <div className="mt-8">
            {step === 1 && <PublicationTypeStep value={publicationType} onSelect={onSelectPublicationType} />}
            {step === 2 && <CategoryStep publicationType={publicationType} selectedEntry={selectedEntry} onSelectEntry={onSelectEntry} subcategoryValue={formData.subcategory} onSelectSubcategory={onSelectSubcategory} />}
            {step === 3 && <DetailsStep publicationType={publicationType} formData={formData} images={images} uploadingImages={uploadingImages} loading={loading} onChange={onChange} onAttributesChange={(attributes) => setFormData((prev) => ({ ...prev, attributes }))} onOpenPhotoSource={() => setPhotoSourceOpen(true)} onRemoveImage={onRemoveImage} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef} onImageUpload={onImageUpload} maxImages={maxImages} maxUploadMb={maxUploadMb} />}
            {step === 4 && <LocationStep publicationType={publicationType} formData={formData} onChange={onChange} onAttributesChange={(attributes) => setFormData((prev) => ({ ...prev, attributes }))} useCurrentLocation={useCurrentLocation} positionConfirmed={positionConfirmed} authenticityDeclared={authenticityDeclared} setAuthenticityDeclared={setAuthenticityDeclared} hasCounterfeitRisk={hasCounterfeitRisk} />}
            {step === 5 && <PreviewStep publicationType={publicationType} formData={formData} images={images} selectedEntry={selectedEntry} />}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="mx-auto flex max-w-6xl gap-3">
            {step > 1 && <Button type="button" variant="outline" onClick={back} className="h-12 flex-1 rounded-xl">Indietro</Button>}
            {step < STEP_LABELS.length ? (
              <Button type="button" onClick={next} disabled={!canContinue || uploadingImages} className="h-12 flex-[1.4] rounded-xl bg-orange-500 font-bold hover:bg-orange-600">Avanti<ChevronRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button type="button" onClick={(event) => { event.preventDefault(); onSubmit(event); }} disabled={loading || authLoading || uploadingImages} className="h-12 flex-[1.4] rounded-xl bg-orange-500 font-bold hover:bg-orange-600">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pubblicazione...</> : <><Check className="mr-2 h-4 w-4" />{publicationType === 'deal' ? 'Pubblica affare' : 'Pubblica annuncio'}</>}
              </Button>
            )}
          </div>
        </div>
      </form>

      <PhotoDialog open={photoSourceOpen} setOpen={setPhotoSourceOpen} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef} />
    </div>
  );
};

export default OpportunityWizard;