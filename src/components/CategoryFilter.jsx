import React from 'react';
import { Store, Package, Wrench, Building2, Gavel, Star, Layers } from 'lucide-react';
import { Button } from './ui/button';

// Categorie tradotte in italiano
const categories = [
  { id: 'all', name: 'Tutte', icon: Layers, color: 'bg-gray-500' },
  { id: 'store_liquidation', name: 'Liquidazioni', icon: Store, color: 'bg-green-500' },
  { id: 'product_stock', name: 'Stock', icon: Package, color: 'bg-amber-500' },
  { id: 'equipment', name: 'Attrezzatura', icon: Wrench, color: 'bg-blue-500' },
  { id: 'business_sale', name: 'Attività', icon: Building2, color: 'bg-purple-500' },
  { id: 'auctions', name: 'Aste', icon: Gavel, color: 'bg-red-500' },
  { id: 'user_reported', name: 'Segnalazioni', icon: Star, color: 'bg-orange-500' },
];

export const CategoryFilter = ({ selected, onSelect }) => {
  return (
    <div className="filter-chips no-scrollbar" data-testid="category-filter">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selected === cat.id;
        
        return (
          <Button
            key={cat.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={`flex-shrink-0 rounded-full h-9 px-4 gap-2 transition-all ${
              isSelected 
                ? `${cat.color} text-white border-0 shadow-md` 
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => onSelect(cat.id)}
            data-testid={`category-${cat.id}`}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{cat.name}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;