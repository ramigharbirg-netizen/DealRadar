import React, { createContext, useContext, useEffect, useState } from 'react';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    lat: 41.9028,
    lng: 12.4964,
    accuracy: null,
  });
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(true);
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
    setLocation({
      lat: 41.9028,
      lng: 12.4964,
      accuracy: null,
    });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      applyFallback('Geolocation not supported');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPosition(position);
      },
      (err) => {
        console.error('GPS ERROR:', err);
        console.error('Geolocation error:', err.message);
        applyFallback(err.message || 'Location error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      applyFallback('Geolocation not supported');
      return;
    }

    let watchId = null;
    let fallbackTimer = null;

    setLoading(true);

    fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 12000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        applyPosition(position);
      },
      (err) => {
        console.error('GPS ERROR:', err);
        console.error('Geolocation error:', err.message);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        applyFallback(err.message || 'Location error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

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
        error,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);