// pages/shop/ShopSettings.js
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SettingsContent from '../shops/components/SettingsContent';

const ShopSettings = () => {
  const { shopData, isApproved, fetchShopData } = useOutletContext();

  return (
    <div>
      {!isApproved && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Your shop approval is pending.</span> 
                Complete your profile information to help expedite the approval process.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <SettingsContent 
        shopData={shopData} 
        onUpdate={fetchShopData} 
      />
    </div>
  );
};

export default ShopSettings;