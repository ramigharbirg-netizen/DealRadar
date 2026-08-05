import {
  Armchair,
  Baby,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Car,
  Dumbbell,
  Flame,
  Gift,
  Gamepad2,
  HeartPulse,
  House,
  MoreHorizontal,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Store,
  Sparkles,
  Tag,
  Package,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';

import { getCategoryById, getSubcategories } from './categories';

export const publicationTypes = [
  {
    id: 'deal',
    name: 'Ho trovato un affare',
    shortName: 'Affare',
    description: 'Segnala occasioni e affari reali trovati nei negozi o sul territorio.',
    icon: Flame,
    iconClass: 'bg-orange-100 text-orange-600',
    selectedClass: 'border-orange-500 bg-orange-50 shadow-[0_16px_40px_rgba(249,115,22,0.16)]',
  },
  {
    id: 'sale',
    name: 'Voglio vendere',
    shortName: 'Vendita',
    description: 'Pubblica un articolo nuovo o usato che vuoi mettere in vendita.',
    icon: Tag,
    iconClass: 'bg-lime-100 text-lime-700',
    selectedClass: 'border-lime-500 bg-lime-50 shadow-[0_16px_40px_rgba(101,163,13,0.14)]',
  },
  {
    id: 'job',
    name: 'Offerta di lavoro',
    shortName: 'Lavoro',
    description: 'Cerca personale o pubblica un’opportunità professionale.',
    icon: BriefcaseBusiness,
    iconClass: 'bg-blue-100 text-blue-600',
    selectedClass: 'border-blue-500 bg-blue-50 shadow-[0_16px_40px_rgba(37,99,235,0.14)]',
  },
  {
    id: 'real_estate',
    name: 'Immobile',
    shortName: 'Immobile',
    description: 'Pubblica affitti o immobili residenziali e commerciali.',
    icon: House,
    iconClass: 'bg-violet-100 text-violet-600',
    selectedClass: 'border-violet-500 bg-violet-50 shadow-[0_16px_40px_rgba(124,58,237,0.14)]',
  },
];

export const getPublicationTypeById = (publicationTypeId) =>
  publicationTypes.find((type) => type.id === publicationTypeId) || null;

const dealEntries = [
  {
    id: 'deal_electronics',
    name: 'Elettronica',
    description: 'Smartphone, computer, TV, audio e accessori',
    icon: Smartphone,
    iconClass: 'bg-orange-100 text-orange-600',
    categoryId: 'electronics',
  },
  {
    id: 'deal_home',
    name: 'Casa e arredo',
    description: 'Mobili, elettrodomestici, decorazioni e giardino',
    icon: Armchair,
    iconClass: 'bg-green-100 text-green-700',
    categoryId: 'home',
  },
  {
    id: 'deal_clothing',
    name: 'Moda e accessori',
    description: 'Abbigliamento, scarpe, borse e accessori',
    icon: Shirt,
    iconClass: 'bg-rose-100 text-rose-600',
    categoryId: 'clothing',
  },
  {
    id: 'deal_food',
    name: 'Alimentari',
    description: 'Supermercati, bevande, freschi e prodotti confezionati',
    icon: ShoppingBasket,
    iconClass: 'bg-amber-100 text-amber-600',
    categoryId: 'store_liquidation',
    preferredSubcategory: 'alimentari',
    locksSubcategory: true,
  },
  {
    id: 'deal_vehicles',
    name: 'Auto e moto',
    description: 'Veicoli, ricambi, pneumatici e accessori',
    icon: Car,
    iconClass: 'bg-blue-100 text-blue-600',
    categoryId: 'vehicles',
  },
  {
    id: 'deal_hobbies',
    name: 'Hobby e sport',
    description: 'Sport, giochi, collezionismo e tempo libero',
    icon: Dumbbell,
    iconClass: 'bg-violet-100 text-violet-600',
    categoryId: 'games_sports_hobbies',
  },
  {
    id: 'deal_beauty',
    name: 'Bellezza e salute',
    description: 'Cosmetica, profumeria e cura della persona',
    icon: HeartPulse,
    iconClass: 'bg-pink-100 text-pink-600',
    categoryId: 'store_liquidation',
    preferredSubcategory: 'cura_persona',
    locksSubcategory: true,
  },
  {
    id: 'deal_liquidation',
    name: 'Liquidazioni e svendite',
    description: 'Chiusure attività, fine serie, saldi straordinari e svendite',
    icon: Store,
    iconClass: 'bg-red-100 text-red-600',
    categoryId: 'store_liquidation',
  },
  {
    id: 'deal_other',
    name: 'Altro',
    description: 'Un affare che non rientra nelle altre categorie',
    icon: MoreHorizontal,
    iconClass: 'bg-gray-100 text-gray-600',
    categoryId: 'other',
  },
];

const saleEntries = [
  {
    id: 'sale_electronics',
    name: 'Elettronica',
    description: 'Smartphone, PC, TV, audio e accessori',
    icon: Smartphone,
    iconClass: 'bg-orange-100 text-orange-600',
    categoryId: 'electronics',
  },
  {
    id: 'sale_home',
    name: 'Casa e arredo',
    description: 'Mobili, decorazioni ed elettrodomestici',
    icon: Armchair,
    iconClass: 'bg-green-100 text-green-700',
    categoryId: 'home',
  },
  {
    id: 'sale_clothing',
    name: 'Moda e accessori',
    description: 'Abbigliamento, scarpe, borse e gioielli',
    icon: Shirt,
    iconClass: 'bg-rose-100 text-rose-600',
    categoryId: 'clothing',
  },
  {
    id: 'sale_sport',
    name: 'Sport e hobby',
    description: 'Sport, attrezzi, fai da te e collezionismo',
    icon: Dumbbell,
    iconClass: 'bg-amber-100 text-amber-600',
    categoryId: 'games_sports_hobbies',
  },
  {
    id: 'sale_vehicles',
    name: 'Auto e moto',
    description: 'Auto, moto, ricambi e accessori',
    icon: Car,
    iconClass: 'bg-blue-100 text-blue-600',
    categoryId: 'vehicles',
  },
  {
    id: 'sale_entertainment',
    name: 'Giochi e console',
    description: 'Videogiochi, console, giochi da tavolo e carte',
    icon: Gamepad2,
    iconClass: 'bg-violet-100 text-violet-600',
    categoryId: 'entertainment',
  },
  {
    id: 'sale_children',
    name: 'Bambini',
    description: 'Passeggini, giocattoli, abbigliamento e accessori',
    icon: Baby,
    iconClass: 'bg-pink-100 text-pink-600',
    categoryId: 'clothing',
    preferredSubcategory: 'bambino',
    locksSubcategory: true,
  },
  {
    id: 'sale_professional_group',
    name: 'Attività e professionale',
    description: 'Attività commerciali, stock, macchinari e attrezzature',
    icon: Building2,
    iconClass: 'bg-slate-100 text-slate-700',
    childrenTitle: 'Che cosa vuoi pubblicare?',
    childrenDescription: 'Scegli la tipologia professionale più adatta.',
    children: [
      {
        id: 'sale_business',
        name: 'Attività in vendita',
        description: 'Negozi, bar, ristoranti, aziende e altre attività',
        icon: Building2,
        iconClass: 'bg-purple-100 text-purple-700',
        categoryId: 'business_sale',
      },
      {
        id: 'sale_stock',
        name: 'Stock di prodotti',
        description: 'Lotti, rimanenze, scorte e quantità di merce',
        icon: Package,
        iconClass: 'bg-amber-100 text-amber-700',
        categoryId: 'product_stock',
      },
      {
        id: 'sale_equipment',
        name: 'Attrezzature e macchinari',
        description: 'Strumenti professionali, macchinari e impianti',
        icon: Wrench,
        iconClass: 'bg-blue-100 text-blue-700',
        categoryId: 'equipment',
      },
    ],
  },
  {
    id: 'sale_free',
    name: 'Regalo / Gratis',
    description: 'Oggetti che vuoi regalare senza chiedere denaro',
    icon: Gift,
    iconClass: 'bg-emerald-100 text-emerald-600',
    categoryId: 'free_deals',
  },
  {
    id: 'sale_other',
    name: 'Altro',
    description: 'Un articolo che non rientra nelle altre categorie',
    icon: MoreHorizontal,
    iconClass: 'bg-gray-100 text-gray-600',
    categoryId: 'other',
  },
];

const createLockedEntries = (categoryId, publicationTypeId, icon, iconClass) =>
  getSubcategories(categoryId).map((subcategory) => ({
    id: `${publicationTypeId}_${subcategory.id}`,
    name: subcategory.name,
    description:
      publicationTypeId === 'job'
        ? 'Seleziona il settore dell’offerta'
        : 'Seleziona la tipologia di immobile',
    icon,
    iconClass,
    categoryId,
    preferredSubcategory: subcategory.id,
    locksSubcategory: true,
  }));

const jobEntries = createLockedEntries(
  'job_offers',
  'job',
  BriefcaseBusiness,
  'bg-blue-100 text-blue-600'
)
  .map((entry) => {
    if (entry.preferredSubcategory !== 'ristorazione') return entry;

    return {
      ...entry,
      name: 'Ristorazione, bar e cucina',
      description: 'Baristi, camerieri, lavapiatti, aiuto cuoco, cuochi e chef',
      icon: UtensilsCrossed,
      iconClass: 'bg-orange-100 text-orange-600',
    };
  })
  .sort((first, second) => {
    if (first.preferredSubcategory === 'ristorazione') return -1;
    if (second.preferredSubcategory === 'ristorazione') return 1;
    return 0;
  });

export const REAL_ESTATE_RENT_PERIOD_OPTIONS = [
  { id: 'nightly', label: 'A notte', shortLabel: 'notte' },
  { id: 'daily', label: 'Al giorno', shortLabel: 'giorno' },
  { id: 'weekly', label: 'A settimana', shortLabel: 'settimana' },
  { id: 'monthly', label: 'Al mese', shortLabel: 'mese' },
  { id: 'yearly', label: 'All’anno', shortLabel: 'anno' },
];

export const getRealEstateRentPeriodOptions = (subcategoryId) => {
  if (subcategoryId === 'casa_vacanze') {
    return REAL_ESTATE_RENT_PERIOD_OPTIONS;
  }

  return REAL_ESTATE_RENT_PERIOD_OPTIONS.filter((option) =>
    ['monthly', 'yearly'].includes(option.id)
  );
};

export const getRealEstateRentPeriodLabel = (periodId) =>
  REAL_ESTATE_RENT_PERIOD_OPTIONS.find((option) => option.id === periodId)?.shortLabel || '';

const realEstateEntries = createLockedEntries(
  'rental_homes',
  'real_estate',
  House,
  'bg-violet-100 text-violet-600'
);

export const opportunityWizardEntriesByType = {
  deal: dealEntries,
  sale: saleEntries,
  job: jobEntries,
  real_estate: realEstateEntries,
};

const flattenWizardEntries = (entries = []) =>
  entries.flatMap((entry) =>
    Array.isArray(entry.children) && entry.children.length > 0
      ? entry.children
      : [entry]
  );

export const getWizardEntryChildren = (entry) =>
  Array.isArray(entry?.children) ? entry.children : [];

export const isWizardEntryGroup = (entry) =>
  getWizardEntryChildren(entry).length > 0;

export const getWizardParentEntryForChild = (
  publicationTypeId,
  childEntryId
) => {
  const entries = opportunityWizardEntriesByType[publicationTypeId] || [];

  return (
    entries.find((entry) =>
      getWizardEntryChildren(entry).some(
        (child) => child.id === childEntryId
      )
    ) || null
  );
};

export const getOpportunityWizardSections = (publicationTypeId) => {
  const entries = opportunityWizardEntriesByType[publicationTypeId] || [];

  return [
    {
      id: `${publicationTypeId || 'empty'}_categories`,
      title:
        publicationTypeId === 'job'
          ? 'Settore lavorativo'
          : publicationTypeId === 'real_estate'
            ? 'Tipologia di immobile'
            : 'Scegli una categoria',
      description:
        publicationTypeId === 'deal'
          ? 'Indica cosa descrive meglio l’affare che hai trovato.'
          : publicationTypeId === 'sale'
            ? 'Scegli la categoria più precisa per raggiungere le persone giuste.'
            : publicationTypeId === 'job'
              ? 'Indica il settore professionale dell’offerta.'
              : 'Indica la tipologia dell’immobile.',
      entries,
    },
  ];
};

export const getWizardEntryById = (entryId, publicationTypeId = '') => {
  const topLevelEntries = publicationTypeId
    ? opportunityWizardEntriesByType[publicationTypeId] || []
    : Object.values(opportunityWizardEntriesByType).flat();

  const directMatch = topLevelEntries.find(
    (entry) => entry.id === entryId
  );

  if (directMatch) return directMatch;

  return (
    flattenWizardEntries(topLevelEntries).find(
      (entry) => entry.id === entryId
    ) || null
  );
};

const inferPublicationType = (categoryId) => {
  if (categoryId === 'job_offers') return 'job';
  if (categoryId === 'rental_homes') return 'real_estate';
  return 'sale';
};

export const getWizardEntryForValue = (
  publicationTypeId,
  categoryId,
  attributes = {},
  subcategoryId = ''
) => {
  if (!categoryId) return null;

  const resolvedType = publicationTypeId || inferPublicationType(categoryId);
  const entries = flattenWizardEntries(
    opportunityWizardEntriesByType[resolvedType] || []
  );

  const exactPreferredMatch = entries.find(
    (entry) =>
      entry.categoryId === categoryId &&
      entry.preferredSubcategory &&
      entry.preferredSubcategory === subcategoryId
  );

  if (exactPreferredMatch) return exactPreferredMatch;

  return (
    entries.find(
      (entry) =>
        entry.categoryId === categoryId &&
        !entry.preferredSubcategory
    ) ||
    entries.find((entry) => entry.categoryId === categoryId) ||
    null
  );
};

export const getWizardSubcategories = (entry) => {
  if (!entry || entry.locksSubcategory) return [];
  return getSubcategories(entry.categoryId);
};

export const getWizardCategoryLabel = (entry, fallbackCategoryId) =>
  entry?.name || getCategoryById(fallbackCategoryId)?.name || 'Categoria';

export const applyWizardEntry = (entry, previousFormData) => {
  if (!entry) return previousFormData;

  return {
    ...previousFormData,
    category: entry.categoryId,
    subcategory: entry.preferredSubcategory || '',
    attributes: {},
  };
};

export const applyWizardSubcategory = (entry, subcategoryId, previousFormData) => ({
  ...previousFormData,
  subcategory: subcategoryId,
  attributes: {},
});

export const wizardAccentIcon = Sparkles;
export const saleAccentIcon = ShoppingCart;
export const fallbackCategoryIcon = Boxes;
