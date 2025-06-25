import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

// Lucide React Icons - Make sure lucide-react is installed
import { 
  CheckCircle, 
  AlertCircle, 
  X, 
  Upload, 
  Star, 
  Trash2, 
  ImageIcon,
  Save, 
  Clock, 
  Calendar 
} from 'lucide-react';

// API Functions - These need to be imported from your API service file
// Replace './api' with the actual path to your API service file
import {
  updateShopProfile,
  addShopImage,
  removeShopImage,
  setPrimaryImage,
  getBusinessHours,
  updateBusinessHours,
  getSpecialClosingDays,
  addSpecialClosingDay,
  removeSpecialClosingDay
} from '@/endpoints/ShopAPI'; 



const SettingsContent = () => {

  //   // Get shopData and other context from the layout
  // const { shopData, isApproved, fetchShopData } = useOutletContext();
  
  // Also need to add setShopData - update the context usage
  const { shopData, isApproved, fetchShopData, setShopData } = useOutletContext();

  // Initialize formData with empty values first, then update when shopData is available
const [formData, setFormData] = useState({
  shopName: '',
  email: '',
  phone: '',
  ownerName: '',
  address: '',
  description: '',
  latitude: '',
  longitude: '',
  images: []
});
  
  // Toast state
  const [toast, setToast] = useState(null);
  
  // Image upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto-hide after 5 seconds
  };
  
  // Update formData when shopData changes
  useEffect(() => {
    console.log("ShopData in SettingsContent:", shopData);
    
    if (shopData) {
      const newFormData = {
        shopName: shopData.name || '',
        email: shopData.email || '',
        phone: shopData.phone || '',
        ownerName: shopData.owner_name || '',
        address: shopData.address || '',
        description: shopData.description || '',
        latitude: shopData.latitude || '',
        longitude: shopData.longitude || '',
        images: shopData.images || []
      };
      
      console.log("Setting form data:", newFormData);
      setFormData(newFormData);
    }
  }, [shopData]);

  // Cloudinary upload function
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'Barber and Blade'); // Replace with your Cloudinary upload preset
    formData.append('folder', 'barber_shop_preset'); // Optional: organize images in folders
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dqzfwvmoe/image/upload`, // Replace with your cloud name
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      return {
        url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Validation code remains the same...
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      showToast('Please select only JPEG, PNG, or WebP images', 'error');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      showToast('Please select images smaller than 5MB', 'error');
      return;
    }
    
    if (formData.images.length + files.length > 10) {
      showToast('Maximum 10 images allowed', 'error');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadPromises = files.map(async (file, index) => {
        // Upload to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(file);
        setUploadProgress(((index + 1) / files.length) * 50); // 50% for Cloudinary upload
        
        // Save to database
        const dbResult = await addShopImage({
          url: cloudinaryResult.url,
          public_id: cloudinaryResult.public_id,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height
        });
        
        setUploadProgress(((index + 1) / files.length) * 100); // 100% after DB save
        
        return dbResult.data.data; // Return the saved image data from DB
      });
      
      const savedImages = await Promise.all(uploadPromises);
      
      // Update local state with saved images (including DB IDs)
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...savedImages]
      }));
      
      showToast(`${files.length} image(s) uploaded successfully!`, 'success');
      
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload images. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  // Remove image
  const handleRemoveImage = async (index, imageId) => {
    try {
      // Remove from database
      await removeShopImage(imageId);
      
      // Update local state
      const updatedImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        images: updatedImages
      }));
      
      showToast('Image removed successfully', 'success');
    } catch (error) {
      console.error('Error removing image:', error);
      showToast('Failed to remove image', 'error');
    }
  };

  // Update the handleSetPrimaryImage function to update in database
  const handleSetPrimaryImage = async (index, imageId) => {
    try {
      // Update primary image in database
      await setPrimaryImage(imageId);
      
      // Update local state
      const updatedImages = [...formData.images];
      const [primaryImage] = updatedImages.splice(index, 1);
      updatedImages.unshift(primaryImage);
      
      setFormData(prev => ({
        ...prev,
        images: updatedImages
      }));
      
      showToast('Primary image updated', 'success');
    } catch (error) {
      console.error('Error setting primary image:', error);
      showToast('Failed to update primary image', 'error');
    }
  };

  // Set up businessHours with default values
  const DAYS_OF_WEEK = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' },
  ];
  
  // Business hours and special days state
  const [businessHours, setBusinessHours] = useState(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.id,
      day_name: day.name,
      opening_time: '09:00',
      closing_time: '17:00',
      is_closed: day.id === 6 // Sunday closed by default
    }))
  );
  const [specialClosingDays, setSpecialClosingDays] = useState([]);
  const [newClosingDay, setNewClosingDay] = useState({ date: '', reason: '' });
  
  // UI state for settings
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessDataLoading, setBusinessDataLoading] = useState(false);
  
  // Fetch business hours and special closing days
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        setBusinessDataLoading(true);
        
        // Use the proper API functions instead of direct fetch
        const [hoursResponse, closingDaysResponse] = await Promise.allSettled([
          getBusinessHours(),
          getSpecialClosingDays()
        ]);
        
        if (hoursResponse.status === 'fulfilled' && hoursResponse.value.data.length > 0) {
          setBusinessHours(hoursResponse.value.data);
        }
        
        if (closingDaysResponse.status === 'fulfilled') {
          setSpecialClosingDays(closingDaysResponse.value.data);
        }
        
      } catch (error) {
        console.error("Error fetching business data:", error);
        showToast("Failed to load business data", 'error');
      } finally {
        setBusinessDataLoading(false);
      }
    };
    
    // Only fetch business data if shop is approved
    if (isApproved) {
      fetchBusinessData();
    }
  }, [isApproved]);
  
  // Handle input changes for shop details
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle business hours update
  const handleHoursChange = (index, field, value) => {
    const updatedHours = [...businessHours];
    
    if (field === 'is_closed') {
      updatedHours[index].is_closed = value;
    } else {
      updatedHours[index][field] = value;
    }
    
    setBusinessHours(updatedHours);
  };
  
  // Save shop details - FIXED VERSION
    // FIXED VERSION - Ensure parent state is properly updated
    const handleSaveShopDetails = async () => {
      setIsSubmitting(true);
      try {
        // Validate required fields before sending
        if (!formData.shopName.trim()) {
          showToast("Shop name is required", 'error');
          return;
        }
        if (!formData.phone.trim()) {
          showToast("Phone number is required", 'error');
          return;
        }
        if (!formData.ownerName.trim()) {
          showToast("Owner name is required", 'error');
          return;
        }
        if (!formData.address.trim()) {
          showToast("Address is required", 'error');
          return;
        }

        // Add this validation before the API call in handleSaveShopDetails:
        if (formData.latitude && (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90)) {
          showToast("Please enter a valid latitude (-90 to 90)", 'error');
          return;
        }
        if (formData.longitude && (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180)) {
          showToast("Please enter a valid longitude (-180 to 180)", 'error');
          return;
        }
                // Create update payload
        // Inside handleSaveShopDetails, update the updatedShopData object:
        const updatedShopData = {
          name: formData.shopName.trim(),
          phone: formData.phone.trim(),
          owner_name: formData.ownerName.trim(),
          address: formData.address.trim(),
          description: formData.description.trim(),
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        };

        console.log("Sending update data:", updatedShopData);

        const response = await updateShopProfile(updatedShopData);
        console.log("API Response:", response);
        
        if (response && response.data && response.data.data) {
          const updatedData = response.data.data;
          
          // CRITICAL: Update parent state first
          const newShopData = {
            ...shopData, // Keep existing data
            ...updatedData, // Override with updated data from server
            // Preserve images and other data not included in the update
            images: shopData?.images || formData.images || []
          };
          
          console.log("Updating parent shopData:", newShopData);
          
          // Make sure setShopData is actually updating the parent state
          setShopData(newShopData);

          // Update local form data to match the server response
          setFormData(prev => ({
            ...prev,
            shopName: updatedData.name || prev.shopName,
            phone: updatedData.phone || prev.phone,
            ownerName: updatedData.owner_name || prev.ownerName,
            address: updatedData.address || prev.address,
            description: updatedData.description || prev.description,
            latitude: updatedData.latitude || prev.latitude,
            longitude: updatedData.longitude || prev.longitude,
            images: prev.images
          }));

          showToast("Shop details updated successfully!", 'success');
          
          // Optional: Force a re-render by triggering parent to refetch data
          // if (onShopUpdated) onShopUpdated(); // Add this prop if needed
          
        } else {
          throw new Error("Invalid response from server");
        }
        
      } catch (error) {
        console.error("Error saving shop details:", error);
        
        let errorMessage = "Failed to update shop details";
        
        if (error.response) {
          if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.status === 422) {
            errorMessage = "Please check your input data";
          } else if (error.response.status === 401) {
            errorMessage = "You are not authorized to perform this action";
          } else if (error.response.status >= 500) {
            errorMessage = "Server error. Please try again later";
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
      } finally {
        setIsSubmitting(false);
      }
    };
  
  // Save business hours - Use proper API function
  const handleSaveHours = async () => {
    setIsSubmitting(true);
    try {
      await updateBusinessHours(businessHours);
      showToast("Business hours updated successfully!", 'success');
    } catch (error) {
      console.error("Error saving business hours:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update business hours";
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle new closing day input changes
  const handleClosingDayChange = (field, value) => {
    setNewClosingDay(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add special closing day - Use proper API function
  const handleAddClosingDay = async () => {
    if (!newClosingDay.date) {
      showToast("Please select a date", 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await addSpecialClosingDay(newClosingDay);
      
      setSpecialClosingDays([
        ...specialClosingDays,
        {
          id: response.data.id,
          date: newClosingDay.date,
          reason: newClosingDay.reason
        }
      ]);
      setNewClosingDay({ date: '', reason: '' });
      
      const dateStr = new Date(newClosingDay.date).toLocaleDateString();
      showToast(`Special closing day added for ${dateStr}`, 'success');
    } catch (error) {
      console.error("Error adding special closing day:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add special closing day";
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Remove special closing day - Use proper API function
  const handleRemoveClosingDay = async (id) => {
    const dayToRemove = specialClosingDays.find(day => day.id === id);
    
    setIsSubmitting(true);
    try {
      await removeSpecialClosingDay(id);
      setSpecialClosingDays(specialClosingDays.filter(day => day.id !== id));
      
      const dateStr = new Date(dayToRemove?.date).toLocaleDateString();
      showToast(`Special closing day removed for ${dateStr}`, 'success');
    } catch (error) {
      console.error("Error removing special closing day:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to remove special closing day";
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
          toast.type === 'success' 
            ? 'bg-green-50 border-l-4 border-green-400 text-green-700' 
            : 'bg-red-50 border-l-4 border-red-400 text-red-700'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setToast(null)}
                className={`inline-flex text-sm ${
                  toast.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Details Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Details</h3>
        
        {/* {!isApproved && <ApprovalPendingNotice />} */}
        
        <div className="space-y-6">
          {/* Shop Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Shop Images</label>
            
            {/* Upload Section */}
            <div className="mb-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 relative">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-blue-200 border-top-blue-600 rounded-full animate-spin mb-2"></div>
                        <p className="text-sm text-gray-500">Uploading... {Math.round(uploadProgress)}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> shop images
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG or WebP (Max 5MB each, 10 images max)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploading || formData.images.length >= 10}
                  />
                </label>
              </div>
            </div>

            {/* Images Grid */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={image.id || index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={image.image_url || image.url} // Handle both DB and temp URLs
                        alt={`Shop image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Primary badge */}
                    {(image.is_primary || index === 0) && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Primary
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        {!image.is_primary && index !== 0 && (
                          <button
                            onClick={() => handleSetPrimaryImage(index, image.id)}
                            className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            title="Set as primary"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveImage(index, image.id)}
                          className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                          title="Delete image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {formData.images.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No images uploaded yet</p>
                <p className="text-sm">Upload images to showcase your barber shop</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shopName">Shop Name</label>
              <input 
                type="text" 
                id="shopName"
                name="shopName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.shopName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                value={formData.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone"
                name="phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ownerName">Owner Name</label>
              <input 
                type="text" 
                id="ownerName"
                name="ownerName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.ownerName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Shop Address</label>
            <textarea 
              id="address"
              name="address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="latitude">
                Latitude
              </label>
              <input 
                type="number" 
                id="latitude"
                name="latitude"
                step="any"
                placeholder="e.g., 9.9312"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.latitude}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="longitude">
                Longitude
              </label>
              <input 
                type="number" 
                id="longitude"
                name="longitude"
                step="any"
                placeholder="e.g., 76.2673"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.longitude}
                onChange={handleInputChange}
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Shop Description</label>
            <textarea 
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSaveShopDetails}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Shop Details'}
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Business Hours Section - Only show if approved */}
      {isApproved && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Business Hours</h3>
            <button 
              onClick={handleSaveHours}
              disabled={isSubmitting || businessDataLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Hours'}
              </div>
            </button>
          </div>
          
          {businessDataLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {businessHours.map((day, index) => (
                <div 
                  key={day.day_of_week} 
                  className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="col-span-3 font-medium">{day.day_name}</div>
                  
                  <div className="col-span-8 grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={day.opening_time || '09:00'}
                        onChange={(e) => handleHoursChange(index, 'opening_time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={day.is_closed}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={day.closing_time || '17:00'}
                        onChange={(e) => handleHoursChange(index, 'closing_time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={day.is_closed}
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex items-center justify-end">
                    <input
                      type="checkbox"
                      id={`closed-${day.day_of_week}`}
                      checked={day.is_closed}
                      onChange={(e) => handleHoursChange(index, 'is_closed', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`closed-${day.day_of_week}`} className="ml-2 text-sm text-gray-700">
                      Closed
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Special Closing Days Section - Only show if approved */}
      {isApproved && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Special Closing Days</h3>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingDate">
                Date
              </label>
              <input
                type="date"
                id="closingDate"
                value={newClosingDay.date}
                onChange={(e) => handleClosingDayChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingReason">
                Reason (Optional)
              </label>
              <input
                type="text"
                id="closingReason"
                value={newClosingDay.reason}
                onChange={(e) => handleClosingDayChange('reason', e.target.value)}
                placeholder="e.g., Holiday, Maintenance"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <button
                onClick={handleAddClosingDay}
                disabled={isSubmitting || !newClosingDay.date}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
              >
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add Closing Day'}
                </div>
              </button>
            </div>
          </div>
          
          {specialClosingDays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {specialClosingDays.map((day) => (
                    <tr key={day.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'numeric',
                          year: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.reason || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveClosingDay(day.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-900 disabled:text-red-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No special closing days added yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsContent