
"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Store,
  MapPin,
  Phone,
  Mail,
  Star,
  Check,
  X,
  ShieldAlert,
  Shield
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

// Import API functions
import {
  getShops,
  createShop,
  updateShop,
  deleteShop,
  blockShop,
  unblockShop,
  approveShop
} from '@/endpoints/AdminAPI' // Adjust the import path as needed

export default function ShopManagement() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [currentShop, setCurrentShop] = useState(null)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    opening_hours: "",
    is_active: true,
    is_approved: false
  })
  
  const itemsPerPage = 10

  useEffect(() => {
    fetchShops()
  }, [currentPage, searchTerm])

  const fetchShops = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await getShops({
        page: currentPage,
        search: searchTerm
      })
      
      setShops(response.data.results)
      setTotalPages(Math.ceil(response.data.count / itemsPerPage))
    } catch (error) {
      console.error("Error fetching shops:", error)
      const errorMessage = "Failed to fetch shops"
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        toast.error("Session expired. Redirecting to login...")
        setTimeout(() => {
          window.location.href = "/admin/login"
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddShop = async (e) => {
    if (e) e.preventDefault()
    
    const loadingToast = toast.loading("Adding shop...")
    
    try {
      await createShop(formData)
      
      toast.dismiss(loadingToast)
      toast.success("Shop added successfully!")
      
      setShowAddModal(false)
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        description: "",
        opening_hours: "",
        is_active: true,
        is_approved: false
      })
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error adding shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to add shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  const handleEditShop = async (e) => {
    if (e) e.preventDefault()
    
    const loadingToast = toast.loading("Updating shop...")
    
    try {
      await updateShop(currentShop.id, formData)
      
      toast.dismiss(loadingToast)
      toast.success("Shop updated successfully!")
      
      setShowEditModal(false)
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error updating shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to update shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  const handleDeleteShop = async () => {
    const loadingToast = toast.loading("Deleting shop...")
    
    try {
      await deleteShop(currentShop.id)
      
      toast.dismiss(loadingToast)
      toast.success(`${currentShop.name} deleted successfully`)
      
      setShowDeleteModal(false)
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error deleting shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to delete shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  const handleBlockShop = async () => {
    const loadingToast = toast.loading("Blocking shop...")
    
    try {
      await blockShop(currentShop.id)
      
      toast.dismiss(loadingToast)
      toast.success(`${currentShop.name} blocked successfully`)
      
      setShowBlockModal(false)
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error blocking shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to block shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  const handleUnblockShop = async (shop) => {
    const loadingToast = toast.loading("Unblocking shop...")
    
    try {
      await unblockShop(shop.id)
      
      toast.dismiss(loadingToast)
      toast.success(`${shop.name} unblocked successfully`)
      
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error unblocking shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to unblock shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }

  const handleApproveShop = async () => {
    const loadingToast = toast.loading("Approving shop...")
    
    try {
      await approveShop(currentShop.id, { is_approved: true })
      
      toast.dismiss(loadingToast)
      toast.success(`${currentShop.name} approved successfully`)
      
      setShowApproveModal(false)
      fetchShops()
      setError("")
    } catch (error) {
      console.error("Error approving shop:", error)
      const errorMessage = error.response?.data?.message || "Failed to approve shop"
      
      toast.dismiss(loadingToast)
      toast.error(errorMessage)
      setError(errorMessage)
    }
  }
  const openEditModal = (shop) => {
    setCurrentShop(shop)
    setFormData({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      description: shop.description || "",
      opening_hours: shop.opening_hours || "",
      is_active: shop.is_active,
      is_approved: shop.is_approved
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (shop) => {
    setCurrentShop(shop)
    setShowDeleteModal(true)
  }

  const openBlockModal = (shop) => {
    setCurrentShop(shop)
    setShowBlockModal(true)
  }

  const openApproveModal = (shop) => {
    setCurrentShop(shop)
    setShowApproveModal(true)
  }

  // Modal components
  const AddShopModal = () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Add New Shop</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Shop Name</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Opening Hours</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.opening_hours}
              onChange={(e) => setFormData({...formData, opening_hours: e.target.value})}
              placeholder="e.g. Mon-Fri: 9AM-5PM"
            />
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="is_approved"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={formData.is_approved}
              onChange={(e) => setFormData({...formData, is_approved: e.target.checked})}
            />
            <label htmlFor="is_approved" className="ml-2 block text-sm">
              Approve shop immediately
            </label>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false)
                setError("")
              }}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleAddShop}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const EditShopModal = () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Edit Shop</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Shop Name</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-gray-300 p-2"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Opening Hours</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 p-2"
              value={formData.opening_hours}
              onChange={(e) => setFormData({...formData, opening_hours: e.target.value})}
              placeholder="e.g. Mon-Fri: 9AM-5PM"
            />
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="edit_is_approved"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={formData.is_approved}
              onChange={(e) => setFormData({...formData, is_approved: e.target.checked})}
            />
            <label htmlFor="edit_is_approved" className="ml-2 block text-sm">
              Shop is approved
            </label>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false)
                setError("")
              }}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleEditShop}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Update Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const DeleteConfirmationModal = () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-red-600">Delete Shop</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <p className="mb-6 text-gray-700">
          Are you sure you want to delete <span className="font-semibold">{currentShop?.name}</span>? This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowDeleteModal(false)
              setError("")
            }}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleDeleteShop}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )

  const BlockConfirmationModal = () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-orange-600">Block Shop</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <p className="mb-6 text-gray-700">
          Are you sure you want to block <span className="font-semibold">{currentShop?.name}</span>? The shop will no longer be visible to customers.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowBlockModal(false)
              setError("")
            }}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleBlockShop}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Block Shop
          </button>
        </div>
      </div>
    </div>
  )

  const ApproveConfirmationModal = () => (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-blue-600">Approve Shop</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <p className="mb-6 text-gray-700">
          Are you sure you want to approve <span className="font-semibold">{currentShop?.name}</span>? This will make the shop visible to all customers.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowApproveModal(false)
              setError("")
            }}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleApproveShop}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )

  if (loading && shops.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Shop Management</h1>
      
      {error && !showAddModal && !showEditModal && !showDeleteModal && !showBlockModal && !showApproveModal && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center rounded-md border bg-white px-3 py-2">
          <Search className="mr-2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Shop
        </button> */}
      </div>
      
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Shop</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {shops.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="mr-1 h-3 w-3" />
                        {shop.address}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="flex items-center">
                      <Phone className="mr-1 h-3 w-3" />
                      {shop.phone}
                    </div>
                    <div className="flex items-center">
                      <Mail className="mr-1 h-3 w-3" />
                      {shop.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      shop.is_active 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {shop.is_active ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : (
                        <X className="mr-1 h-3 w-3" />
                      )}
                      {shop.is_active ? "Active" : "Blocked"}
                    </span>
                    
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      shop.is_approved 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {shop.is_approved ? (
                        <Star className="mr-1 h-3 w-3" />
                      ) : (
                        <Shield className="mr-1 h-3 w-3" />
                      )}
                      {shop.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => openEditModal(shop)}
                      className="rounded p-1 text-gray-600 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {/* <button
                      onClick={() => openDeleteModal(shop)}
                      className="rounded p-1 text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button> */}
                    
                    {shop.is_active ? (
                      <button
                        onClick={() => openBlockModal(shop)}
                        className="rounded p-1 text-orange-600 hover:bg-gray-100"
                        title="Block Shop"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnblockShop(shop)}
                        className="rounded p-1 text-green-600 hover:bg-gray-100"
                        title="Unblock Shop"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    
                    {!shop.is_approved && (
                      <button
                        onClick={() => openApproveModal(shop)}
                        className="rounded p-1 text-blue-600 hover:bg-gray-100"
                        title="Approve Shop"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {shops.length === 0 && !loading && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No shops found. Add a new shop to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`rounded-md p-2 ${
                currentPage === 1 
                  ? "cursor-not-allowed text-gray-400" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`rounded-md p-2 ${
                currentPage === totalPages 
                  ? "cursor-not-allowed text-gray-400" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Modals */}
      {showAddModal && <AddShopModal />}
      {showEditModal && currentShop && <EditShopModal />}
      {showDeleteModal && currentShop && <DeleteConfirmationModal />}
      {showBlockModal && currentShop && <BlockConfirmationModal />}
      {showApproveModal && currentShop && <ApproveConfirmationModal />}
    </div>
  )
}