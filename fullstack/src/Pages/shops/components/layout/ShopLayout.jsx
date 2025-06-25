// components/layout/ShopLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { getShopProfile } from '@/endpoints/ShopAPI';

const ShopLayout = () => {
  const [shopData, setShopData] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      const response = await getShopProfile();
      const shopProfileData = response.data?.data || response.data;
      
      setShopData(shopProfileData);
      setIsApproved(shopProfileData.is_approved || false);
      
      // If not approved and not on settings page, redirect to settings
      if (!shopProfileData.is_approved && !location.pathname.includes('settings')) {
        navigate('/shop/settings', { replace: true });
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
      if (error.response?.status === 401) {
        navigate('/shop/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        shopData={shopData}
        isApproved={isApproved}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          shopData={shopData}
          isApproved={isApproved}
        />
        <main className="flex-1 overflow-y-auto p-6">
        <Outlet context={{ shopData, isApproved, fetchShopData, setShopData }} />
        </main>
      </div>
    </div>
  );
};

export default ShopLayout;