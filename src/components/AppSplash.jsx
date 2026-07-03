import React from "react";

const AppSplash = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#FFE6C7]">
      <img
        src="/splash.png"
        alt="DealRadar"
        className="h-full w-full object-cover"
      />
    </div>
  );
};

export default AppSplash;