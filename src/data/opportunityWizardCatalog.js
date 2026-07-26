import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Clapperboard,
  Cpu,
  Gift,
  Hammer,
  Home,
  House,
  Package,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react';

import { getCategoryById, getSubcategories } from './categories';

const standard = [
  { id: 'wizard_woman', name: 'Donna', description: 'Moda, scarpe, borse e accessori', icon: UserRound, categoryId: 'clothing', audience: 'donna', preferredSubcategory: 'donna' },
  { id: 'wizard_man', name: 'Uomo', description: 'Moda, scarpe, borse e accessori', icon: UsersRound, categoryId: 'clothing', audience: 'uomo', preferredSubcategory: 'uomo' },
  { id: 'wizard_children', name: 'Bambini', description: 'Abbigliamento, giochi e accessori', icon: Baby, categoryId: 'clothing', audience: 'bambini', preferredSubcategory: 'bambino' },
  { id: 'wizard_home', name: 'Casa', description: 'Arredo, elettrodomestici e giardino', icon: Home, categoryId: 'home' },
  { id: 'wizard_electronics', name: 'Elettronica', description: 'Smartphone, computer e accessori', icon: Cpu, categoryId: 'electronics' },
  { id: 'wizard_entertainment', name: 'Intrattenimento', description: 'Film, musica, libri e videogiochi', icon: Clapperboard, categoryId: 'entertainment' },
  { id: 'wizard_hobbies', name: 'Hobby, sport e collezionismo', description: 'Sport, modellismo, carte e collezioni', icon: Trophy, categoryId: 'games_sports_hobbies' },
  { id: 'wizard_school', name: 'Scuola e ufficio', description: 'Libri, cancelleria e attrezzature', icon: BookOpen, categoryId: 'school_office' },
  { id: 'wizard_vehicles', name: 'Auto e moto', description: 'Veicoli, ricambi e accessori', icon: Car, categoryId: 'vehicles' },
];

const special = [
  { id: 'wizard_liquidation', name: 'Liquidazioni', description: 'Chiusure, svendite e fine attività', icon: Store, categoryId: 'store_liquidation' },
  { id: 'wizard_business', name: 'Attività in vendita', description: 'Negozi, locali e imprese', icon: BriefcaseBusiness, categoryId: 'business_sale' },
  { id: 'wizard_rent', name: 'Case in affitto', description: 'Affitti residenziali e commerciali', icon: House, categoryId: 'rental_homes' },
  { id: 'wizard_stock', name: 'Stock di prodotti', description: 'Lotti, rimanenze e quantità', icon: Package, categoryId: 'product_stock' },
  { id: 'wizard_equipment', name: 'Attrezzature e macchinari', description: 'Strumenti professionali e industriali', icon: Wrench, categoryId: 'equipment' },
  { id: 'wizard_auctions', name: 'Aste e fallimenti', description: 'Aste immobiliari, mobiliari e aziendali', icon: Hammer, categoryId: 'auctions' },
  { id: 'wizard_jobs', name: 'Offerte di lavoro', description: 'Posizioni aperte e opportunità professionali', icon: ShoppingBag, categoryId: 'job_offers' },
  { id: 'wizard_free', name: 'Occasioni gratuite', description: 'Oggetti e opportunità a costo zero', icon: Gift, categoryId: 'free_deals' },
];

export const opportunityWizardSections = [
  { id: 'standard', title: 'Compra e risparmia', description: 'Scegli il tipo di opportunità che vuoi condividere.', entries: standard },
  { id: 'special', title: 'Opportunità speciali', description: 'Occasioni professionali, immobiliari e fuori dal comune.', entries: special },
];

export const opportunityWizardEntries = [...standard, ...special];

export const getWizardEntryById = (entryId) =>
  opportunityWizardEntries.find((entry) => entry.id === entryId) || null;

export const getWizardEntryForValue = (categoryId, attributes = {}, subcategoryId = '') => {
  if (categoryId === 'clothing') {
    const audience = attributes?.audience || (['donna', 'uomo', 'bambino'].includes(subcategoryId) ? subcategoryId : '');
    const normalized = audience === 'bambino' ? 'bambini' : audience;
    return opportunityWizardEntries.find((entry) => entry.categoryId === 'clothing' && entry.audience === normalized) || null;
  }
  return opportunityWizardEntries.find((entry) => entry.categoryId === categoryId) || null;
};

export const getWizardSubcategories = (entry) => {
  if (!entry) return [];
  const all = getSubcategories(entry.categoryId);
  if (entry.categoryId !== 'clothing') return all;

  const legacyId = entry.preferredSubcategory;
  return all
    .filter((subcategory) => [legacyId, 'scarpe', 'borse', 'accessori', 'altro'].includes(subcategory.id))
    .map((subcategory) => ({
      ...subcategory,
      name: subcategory.id === legacyId ? 'Abbigliamento' : subcategory.name,
    }));
};

export const getWizardCategoryLabel = (entry, fallbackCategoryId) =>
  entry?.name || getCategoryById(fallbackCategoryId)?.name || 'Categoria';

export const applyWizardEntry = (entry, previousFormData) => {
  if (!entry) return previousFormData;
  return {
    ...previousFormData,
    category: entry.categoryId,
    subcategory: '',
    attributes: entry.audience ? { audience: entry.audience } : {},
  };
};

export const applyWizardSubcategory = (entry, subcategoryId, previousFormData) => ({
  ...previousFormData,
  subcategory: subcategoryId,
  attributes: entry?.audience ? { audience: entry.audience } : {},
});

export const wizardAccentIcon = Sparkles;
