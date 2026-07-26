import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import {
  getSubcategories,
  getSubcategoryAttributes,
} from '../data/categories';

const EMPTY_ATTRIBUTES = {};

const OpportunityCategoryFields = ({
  categoryId,
  subcategoryId,
  attributeValues = EMPTY_ATTRIBUTES,
  onSubcategoryChange,
  onAttributesChange,
  disabled = false,
  hideSubcategorySelector = false,
}) => {
  const [attributesOpen, setAttributesOpen] = useState(false);

  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return getSubcategories(categoryId);
  }, [categoryId]);

  const attributes = useMemo(() => {
    if (!categoryId || !subcategoryId) return [];

    return getSubcategoryAttributes(categoryId, subcategoryId).filter(
      (attribute) => !attribute.hiddenInForm
    );
  }, [categoryId, subcategoryId]);

  const selectedSubcategoryExists = useMemo(() => {
    if (!subcategoryId) return false;

    return subcategories.some(
      (subcategory) => subcategory.id === subcategoryId
    );
  }, [subcategories, subcategoryId]);

  const selectedAttributesCount = useMemo(() => {
    return Object.values(attributeValues).reduce((count, value) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? count + 1 : count;
      }

      if (value !== null && value !== undefined && value !== '') {
        return count + 1;
      }

      return count;
    }, 0);
  }, [attributeValues]);

  const handleSubcategoryChange = (value) => {
    setAttributesOpen(false);

    onSubcategoryChange?.(value);
    onAttributesChange?.({});
  };

  const handleSingleSelectChange = (attributeId, value) => {
    onAttributesChange?.({
      ...attributeValues,
      [attributeId]: value,
    });
  };

  const handleMultiSelectChange = (attributeId, optionId) => {
    const currentValues = Array.isArray(attributeValues[attributeId])
      ? attributeValues[attributeId]
      : [];

    const alreadySelected = currentValues.includes(optionId);

    const nextValues = alreadySelected
      ? currentValues.filter((value) => value !== optionId)
      : [...currentValues, optionId];

    const nextAttributes = {
      ...attributeValues,
    };

    if (nextValues.length > 0) {
      nextAttributes[attributeId] = nextValues;
    } else {
      delete nextAttributes[attributeId];
    }

    onAttributesChange?.(nextAttributes);
  };

  const clearAttribute = (attributeId) => {
    const nextAttributes = {
      ...attributeValues,
    };

    delete nextAttributes[attributeId];

    onAttributesChange?.(nextAttributes);
  };

  if (!categoryId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!hideSubcategorySelector && subcategories.length > 0 && (
        <div>
          <Label htmlFor="subcategory">Sottocategoria *</Label>

          <Select
            value={selectedSubcategoryExists ? subcategoryId : ''}
            onValueChange={handleSubcategoryChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="subcategory"
              className="mt-1.5 h-12 rounded-xl"
              data-testid="subcategory-select"
            >
              <SelectValue placeholder="Seleziona sottocategoria" />
            </SelectTrigger>

            <SelectContent>
              {subcategories.map((subcategory) => (
                <SelectItem
                  key={subcategory.id}
                  value={subcategory.id}
                >
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {subcategoryId && attributes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/40">
          <button
            type="button"
            onClick={() => setAttributesOpen((current) => !current)}
            disabled={disabled}
            aria-expanded={attributesOpen}
            aria-controls="opportunity-attributes-content"
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="attributes-toggle"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block font-bold text-gray-900">
                  Arricchisci il tuo annuncio
                </span>

                <span className="mt-0.5 block text-xs text-gray-500">
                  Facoltativo
                  {selectedAttributesCount > 0
                    ? ` · ${selectedAttributesCount} ${
                        selectedAttributesCount === 1
                          ? 'campo compilato'
                          : 'campi compilati'
                      }`
                    : ''}
                </span>
              </span>
            </span>

            {attributesOpen ? (
              <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500" />
            )}
          </button>

          {attributesOpen && (
            <div
              id="opportunity-attributes-content"
              className="space-y-5 border-t border-orange-100 bg-white px-4 py-5"
            >
              {attributes.map((attribute) => {
                const selectedValue = attributeValues[attribute.id];

                if (attribute.type === 'single_select') {
                  return (
                    <div key={attribute.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <Label htmlFor={`attribute-${attribute.id}`}>
                          {attribute.label}
                        </Label>

                        {selectedValue && (
                          <button
                            type="button"
                            onClick={() => clearAttribute(attribute.id)}
                            disabled={disabled}
                            className="text-xs font-semibold text-gray-500 transition hover:text-orange-600 disabled:opacity-50"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>

                      <Select
                        value={
                          typeof selectedValue === 'string'
                            ? selectedValue
                            : ''
                        }
                        onValueChange={(value) =>
                          handleSingleSelectChange(attribute.id, value)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id={`attribute-${attribute.id}`}
                          className="h-12 rounded-xl"
                          data-testid={`attribute-${attribute.id}-select`}
                        >
                          <SelectValue
                            placeholder={`Seleziona ${attribute.label.toLowerCase()}`}
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {attribute.options.map((option) => (
                            <SelectItem
                              key={option.id}
                              value={option.id}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (attribute.type === 'multi_select') {
                  const selectedValues = Array.isArray(selectedValue)
                    ? selectedValue
                    : [];

                  return (
                    <div key={attribute.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Label>{attribute.label}</Label>

                        {selectedValues.length > 0 && (
                          <button
                            type="button"
                            onClick={() => clearAttribute(attribute.id)}
                            disabled={disabled}
                            className="text-xs font-semibold text-gray-500 transition hover:text-orange-600 disabled:opacity-50"
                          >
                            Rimuovi
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {attribute.options.map((option) => {
                          const isSelected = selectedValues.includes(
                            option.id
                          );

                          return (
                            <Button
                              key={option.id}
                              type="button"
                              variant="outline"
                              disabled={disabled}
                              aria-pressed={isSelected}
                              onClick={() =>
                                handleMultiSelectChange(
                                  attribute.id,
                                  option.id
                                )
                              }
                              className={
                                isSelected
                                  ? 'h-auto min-h-10 rounded-xl border-orange-500 bg-orange-50 px-3 py-2 text-orange-700 hover:bg-orange-100'
                                  : 'h-auto min-h-10 rounded-xl px-3 py-2'
                              }
                              data-testid={`attribute-${attribute.id}-${option.id}`}
                            >
                              {isSelected && (
                                <Check className="mr-1.5 h-4 w-4" />
                              )}

                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OpportunityCategoryFields;