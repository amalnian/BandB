"use client"

import { useState, useEffect } from "react"
import { Search, Edit, Trash2, CheckCircle, XCircle, Plus } from "lucide-react"
import toast, { Toaster } from 'react-hot-toast'
import * as adminAPI from "@/endpoints/AdminAPI" // Adjust the import path as needed

export default function UsersManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [formMode, setFormMode] = useState("create") // "create" or "edit"
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(10) // items per page
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    is_active: true,
    role: "customer" // default role
  })
  
  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm])
  
  const fetchUsers = async (page = currentPage) => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      })
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      
      const response = await adminAPI.getUsers(`?${params.toString()}`)
      
      // DEBUG: Log the entire response structure
      console.log('=== API DEBUG INFO ===')
      console.log('Full response:', response)
      console.log('Response.data:', response.data)
      console.log('Response.data.results:', response.data.results)
      console.log('Response.data.count:', response.data.count)
      console.log('Response.data.next:', response.data.next)
      console.log('Response.data.previous:', response.data.previous)
      console.log('=== END DEBUG INFO ===')
      
      // Extract users from paginated response
      const usersData = Array.isArray(response.data?.results) ? response.data.results : []
      const totalCount = response.data?.count || 0
      const totalPages = Math.ceil(totalCount / pageSize)
      
      setUsers(usersData)
      setTotalCount(totalCount)
      setTotalPages(totalPages)
      
      console.log('Final users data:', usersData)
      console.log('Total count:', totalCount)
      console.log('Total pages:', totalPages)
      
    } catch (error) {
      console.error("Error fetching users:", error)
      console.log('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      })
      toast.error("Failed to fetch users")
      setUsers([]) // Set empty array on error
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }
  
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }
  
  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }
  
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }
  
  // Add debug logging for users state
  console.log('Current users state:', users)
  console.log('Users is array?', Array.isArray(users))
  console.log('Users type:', typeof users)
  
  // Remove client-side filtering since we're using server-side search
  const filteredUsers = users
  
  console.log('Filtered users:', filteredUsers)
  
  const openCreateModal = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      is_active: true,
      role: "customer"
    })
    setFormMode("create")
    setIsModalOpen(true)
  }
  
  const openEditModal = (user) => {
    setCurrentUser(user)
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      is_active: user.is_active,
      role: user.role || "customer"
    })
    setFormMode("edit")
    setIsModalOpen(true)
  }
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    })
  }
  
  const handleSubmit = async () => {
    const loadingToast = toast.loading(
      formMode === "create" ? "Creating user..." : "Updating user..."
    )
    
    try {
      if (formMode === "create") {
        await adminAPI.createUser(formData)
        toast.success("User created successfully!", { id: loadingToast })
      } else if (formMode === "edit" && currentUser) {
        await adminAPI.updateUser(currentUser.id, formData)
        toast.success("User updated successfully!", { id: loadingToast })
      }
      
      closeModal()
      fetchUsers(currentPage)
    } catch (error) {
      console.error(`Error ${formMode === "create" ? "creating" : "updating"} user:`, error)
      toast.error(
        `Failed to ${formMode === "create" ? "create" : "update"} user`,
        { id: loadingToast }
      )
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return
    }
    
    const loadingToast = toast.loading("Deleting user...")
    
    try {
      await adminAPI.deleteUser(userId)
      toast.success("User deleted successfully!", { id: loadingToast })
      fetchUsers(currentPage)
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user", { id: loadingToast })
    }
  }
  
  const toggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? "deactivating" : "activating"
    const loadingToast = toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)} user...`)
    
    try {
      await adminAPI.toggleUserStatus(userId, { is_active: !currentStatus })
      toast.success(
        `User ${currentStatus ? "deactivated" : "activated"} successfully!`,
        { id: loadingToast }
      )
      fetchUsers(currentPage)
    } catch (error) {
      console.error("Error updating user status:", error)
      toast.error(`Failed to ${currentStatus ? "deactivate" : "activate"} user`, { id: loadingToast })
    }
  }
  
  const closeModal = () => {
    setIsModalOpen(false)
    setCurrentUser(null)
  }
  
  // Helper function to get user initials safely
  const getUserInitials = (user) => {
    const firstInitial = user.first_name && user.first_name.length > 0 ? user.first_name[0] : '?';
    const lastInitial = user.last_name && user.last_name.length > 0 ? user.last_name[0] : '';
    return firstInitial + lastInitial;
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-12 w-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }
  
  return (
    <>
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Default options for specific types
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
      
      <div className="bg-white rounded-lg shadow">
        {/* Header with search and add user button */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add User
          </button> */}
        </div>
        
        {/* Users table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {getUserInitials(user)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name || ''} {user.last_name || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{user.role || "customer"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`p-1.5 rounded-full ${
                            user.is_active ? "text-red-600 hover:bg-red-100" : "text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {user.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full"
                        >
                          <Edit size={18} />
                        </button>
                        {/* <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-full"
                        >
                          <Trash2 size={18} />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span>
                  {" "}to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>
                  {" "}of{" "}
                  <span className="font-medium">{totalCount}</span>
                  {" "}results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex space-x-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1
                    const isCurrentPage = page === currentPage
                    
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            isCurrentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    }
                    
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-3 py-1 text-gray-500">
                          ...
                        </span>
                      )
                    }
                    
                    return null
                  })}
                </div>
                
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {formMode === "create" ? "Add New User" : "Edit User"}
                </h3>
              </div>
              <div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="barber">Barber</option>
                      <option value="admin">Admin</option>
                      <option value="shop_owner">Shop Owner</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Active</label>
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {formMode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}