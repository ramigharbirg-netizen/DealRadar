import React from 'react';
import { Button } from './ui/button';
import { categoryFilterOptions } from '../data/categories';
import { contentTypeFilterOptions } from '../data/contentTypeCatalog';

export const CategoryFilter = ({
  selectedContentType = 'all',
  onContentTypeSelect,
  selectedCategory = 'all',
  onCategorySelect,
}) => {
  return (
    <div className="space-y-2" data-testid="category-filter">
      <div className="filter-chips no-scrollbar">
        {contentTypeFilterOptions.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedContentType === type.id;

          return (
            <Button
              key={type.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={`h-8 flex-shrink-0 rounded-full px-3 transition-all ${
                isSelected
                  ? `${type.chipColor} border-0 text-white shadow-md`
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => onContentTypeSelect?.(type.id)}
              data-testid={`content-type-${type.id}`}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{type.pluralLabel}</span>
            </Button>
          );
        })}
      </div>

      <div className="filter-chips no-scrollbar">
        {categoryFilterOptions.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;

          return (
            <Button
              key={category.id}
              variant="outline"
              size="sm"
              className={`h-8 flex-shrink-0 rounded-full px-3 transition-all ${
                isSelected
                  ? 'border-gray-700 bg-gray-700 text-white shadow-sm hover:bg-gray-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => onCategorySelect?.(category.id)}
              data-testid={`category-${category.id}`}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{category.shortName}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;