import {
  Flame,
  Tag,
  Briefcase,
  House,
  Layers3,
} from 'lucide-react';

export const contentTypeCatalog = {
  all: {
    id: 'all',
    label: 'Tutto',
    pluralLabel: 'Tutti',
    icon: Layers3,
    color: '#4B5563',
    chipColor: 'bg-gray-700',
    softChipColor: 'bg-gray-100',
    softTextColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
  deal: {
    id: 'deal',
    label: 'Affare',
    pluralLabel: 'Affari',
    icon: Flame,
    color: '#F59E0B',
    chipColor: 'bg-amber-500',
    softChipColor: 'bg-amber-50',
    softTextColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  sale: {
    id: 'sale',
    label: 'Vendita',
    pluralLabel: 'Vendite',
    icon: Tag,
    color: '#2563EB',
    chipColor: 'bg-blue-600',
    softChipColor: 'bg-blue-50',
    softTextColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  job: {
    id: 'job',
    label: 'Lavoro',
    pluralLabel: 'Lavoro',
    icon: Briefcase,
    color: '#DC2626',
    chipColor: 'bg-red-600',
    softChipColor: 'bg-red-50',
    softTextColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  real_estate: {
    id: 'real_estate',
    label: 'Immobile',
    pluralLabel: 'Immobili',
    icon: House,
    color: '#16A34A',
    chipColor: 'bg-green-600',
    softChipColor: 'bg-green-50',
    softTextColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
};

export const contentTypeFilterOptions = [
  contentTypeCatalog.all,
  contentTypeCatalog.deal,
  contentTypeCatalog.sale,
  contentTypeCatalog.job,
  contentTypeCatalog.real_estate,
];

export const inferOpportunityContentType = (opportunity) => {
  const explicitType = opportunity?.content_type;

  if (
    explicitType === 'deal' ||
    explicitType === 'sale' ||
    explicitType === 'job' ||
    explicitType === 'real_estate'
  ) {
    return explicitType;
  }

  // Fallback prudente per i contenuti legacy.
  if (opportunity?.category === 'job_offers') return 'job';
  if (opportunity?.category === 'rental_homes') return 'real_estate';
  if (opportunity?.category === 'user_reported') return 'deal';

  return 'sale';
};

export const getContentTypeConfig = (opportunityOrType) => {
  const type =
    typeof opportunityOrType === 'string'
      ? opportunityOrType
      : inferOpportunityContentType(opportunityOrType);

  return contentTypeCatalog[type] || contentTypeCatalog.sale;
};

export const opportunityMatchesContentType = (opportunity, selectedType) => {
  return (
    !selectedType ||
    selectedType === 'all' ||
    inferOpportunityContentType(opportunity) === selectedType
  );
};