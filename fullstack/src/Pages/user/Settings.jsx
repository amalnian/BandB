import { useState, useEffect } from "react"
import toast, { Toaster } from "react-hot-toast"

import { 
  User, 
  Lock, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Save,
  Upload,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react"
import { 
  getUserProfile, 
  updateUserProfile, 
  changePassword, 
  uploadProfilePicture, 
  deleteProfilePicture,
  // deactivateAccount 
} from "@/endpoints/APIs"

export default function Settings() {
  // State management
  const [activeTab, setActiveTab] = useState("profile")
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    current_latitude:'',
    current_longitude:'',
    profile_url: null
  })
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  })
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState("")
  const [profilePictureFile, setProfilePictureFile] = useState(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivatePassword, setDeactivatePassword] = useState("")

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await getUserProfile()
      if (response.data.success) {
        setProfileData(response.data.data)
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
      setErrors({ general: "Failed to load profile data" })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrors({})
      setSuccess("")

      const response = await updateUserProfile(profileData)
      if (response.data.success) {
        setSuccess("Profile updated successfully!")
        setProfileData(response.data.data)
      }
    } catch (error) {
      if (error.response?.data?.field_errors) {
        setErrors(error.response.data.field_errors)
      } else {
        setErrors({ general: error.response?.data?.message || "Failed to update profile" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrors({})
      setSuccess("")

      const response = await changePassword(passwordData)
      if (response.data.success) {
        setSuccess("Password changed successfully!")
        setPasswordData({ old_password: "", new_password: "", confirm_password: "" })
      }
    } catch (error) {
      if (error.response?.data?.field_errors) {
        setErrors(error.response.data.field_errors)
      } else {
        setErrors({ general: error.response?.data?.message || "Failed to change password" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePictureSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfilePictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfilePictureUpload = async () => {
    if (!profilePictureFile) return

    try {
      setLoading(true)
      setErrors({})
      
      const formData = new FormData()
      formData.append('profile_picture', profilePictureFile)
      
      const response = await uploadProfilePicture(formData)
      if (response.data.success) {
        setSuccess("Profile picture updated successfully!")
        setProfileData(prev => ({
          ...prev,
          profile_url: response.data.data.profile_url
        }))
        setProfilePictureFile(null)
        setProfilePicturePreview(null)
      }
    } catch (error) {
      setErrors({ picture: error.response?.data?.message || "Failed to upload picture" })
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePictureDelete = async () => {
    try {
      setLoading(true)
      setErrors({})
      
      const response = await deleteProfilePicture()
      if (response.data.success) {
        setSuccess("Profile picture deleted successfully!")
        setProfileData(prev => ({ ...prev, profile_url: null }))
      }
    } catch (error) {
      setErrors({ picture: error.response?.data?.message || "Failed to delete picture" })
    } finally {
      setLoading(false)
    }
  }

  const handleAccountDeactivation = async () => {
    try {
      setLoading(true)
      setErrors({})
      
      const response = await deactivateAccount(deactivatePassword)
      if (response.data.success) {
        toast.success("Account deactivated successfully. You will be logged out.")
        // Redirect to login or handle logout
        window.location.href = "/login"
      }
    } catch (error) {
      if (error.response?.data?.field_errors) {
        setErrors(error.response.data.field_errors)
      } else {
        setErrors({ general: error.response?.data?.message || "Failed to deactivate account" })
      }
    } finally {
      setLoading(false)
      setShowDeactivateModal(false)
      setDeactivatePassword("")
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    // { id: "account", label: "Account", icon: AlertTriangle }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <X className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{errors.general}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setErrors({})
                    setSuccess("")
                  }}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-8">
                {/* Profile Picture Section */}
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden relative">
                      {profilePicturePreview || profileData.profile_url ? (
                        <img
                          src={profilePicturePreview || profileData.profile_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Picture</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a new profile picture. JPG, PNG, or GIF. Max 5MB.
                    </p>
                    <div className="flex space-x-3">
                      <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureSelect}
                          className="hidden"
                        />
                      </label>
                      {profilePictureFile && (
                        <button
                          onClick={handleProfilePictureUpload}
                          disabled={loading}
                          className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                        >
                          {loading ? "Uploading..." : "Upload"}
                        </button>
                      )}
                      {profileData.profile_url && (
                        <button
                          onClick={handleProfilePictureDelete}
                          disabled={loading}
                          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      )}
                    </div>
                    {errors.picture && (
                      <p className="text-red-600 text-sm mt-2">{errors.picture}</p>
                    )}
                  </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.first_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.first_name[0]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.last_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.last_name[0]}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.email && (
                        <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.phone && (
                        <p className="text-red-600 text-sm mt-1">{errors.phone[0]}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Longitude
                      </label>
                      <input
                        type="number"
                        value={profileData.current_longitude}
                        onChange={(e) => setProfileData(prev => ({ ...prev, current_longitude:e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.email && (
                        <p className="text-red-600 text-sm mt-1">{errors.email[0]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="h-4 w-4 inline mr-2" />
                        Latitude
                      </label>
                      <input
                        type="number"
                        value={profileData.current_latitude}
                        onChange={(e) => setProfileData(prev => ({ ...prev, current_latitude: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      {errors.phone && (
                        <p className="text-red-600 text-sm mt-1">{errors.phone[0]}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={(e) => setProfileData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>

                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-amber-600 text-white px-6 py-2 rounded-md font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.old ? "text" : "password"}
                          value={passwordData.old_password}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.old ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.old_password && (
                        <p className="text-red-600 text-sm mt-1">{errors.old_password[0]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.new_password && (
                        <div className="text-red-600 text-sm mt-1">
                          {errors.new_password.map((error, index) => (
                            <p key={index}>{error}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-red-600 text-sm mt-1">{errors.confirm_password[0]}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-amber-600 text-white px-6 py-2 rounded-md font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {loading ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Two-Factor Authentication Section (Optional) */}
                {/* <div className="border-t pt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account by enabling two-factor authentication.
                    </p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                      Enable 2FA (Coming Soon)
                    </button>
                  </div>
                </div> */}
              </div>
            )}


          </div>
        </div> 

        {/* Deactivate Account Modal */}
        {/* {showDeactivateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Deactivate Account</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to deactivate your account? This will disable your access to all services.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your password to confirm:
                </label>
                <input
                  type="password"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Your password"
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password[0]}</p>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeactivateModal(false)
                    setDeactivatePassword("")
                    setErrors({})
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccountDeactivation}
                  disabled={loading || !deactivatePassword}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deactivating..." : "Deactivate"}
                </button>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
}