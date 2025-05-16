"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  
  const navigate = useNavigate()
  const itemsPerPage = 10

  useEffect(() => {
    fetchShops()
  }, [currentPage, searchTerm])

  const fetchShops = async () => {
    const token = localStorage.getItem("access_token")
    
    if (!token) {
      navigate("/admin/login")
      return
    }
    
    try {
      setLoading(true)
      
      const response = await fetch(
        `http://127.0.0.1:8000/api/admin/shops/?page=${currentPage}&search=${searchTerm}`, 
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error("Failed to fetch shops")
      }
      
      const data = await response.json()
      setShops(data.results)
      setTotalPages(Math.ceil(data.count / itemsPerPage))
    } catch (error) {
      console.error("Error fetching shops:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddShop = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/admin/shops/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error("Failed to add shop")
      }
      
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
    } catch (error) {
      console.error("Error adding shop:", error)
    }
  }

  const handleEditShop = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
    }
    
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/shops/${currentShop.id}/`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error("Failed to update shop")
      }
      
      setShowEditModal(false)
      fetchShops()
    } catch (error) {
      console.error("Error updating shop:", error)
    }
  }

  const handleDeleteShop = async () => {
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/shops/${currentShop.id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete shop")
      }
      
      setShowDeleteModal(false)
      fetchShops()
    } catch (error) {
      console.error("Error deleting shop:", error)
    }
  }

  const handleBlockShop = async () => {
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/shops/${currentShop.id}/block/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: false })
      })
      
      if (!response.ok) {
        throw new Error("Failed to block shop")
      }
      
      setShowBlockModal(false)
      fetchShops()
    } catch (error) {
      console.error("Error blocking shop:", error)
    }
  }

  const handleUnblockShop = async (shop) => {
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/shops/${shop.id}/block/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: true })
      })
      
      if (!response.ok) {
        throw new Error("Failed to unblock shop")
      }
      
      fetchShops()
    } catch (error) {
      console.error("Error unblocking shop:", error)
    }
  }

  const handleApproveShop = async () => {
    const token = localStorage.getItem("access_token")
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/shops/${currentShop.id}/approve/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_approved: true })
      })
      
      if (!response.ok) {
        throw new Error("Failed to approve shop")
      }
      
      setShowApproveModal(false)
      fetchShops()
    } catch (error) {
      console.error("Error approving shop:", error)
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

  if (loading && shops.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">Shop Management</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add Shop
          </button>
        </div>
      </header>
      
      {/* Content */}
      <main className="p-6">
        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search shops..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Shop list */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shops.length > 0 ? (
                  shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Store size={20} className="text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin size={16} className="mr-1" />
                          {shop.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 mb-1">
                          <Phone size={14} className="inline mr-1" /> {shop.phone}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Mail size={14} className="inline mr-1" /> {shop.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          shop.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {shop.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          shop.is_approved 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {shop.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900 mr-1">{shop.rating || "N/A"}</span>
                          {shop.rating && <Star size={16} className="text-yellow-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!shop.is_approved && (
                          <button 
                            onClick={() => openApproveModal(shop)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Approve Shop"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {shop.is_active ? (
                          <button 
                            onClick={() => openBlockModal(shop)}
                            className="text-orange-600 hover:text-orange-900 mr-3"
                            title="Block Shop"
                          >
                            <ShieldAlert size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUnblockShop(shop)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Unblock Shop"
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(shop)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit Shop"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(shop)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Shop"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      {loading ? "Loading shops..." : "No shops found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </button>
                <div className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add New Shop</h3>
            </div>
            <form onSubmit={handleAddShop}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Fri: 9AM-6PM"
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({...formData, opening_hours: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.is_active.toString()}
                      onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                    >
                      <option value="true">Active</option>
                      <option value="false">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval</label>
                    <select
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.is_approved.toString()}
                      onChange={(e) => setFormData({...formData, is_approved: e.target.value === "true"})}
                    >
                      <option value="true">Approved</option>
                      <option value="false">Pending</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Add Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Shop Modal */}
      {showEditModal && currentShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Edit Shop</h3>
            </div>
            <form onSubmit={handleEditShop}>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    disabled
                    className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 cursor-not-allowed"
                    value={formData.email}
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be edited</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Fri: 9AM-6PM"
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({...formData, opening_hours: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.is_active.toString()}
                      onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                    >
                      <option value="true">Active</option>
                      <option value="false">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval</label>
                    <select
                      className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.is_approved.toString()}
                      onChange={(e) => setFormData({...formData, is_approved: e.target.value === "true"})}
                    >
                      <option value="true">Approved</option>
                      <option value="false">Pending</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Update Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
     {/* Delete Confirmation Modal */}
      {showDeleteModal && currentShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Delete Shop</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-medium">{currentShop.name}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteShop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Block Shop Confirmation Modal */}
      {showBlockModal && currentShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ShieldAlert size={24} className="text-orange-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Block Shop</h3>
              </div>
              <p className="text-gray-600">
                Are you sure you want to block <span className="font-medium">{currentShop.name}</span>? This will prevent the shop from conducting any business until unblocked.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockShop}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium"
              >
                Block Shop
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Approve Shop Confirmation Modal */}
      {showApproveModal && currentShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Check size={24} className="text-green-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Approve Shop</h3>
              </div>
              <p className="text-gray-600">
                Are you sure you want to approve <span className="font-medium">{currentShop.name}</span>? This will allow the shop to be visible to customers and start accepting orders.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveShop}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                Approve Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}