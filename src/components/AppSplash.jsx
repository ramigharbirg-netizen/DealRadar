import React from "react";
import { Capacitor } from "@capacitor/core";

const AppSplash = () => {
  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#FFE6C7] p-6">
      {isNative ? (
        <img
          src="/splash.png"
          alt="DealRadar"
          className="h-full w-full object-contain"
        />
      ) : (
        <img
          src="/brand/dealradar-pin.png"
          alt="DealRadar"
          className="h-auto w-36 object-contain sm:w-44 md:w-52"
        />
      )}
    </div>
  );
};

export default AppSplash;