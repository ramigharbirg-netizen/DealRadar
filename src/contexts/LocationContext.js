import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LocationContext = createContext(null);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

// Default location (New York City for demo)
const DEFAULT_LOCATION = {
  lat: 40.7128,
  lng: -74.0060,
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(50); // km
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [isUsingUserLocation, setIsUsingUserLocation] = useState(false);

  // Check permission state on mount
 useEffect(() => {
  const initLocation = async () => {
    try {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          console.log("REAL LOCATION:", lat, lng);

          setLocation({ lat, lng });
          setIsUsingUserLocation(true);
          setPermissionState('granted');
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.log("GPS ERROR:", err);

          setIsUsingUserLocation(false);
          setLoading(false);

          if (err.code === 1) {
            setError('Location denied');
            setPermissionState('denied');
          } else {
            setError('Location error');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      console.log("INIT ERROR:", e);
      setLoading(false);
    }
  };

  initLocation();
}, []);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by your browser');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsUsingUserLocation(true);
        setPermissionState('granted');
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.log('Geolocation error:', err.message);
        if (err.code === 1) {
          setError('Location access denied');
          setPermissionState('denied');
        } else if (err.code === 2) {
          setError('Location unavailable');
        } else if (err.code === 3) {
          setError('Location request timed out');
        }
        setIsUsingUserLocation(false);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Watch position for real-time updates (optional)
  const startWatchingPosition = useCallback(() => {
    if (!('geolocation' in navigator)) return null;

    return navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsUsingUserLocation(true);
      },
      (err) => {
        console.log('Watch position error:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }, []);

  const updateLocation = (newLocation) => {
    setLocation(newLocation);
  };

  const updateRadius = (newRadius) => {
    setRadius(newRadius);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        error,
        radius,
        permissionState,
        isUsingUserLocation,
        updateLocation,
        updateRadius,
        requestLocation,
        startWatchingPosition,
        defaultLocation: DEFAULT_LOCATION,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
