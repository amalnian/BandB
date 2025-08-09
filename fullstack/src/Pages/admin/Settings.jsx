import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { getAdminProfile, updateAdminProfile, changeAdminPassword } from '@/endpoints/AdminAPI';// adjust path as needed

import toast, { Toaster } from "react-hot-toast"


const AdminSettings = () => {
  // Profile state
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: ''
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Initial loading
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

const fetchProfile = async () => {
  try {
    setIsInitialLoading(true);
    const response = await getAdminProfile();
    setProfileData(response.data);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    if (error.response?.status === 403) {
      toast.error('Access denied. Admin privileges required.');
    }
  } finally {
    setIsInitialLoading(false);
  }
};

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (profileErrors[name]) {
      setProfileErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear success message when editing
    if (profileSuccess) {
      setProfileSuccess('');
    }
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear success message when editing
    if (passwordSuccess) {
      setPasswordSuccess('');
    }
  };

  // Submit profile update
const handleProfileSubmit = async () => {
  setIsProfileLoading(true);
  setProfileErrors({});
  setProfileSuccess('');

  try {
    const response = await updateAdminProfile(profileData);
    setProfileData(response.data);
    setProfileSuccess('Profile updated successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setProfileSuccess('');
    }, 3000);
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.response?.data?.errors) {
      setProfileErrors(error.response.data.errors);
    } else if (error.response?.data?.error) {
      setProfileErrors({ general: error.response.data.error });
    } else {
      setProfileErrors({ general: 'Failed to update profile. Please try again.' });
    }
  } finally {
    setIsProfileLoading(false);
  }
};

  // Submit password change
const handlePasswordSubmit = async () => {
  setIsPasswordLoading(true);
  setPasswordErrors({});
  setPasswordSuccess('');

  try {
    await changeAdminPassword(passwordData);
    setPasswordSuccess('Password changed successfully!');
    setPasswordData({
      current_password: '',
      new_password: ''
    });
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setPasswordSuccess('');
    }, 3000);
  } catch (error) {
    console.error('Password change error:', error);
    if (error.response?.data?.errors) {
      setPasswordErrors(error.response.data.errors);
    } else if (error.response?.data?.error) {
      setPasswordErrors({ general: error.response.data.error });
    } else {
      setPasswordErrors({ general: 'Failed to change password. Please try again.' });
    }
  } finally {
    setIsPasswordLoading(false);
  }
};

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="mt-2 text-gray-600">Manage your admin profile and security settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings Card */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              </div>
            </div>
            
            <div className="p-6">
              {profileErrors.general && (
                <div className="mb-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-600 text-sm">{profileErrors.general}</span>
                </div>
              )}
              
              {profileSuccess && (
                <div className="mb-4 flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 text-sm">{profileSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your username"
                  />
                  {profileErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.username}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+1234567890"
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.phone}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Format: +999999999 (Up to 15 digits)
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleProfileSubmit}
                  disabled={isProfileLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProfileLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isProfileLoading ? 'Updating...' : 'Update Profile'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Password Settings Card */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              </div>
            </div>
            
            <div className="p-6">
              {passwordErrors.general && (
                <div className="mb-4 flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-600 text-sm">{passwordErrors.general}</span>
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mb-4 flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 text-sm">{passwordSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      id="current_password"
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        passwordErrors.current_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.current_password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="new_password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        passwordErrors.new_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be strong and different from your current password
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePasswordSubmit}
                  disabled={isPasswordLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPasswordLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isPasswordLoading ? 'Changing...' : 'Change Password'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Tips
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Use a strong password with at least 8 characters</li>
            <li>• Include uppercase letters, lowercase letters, numbers, and symbols</li>
            <li>• Don't reuse passwords from other accounts</li>
            <li>• Change your password regularly</li>
            <li>• Keep your contact information up to date for account recovery</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
};

export default AdminSettings;