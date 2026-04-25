import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext();

const DEFAULT_LOCATION = {
  lat: 41.9028,
  lng: 12.4964,
  accuracy: null,
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');
  const [isUsingUserLocation, setIsUsingUserLocation] = useState(false);
  const [error, setError] = useState(null);

  const updateRadius = (value) => {
    setRadius(value);
  };

  const applyPosition = (position) => {
    const accuracy = position.coords.accuracy ?? null;
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy,
    };

    console.log('REAL LOCATION:', coords.lat, coords.lng);
    console.log('ACCURACY:', accuracy);

    setLocation(coords);
    setPermissionState('granted');
    setIsUsingUserLocation(true);
    setError(null);
    setLoading(false);
  };

  const applyFallback = (message) => {
    setPermissionState('denied');
    setIsUsingUserLocation(false);
    setError(message || 'Location error');
    setLoading(false);
    setLocation(DEFAULT_LOCATION);
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      applyFallback('Geolocation not supported');
      return null;
    }

    setLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyPosition(position);
          resolve(position);
        },
        (err) => {
          console.error('GPS ERROR:', err);
          console.error('Geolocation error:', err.message);
          applyFallback(err.message || 'Location error');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });
  };

  const resetToDefaultLocation = () => {
    setLocation(DEFAULT_LOCATION);
    setIsUsingUserLocation(false);
    setPermissionState('prompt');
    setError(null);
    setLoading(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        radius,
        updateRadius,
        loading,
        permissionState,
        isUsingUserLocation,
        requestLocation,
        resetToDefaultLocation,
        error,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);