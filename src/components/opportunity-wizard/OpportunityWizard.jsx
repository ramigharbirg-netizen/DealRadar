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

import OpportunityCategoryFields from '../OpportunityCategoryFields';
import { getCategoryById, getSubcategoryById, optionalLocationCategoryIds } from '../../data/categories';
import {
  getWizardCategoryLabel,
  getWizardSubcategories,
  opportunityWizardSections,
} from '../../data/opportunityWizardCatalog';

const STEP_LABELS = ['Categoria', 'Sottocategoria', 'Dettagli', 'Posizione', 'Anteprima'];

const StepHeader = ({ step, title, description }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
      <span>Passo {step} di {STEP_LABELS.length}</span>
      <span className="text-gray-400">{STEP_LABELS[step - 1]}</span>
    </div>
    <div>
      <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">{description}</p>}
    </div>
  </div>
);

const WizardProgress = ({ step }) => (
  <div className="grid grid-cols-5 gap-2" aria-label={`Passo ${step} di ${STEP_LABELS.length}`}>
    {STEP_LABELS.map((label, index) => {
      const number = index + 1;
      const active = number <= step;
      return (
        <div key={label} className="space-y-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${active ? 'bg-orange-500' : 'bg-gray-200'}`} />
          <span className={`hidden text-[11px] font-medium sm:block ${number === step ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
        </div>
      );
    })}
  </div>
);

const CategoryStep = ({ selectedEntry, onSelect }) => (
  <div className="space-y-8">
    {opportunityWizardSections.map((section) => (
      <section key={section.id}>
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-gray-950">{section.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{section.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {section.entries.map((entry) => {
            const Icon = entry.icon;
            const selected = selectedEntry?.id === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry)}
                className={`group relative min-h-[150px] rounded-3xl border p-4 text-left transition-all duration-200 active:scale-[0.98] ${selected ? 'border-orange-500 bg-orange-50 shadow-[0_12px_30px_rgba(249,115,22,0.14)]' : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg'}`}
              >
                {selected && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white"><Check className="h-4 w-4" /></span>}
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-orange-100 group-hover:text-orange-600'}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-4 block font-extrabold leading-tight text-gray-950">{entry.name}</span>
                <span className="mt-1.5 block text-xs leading-5 text-gray-500">{entry.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    ))}
  </div>
);

const SubcategoryStep = ({ entry, value, onSelect }) => {
  const subcategories = getWizardSubcategories(entry);
  if (subcategories.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white"><Check className="h-5 w-5" /></span>
          <div><p className="font-bold text-green-950">Categoria pronta</p><p className="mt-1 text-sm text-green-800">Per questa categoria non serve scegliere una sottocategoria.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subcategories.map((subcategory) => {
        const selected = value === subcategory.id;
        return (
          <button
            key={subcategory.id}
            type="button"
            onClick={() => onSelect(subcategory.id)}
            className={`flex min-h-[82px] items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition active:scale-[0.99] ${selected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'}`}
          >
            <span>
              <span className="block font-bold text-gray-950">{subcategory.name}</span>
              <span className="mt-1 block text-xs text-gray-500">Seleziona per continuare</span>
            </span>
            {selected ? <Check className="h-5 w-5 text-orange-600" /> : <ChevronRight className="h-5 w-5 text-gray-300" />}
          </button>
        );
      })}
    </div>
  );
};

const PhotosBlock = ({ images, uploadingImages, onOpenPhotoSource, onRemoveImage, cameraInputRef, fileInputRef, onImageUpload, maxImages, maxUploadMb }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3">
      <Label>Foto</Label>
      <span className="text-xs font-medium text-gray-400">{images.length}/{maxImages}</span>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2">
      {images.map((img, index) => (
        <div key={img} className="relative flex-shrink-0">
          <img src={img} alt={`Foto caricata ${index + 1}`} className="h-28 w-28 rounded-2xl object-cover shadow-sm" />
          <button type="button" onClick={() => onRemoveImage(index)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow"><X className="h-4 w-4" /></button>
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

const DetailsStep = (props) => (
  <div className="space-y-6">
    <PhotosBlock {...props} />
    <div>
      <Label htmlFor="title">Titolo *</Label>
      <Input id="title" name="title" value={props.formData.title} onChange={props.onChange} placeholder="Descrivi l’occasione in poche parole" className="mt-1.5 h-12 rounded-xl" />
    </div>
    <div>
      <Label htmlFor="description">Descrizione *</Label>
      <Textarea id="description" name="description" value={props.formData.description} onChange={props.onChange} placeholder="Spiega cosa rende interessante questa opportunità..." className="mt-1.5 min-h-[150px] rounded-xl" />
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

const LocationStep = ({ formData, onChange, useCurrentLocation, positionConfirmed, authenticityDeclared, setAuthenticityDeclared, hasCounterfeitRisk }) => {
  const locationOptional = optionalLocationCategoryIds.includes(formData.category);
  return (
    <div className="space-y-7">
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <Label>Posizione {locationOptional ? '(facoltativa)' : '*'}</Label>
        <Input name="address" value={formData.address} onChange={onChange} placeholder="Indirizzo, città o zona" className="mt-2 h-12 rounded-xl" />
        <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl" onClick={useCurrentLocation}>
          <MapPin className="mr-2 h-4 w-4" />{positionConfirmed ? 'Posizione attuale selezionata' : 'Usa posizione attuale'}
        </Button>
        <p className="mt-2 text-xs leading-5 text-gray-500">{locationOptional ? 'Puoi ometterla. Inserendola, l’opportunità potrà comparire anche sulla mappa.' : 'Inserisci un indirizzo oppure usa la posizione attuale.'}</p>
      </div>

      {formData.category !== 'job_offers' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="estimated_price">Prezzo richiesto</Label>
            <Input
              id="estimated_price"
              name="estimated_price"
              type="number"
              min="0"
              value={formData.estimated_price}
              onChange={onChange}
              placeholder="€ 0"
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="estimated_resale_value">
              Valore stimato{' '}
              <span className="text-xs font-normal text-gray-400">
                (facoltativo)
              </span>
            </Label>
            <Input
              id="estimated_resale_value"
              name="estimated_resale_value"
              type="number"
              min="0"
              value={formData.estimated_resale_value}
              onChange={onChange}
              placeholder="€ 0"
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label>Informazioni di contatto</Label>
        <div className="relative"><Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_phone" value={formData.contact_phone} onChange={onChange} placeholder="Numero di telefono" className="h-12 rounded-xl pl-10" /></div>
        <div className="relative"><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_email" type="email" value={formData.contact_email} onChange={onChange} placeholder="Indirizzo email" className="h-12 rounded-xl pl-10" /></div>
        <div className="relative"><LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input name="contact_link" value={formData.contact_link} onChange={onChange} placeholder="Sito web o link annuncio" className="h-12 rounded-xl pl-10" /></div>
      </div>

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

const PreviewStep = ({ formData, images, selectedEntry }) => {
  const category = getCategoryById(formData.category);
  const subcategory = getSubcategoryById(
    formData.category,
    formData.subcategory
  );
  const showPrice = formData.category !== 'job_offers';

  const price =
    formData.estimated_price !== ''
      ? `€ ${Number(formData.estimated_price).toLocaleString('it-IT')}`
      : 'Prezzo non indicato';
  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
      <div className="relative aspect-[16/9] bg-gray-100">
        {images[0] ? <img src={images[0]} alt="Anteprima opportunità" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-400">Nessuna foto aggiunta</div>}
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-900 shadow">{getWizardCategoryLabel(selectedEntry, formData.category)}</span>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-semibold text-orange-600">{subcategory?.name || category?.name}</p>
          <h3 className="mt-1 text-2xl font-black text-gray-950">{formData.title}</h3>
          {showPrice && (
            <p className="mt-2 text-xl font-black text-gray-950">{price}</p>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{formData.description}</p>
        <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-2">
          <div><span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Posizione</span><span className="mt-1 block font-semibold text-gray-800">{formData.address || (formData.latitude ? 'Posizione attuale' : 'Non indicata')}</span></div>
          <div><span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Contatto</span><span className="mt-1 block font-semibold text-gray-800">{formData.contact_phone || formData.contact_email || 'Tramite DealRadar'}</span></div>
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
  const locationOptional = optionalLocationCategoryIds.includes(formData.category);

  const canContinue = (() => {
    if (step === 1) return Boolean(selectedEntry);
    if (step === 2) return subcategories.length === 0 || Boolean(formData.subcategory);
    if (step === 3) return Boolean(formData.title.trim() && formData.description.trim());
    if (step === 4) {
      const hasLocation = Boolean(formData.address.trim() || (positionConfirmed && formData.latitude && formData.longitude));
      return (locationOptional || hasLocation) && (!hasCounterfeitRisk || authenticityDeclared);
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

  const headings = [
    ['Cosa hai trovato?', 'Scegli la categoria più adatta. Le opportunità speciali sono raccolte separatamente per rendere tutto più chiaro.'],
    [getWizardCategoryLabel(selectedEntry, formData.category), 'Scegli una sottocategoria per aiutare la community a trovare subito questa opportunità.'],
    ['Racconta l’opportunità', 'Aggiungi foto chiare e le informazioni essenziali. Niente campi inutili: titolo e descrizione devono spiegare bene il valore dell’occasione.'],
    ['Dove si trova?', 'Aggiungi posizione, prezzo ed eventuali contatti. Puoi lasciare vuoti i dati non necessari.'],
    ['Controlla prima di pubblicare', 'Questa è l’anteprima finale. Torna indietro per correggere qualsiasi dettaglio senza perdere ciò che hai già inserito.'],
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-28" data-testid="submit-opportunity-page">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100" aria-label="Indietro"><ArrowLeft className="h-5 w-5" /></button>
            <div className="text-center"><p className="text-sm font-black text-gray-950">Nuova opportunità</p><p className="text-xs text-gray-400">DealRadar</p></div>
            <div className="h-10 w-10" />
          </div>
          <WizardProgress step={step} />
        </div>
      </header>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10"
      >
        <div className="rounded-[30px] border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <StepHeader step={step} title={headings[step - 1][0]} description={headings[step - 1][1]} />
          <div className="mt-8">
            {step === 1 && <CategoryStep selectedEntry={selectedEntry} onSelect={onSelectEntry} />}
            {step === 2 && <SubcategoryStep entry={selectedEntry} value={formData.subcategory} onSelect={onSelectSubcategory} />}
            {step === 3 && <DetailsStep formData={formData} images={images} uploadingImages={uploadingImages} loading={loading} onChange={onChange} onAttributesChange={(attributes) => setFormData((prev) => ({ ...prev, attributes }))} onOpenPhotoSource={() => setPhotoSourceOpen(true)} onRemoveImage={onRemoveImage} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef} onImageUpload={onImageUpload} maxImages={maxImages} maxUploadMb={maxUploadMb} />}
            {step === 4 && <LocationStep formData={formData} onChange={onChange} useCurrentLocation={useCurrentLocation} positionConfirmed={positionConfirmed} authenticityDeclared={authenticityDeclared} setAuthenticityDeclared={setAuthenticityDeclared} hasCounterfeitRisk={hasCounterfeitRisk} />}
            {step === 5 && <PreviewStep formData={formData} images={images} selectedEntry={selectedEntry} />}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="mx-auto flex max-w-5xl gap-3">
            {step > 1 && <Button type="button" variant="outline" onClick={back} className="h-12 flex-1 rounded-xl">Indietro</Button>}
            {step < STEP_LABELS.length ? (
              <Button type="button" onClick={next} disabled={!canContinue || uploadingImages} className="h-12 flex-[1.4] rounded-xl bg-orange-500 font-bold hover:bg-orange-600">Continua<ChevronRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  onSubmit(event);
                }}
                disabled={loading || authLoading || uploadingImages}
                className="h-12 flex-[1.4] rounded-xl bg-orange-500 font-bold hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pubblicazione...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Pubblica opportunità
                  </>
                )}
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