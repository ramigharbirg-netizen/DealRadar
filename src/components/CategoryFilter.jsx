import React from 'react';
import { Store, Package, Wrench, Building2, Gavel, Star, Layers, Gift, Smartphone, Shirt, Armchair, Car, Boxes } from 'lucide-react';
import { Button } from './ui/button';
import { categoryFilterOptions } from '../data/categories';

export const CategoryFilter = ({ selected, onSelect }) => {
  return (
    <div className="filter-chips no-scrollbar" data-testid="category-filter">
      {categoryFilterOptions.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selected === cat.id;
        
        return (
          <Button
            key={cat.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={`flex-shrink-0 rounded-full h-8 px-3 gap-2 transition-all ${
              isSelected 
                ? `${cat.chipColor} text-white border-0 shadow-md` 
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => onSelect(cat.id)}
            data-testid={`category-${cat.id}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{cat.shortName}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;