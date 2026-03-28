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

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      setPermissionState('denied');
      setIsUsingUserLocation(false);
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy,
        };

        console.log('REAL LOCATION:', coords.lat, coords.lng);
        console.log('ACCURACY:', accuracy);

        if (accuracy > 100) {
          console.log('Posizione scartata, troppo imprecisa:', accuracy);
          setLoading(false);
          return;
        }

        setLocation(coords);
        setPermissionState('granted');
        setIsUsingUserLocation(true);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('GPS ERROR:', err);
        console.error('Geolocation error:', err.message);

        setPermissionState('denied');
        setIsUsingUserLocation(false);
        setError(err.message || 'Location error');
        setLoading(false);

        setLocation({
          lat: 41.9028,
          lng: 12.4964,
          accuracy: null,
        });
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
      setLoading(false);
      setPermissionState('denied');
      setError('Geolocation not supported');
      return;
    }

    let watchId = null;

    setLoading(true);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy,
        };

        console.log('REAL LOCATION:', coords.lat, coords.lng);
        console.log('ACCURACY:', accuracy);

        if (accuracy > 300) {
          console.log('Posizione scartata, troppo imprecisa:', accuracy);
          return;
        }

        setLocation(coords);
        setPermissionState('granted');
        setIsUsingUserLocation(true);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('GPS ERROR:', err);
        console.error('Geolocation error:', err.message);

        setPermissionState('denied');
        setIsUsingUserLocation(false);
        setError(err.message || 'Location error');
        setLoading(false);

        setLocation({
          lat: 41.9028,
          lng: 12.4964,
          accuracy: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
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