// Required React imports
import React, { useState, useEffect } from 'react';

// Required icon imports (assuming you're using lucide-react)
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

// Required API function imports
import { 
  getShopServices, 
  createShopService, 
  updateShopService, 
  deleteShopService 
} from '@/endpoints/ShopAPI';

const ServicesContent = ({ shopId }) => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
    is_active: true
  });

  // Toast state
  const [toast, setToast] = useState(null);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    service: null
  });

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto-hide after 5 seconds
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_minutes: '',
      is_active: true
    });
    setError('');
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, [shopId]);

  // Fetch all services for the shop
  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await getShopServices();
      console.log('Fetch services response:', response); // Debug log
      
      // Handle different response structures
      const servicesData = response.data?.results || response.data || response.results || response || [];
      
      // Ensure servicesData is an array
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]); // Ensure services is always an array
      
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        showToast('Authentication required. Please log in again.', 'error');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view these services.');
        showToast('You do not have permission to view these services.', 'error');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to load services';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add new service
  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await createShopService(formData);
      console.log('Create service response:', response); // Debug log
      
      // Handle different response structures
      const newService = response.data || response;
      
      // Ensure services is an array before spreading
      const currentServices = Array.isArray(services) ? services : [];
      setServices([...currentServices, newService]);
      
      setIsAddingService(false);
      resetForm();
      showToast(`Service "${newService.name}" has been created successfully!`, 'success');
    } catch (error) {
      console.error('Error adding service:', error);
      console.error('Error response:', error.response); // Debug log
      
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        showToast('Authentication required. Please log in again.', 'error');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to create services.');
        showToast('You do not have permission to create services.', 'error');
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.detail ||
                            Object.values(error.response?.data || {}).flat().join(', ') ||
                            'Failed to create service';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      // Make sure we're passing the service ID correctly
      const response = await updateShopService(isEditingService, formData);
      console.log('Update service response:', response); // Debug log
      
      const updatedService = response.data || response;
      
      // Ensure services is an array
      const currentServices = Array.isArray(services) ? services : [];
      setServices(currentServices.map(service => 
        service.id === isEditingService ? updatedService : service
      ));
      
      setIsEditingService(null);
      resetForm();
      showToast(`Service "${updatedService.name}" has been updated successfully!`, 'success');
    } catch (error) {
      console.error('Error updating service:', error);
      console.error('Error details:', error.response?.data); // Add this for debugging
      
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        showToast('Authentication required. Please log in again.', 'error');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to update this service.');
        showToast('You do not have permission to update this service.', 'error');
      } else if (error.response?.status === 404) {
        setError('Service not found.');
        showToast('Service not found.', 'error');
      } else {
        // Show more detailed error message
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message || 
                            Object.values(error.response?.data || {}).flat().join(', ') ||
                            'Failed to update service';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleDeleteService = async (id) => {
    const currentServices = Array.isArray(services) ? services : [];
    const serviceToDelete = currentServices.find(service => service.id === id);
    
    // Open delete confirmation modal
    setDeleteModal({
      isOpen: true,
      service: serviceToDelete
    });
  };

  const confirmDelete = async () => {
    const { service } = deleteModal;
    if (!service) return;
    
    try {
      setError('');
      await deleteShopService(service.id);
      const currentServices = Array.isArray(services) ? services : [];
      setServices(currentServices.filter(s => s.id !== service.id));
      showToast(`Service "${service.name}" has been deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting service:', error);
      console.error('Error details:', error.response?.data); // Add this for debugging
      
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        showToast('Authentication required. Please log in again.', 'error');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to delete this service.');
        showToast('You do not have permission to delete this service.', 'error');
      } else if (error.response?.status === 404) {
        setError('Service not found.');
        showToast('Service not found.', 'error');
      } else {
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message || 
                            'Failed to delete service';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } finally {
      // Close modal regardless of success or failure
      setDeleteModal({ isOpen: false, service: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, service: null });
  };

  // Start editing a service
  const startEditService = (service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration_minutes: service.duration_minutes,
      is_active: service.is_active
    });
    setIsEditingService(service.id);
  };

  // Cancel form
  const handleCancel = () => {
    setIsAddingService(false);
    setIsEditingService(null);
    resetForm();
  };

  // Ensure services is always an array
  const servicesList = Array.isArray(services) ? services : [];

  // Display loading state
  if (isLoading && servicesList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Service
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete "{deleteModal.service?.name}"? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 border border-transparent rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Services</h3>
          {!isAddingService && !isEditingService && (
            <button 
              onClick={() => setIsAddingService(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              <div className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingService || isEditingService) && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-700 mb-4">
            {isAddingService ? 'Add New Service' : 'Edit Service'}
          </h4>
          
          <form onSubmit={isAddingService ? handleAddService : handleUpdateService}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input 
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input 
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  min="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex items-center h-full pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (available for booking)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </div>
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  {isAddingService ? 'Save Service' : 'Update Service'}
                </div>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      <div className="p-6">
        {servicesList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servicesList.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{service.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{Number(service.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.duration_minutes} mins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button 
                          onClick={() => startEditService(service)}
                          className="text-blue-600 hover:text-blue-900"
                          disabled={isAddingService || isEditingService}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isAddingService || isEditingService}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {!isAddingService && !error && (
              <div>
                <p className="mb-4">No services have been added yet.</p>
                <button 
                  onClick={() => setIsAddingService(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  <div className="flex items-center justify-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Service
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesContent;