// pages/shop/ShopServices.js
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ServicesContent from '../shops/components/Services';

const ShopServices = () => {
  const { shopData, isApproved } = useOutletContext();

  if (!isApproved) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow p-6">
        <div className="text-gray-400 text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">Services Locked</h3>
        <p className="text-gray-500 text-center max-w-md">
          Complete your profile in Settings to manage services.
        </p>
      </div>
    );
  }

  return <ServicesContent shopId={shopData?.id} />;
};

export default ShopServices;