import React from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export const LocationPermissionModal = ({ 
  open, 
  onClose, 
  onRequestPermission, 
  permissionState,
  error 
}) => {
  const isDenied = permissionState === 'denied';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDenied ? 'bg-red-100' : 'bg-primary/10'
            }`}>
              {isDenied ? (
                <AlertCircle className="w-8 h-8 text-red-500" />
              ) : (
                <Navigation className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center">
            {isDenied ? 'Location Access Denied' : 'Enable Location'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isDenied ? (
              <>
                You've denied location access. To see opportunities near you, 
                please enable location in your browser settings.
              </>
            ) : (
              <>
                Allow Opportunity Radar to access your location to discover 
                opportunities near you and see accurate distances.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {!isDenied && (
            <Button
              onClick={onRequestPermission}
              className="w-full h-12 bg-primary rounded-xl"
              data-testid="enable-location-btn"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Enable Location
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-12 rounded-xl"
            data-testid="skip-location-btn"
          >
            {isDenied ? 'Continue with Default Location' : 'Maybe Later'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center mt-2">{error}</p>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Using default location: New York City
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionModal;
