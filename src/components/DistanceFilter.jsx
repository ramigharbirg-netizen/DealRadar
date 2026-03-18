import React from 'react';
import { Navigation } from 'lucide-react';
import { Button } from './ui/button';

const distances = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
];

export const DistanceFilter = ({ selected, onSelect }) => {
  return (
    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg p-1" data-testid="distance-filter">
      <div className="flex items-center gap-1 px-3 text-gray-600">
        <Navigation className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Radius:</span>
      </div>
      {distances.map((dist) => {
        const isSelected = selected === dist.value;
        return (
          <Button
            key={dist.value}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-full h-8 px-3 text-xs font-semibold transition-all ${
              isSelected 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onSelect(dist.value)}
            data-testid={`distance-${dist.value}km`}
          >
            {dist.label}
          </Button>
        );
      })}
    </div>
  );
};

export default DistanceFilter;
