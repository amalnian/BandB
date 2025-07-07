import { useState, useEffect } from "react"
import { Star, MapPin, Phone, Clock, User, Image, AlertCircle, ExternalLink, Check, X, ArrowLeft, Heart, Share, MessageCircle } from "lucide-react"
import { shopDetail as shopDetailAPI } from "@/endpoints/APIs"
import { useParams, useNavigate } from "react-router-dom"

const BarberDetails = ({ debug = false }) => {
  const { shopId } = useParams()
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState("28 Aug 2021")
  const [activeTab, setActiveTab] = useState("schedule")
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)

  const navigate = useNavigate()
  // Fetch shop data on component mount
  useEffect(() => {
    const fetchShopData = async () => {
      // Remove the shopDetail check since we're importing it directly
      try {
        setLoading(true)
        setError(null)
        
        const response = await shopDetailAPI(shopId) // Use the imported function
        
        if (response.data?.success && response.data?.data) {
          setShopData(response.data.data)
        } else {
          throw new Error('Failed to fetch shop data')
        }
      } catch (err) {
        console.error('Error fetching shop data:', err)
        setError(err.message || 'Failed to load shop details')
      } finally {
        setLoading(false)
      }
    }

    if (shopId) {
      fetchShopData()
    } else {
      setError('Shop ID is required')
      setLoading(false)
    }
  }, [shopId]) // Remove shopDetail from dependency array

  useEffect(() => {
    if (debug && shopData) {
      console.log('🔍 Shop data:', shopData)
      console.log('🖼️ Image sources found:', {
        images_array: shopData.images,
        direct_image: shopData.image,
        image_url: shopData.image_url,
        cloudinary_url: shopData.images?.[0]?.image_url
      })
    }
  }, [shopData, debug])

  const createPlaceholderDataUrl = (text = "No Image") => {
    const svg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
              font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          ${text}
        </text>
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  const getImageUrl = () => {
    if (!shopData) return createPlaceholderDataUrl("Loading...")
    
    if (imageError) {
      return createPlaceholderDataUrl("Image Error")
    }

    let imageUrl = null
    let source = "none"

    // Check for images array first (primary source from your API)
    if (shopData.images && Array.isArray(shopData.images) && shopData.images.length > 0) {
      const primaryImage = shopData.images.find(img => img.is_primary && img.image_url)
      if (primaryImage) {
        imageUrl = primaryImage.image_url
        source = "primary_image_array"
      } else {
        const firstImage = shopData.images.find(img => img.image_url)
        if (firstImage) {
          imageUrl = firstImage.image_url
          source = "first_image_array"
        }
      }
    }

    // Fallback to other possible image fields
    if (!imageUrl) {
      const imageSources = [
        { url: shopData.cloudinary_url, source: "cloudinary_url" },
        { url: shopData.image_url, source: "image_url" },
        { url: shopData.image, source: "image" },
        { url: shopData.photo, source: "photo" },
        { url: shopData.thumbnail, source: "thumbnail" }
      ]

      for (const { url, source: src } of imageSources) {
        if (url && typeof url === 'string' && url.trim()) {
          imageUrl = url.trim()
          source = src
          break
        }
      }
    }

    if (imageUrl) {
      // Optimize Cloudinary URLs
      if (imageUrl.includes('cloudinary.com')) {
        if (!imageUrl.includes('q_auto')) {
          imageUrl = imageUrl.replace('/upload/', '/upload/q_auto,f_auto/')
        }
        
        const cloudinaryPattern = /https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\/.*\.(jpg|jpeg|png|gif|webp)/i
        if (cloudinaryPattern.test(imageUrl)) {
          if (debug) {
            setDebugInfo({ 
              url: imageUrl, 
              source, 
              valid: true, 
              type: 'cloudinary',
              optimized: imageUrl.includes('q_auto')
            })
          }
          return imageUrl
        }
      }
      
      try {
        new URL(imageUrl)
        if (debug) {
          setDebugInfo({ url: imageUrl, source, valid: true, type: 'external' })
        }
        return imageUrl
      } catch (e) {
        console.warn('❌ Invalid image URL:', imageUrl, 'Error:', e.message)
        if (debug) {
          setDebugInfo({ url: imageUrl, source, valid: false, error: e.message })
        }
      }
    }

    return createPlaceholderDataUrl("No Image")
  }

  const handleImageError = (e) => {
    const failedUrl = e.target.src
    console.error('🚨 Image failed to load:', {
      shop: shopData?.name,
      url: failedUrl,
      error: e.type
    })
    
    if (!imageError) {
      setImageError(true)
      setImageLoading(false)
    }
  }

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', shopData?.name)
    setImageLoading(false)
    setImageError(false)
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      )
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="w-4 h-4 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      )
    }

    return stars
  }

  const calculateDistance = () => {
    // You can implement actual distance calculation here using user's location
    // For now, returning null to indicate no distance data
    return null
  }

  const parseWorkingHours = (openingHours) => {
    if (!openingHours) {
      return {
        weekdays: "Not available",
        weekends: "Not available"
      }
    }
    
    // If it's a simple string, use it for both weekdays and weekends
    if (typeof openingHours === 'string') {
      return {
        weekdays: openingHours,
        weekends: openingHours
      }
    }
    
    return openingHours
  }

  const handleActionClick = (action) => {
    if (!shopData) return

    switch (action) {
      case 'phone':
        if (shopData.phone) {
          window.open(`tel:${shopData.phone}`, '_self')
        }
        break
      case 'favorite':
        setIsFavorite(!isFavorite)
        // Here you can implement API call to save/remove favorite
        break
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: shopData.name,
            text: `Check out ${shopData.name}`,
            url: window.location.href,
          })
        }
        break
      case 'chat':
        // Implement chat functionality
        console.log('Opening chat...')
        break
      case 'maps':
        if (shopData.latitude && shopData.longitude) {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${shopData.latitude},${shopData.longitude}`
          window.open(mapsUrl, '_blank')
        } else if (shopData.address) {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopData.address)}`
          window.open(mapsUrl, '_blank')
        }
        break
      default:
        break
    }
  }

  const renderTabContent = () => {
    if (!shopData) return null

    const workingHours = parseWorkingHours(shopData.opening_hours)

    switch (activeTab) {
      case 'about':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">About Us</h4>
              <p className="text-gray-600 leading-relaxed">
                {shopData.description || "Welcome to our barbershop! We provide excellent service and quality haircuts."}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
              <div className="space-y-2">
                {shopData.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-3" />
                    <span>{shopData.phone}</span>
                  </div>
                )}
                {shopData.address && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-3" />
                    <span>{shopData.address}</span>
                  </div>
                )}
                {shopData.email && (
                  <div className="flex items-center text-gray-600">
                    <User className="w-4 h-4 mr-3" />
                    <span>{shopData.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      
      case 'service':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Our Services</h4>
            {shopData.services && shopData.services.length > 0 ? (
              shopData.services.map((service, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-900">{service.name}</h5>
                    {service.duration && <p className="text-sm text-gray-600">{service.duration}</p>}
                  </div>
                  {service.price && <span className="font-semibold text-amber-600">{service.price}</span>}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No services information available</p>
              </div>
            )}
          </div>
        )

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">{selectedDate}</h4>
              <span className="text-gray-600">Working Hours</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex justify-between text-base">
                <span className="text-gray-700 font-medium">Monday - Friday</span>
                <span className="text-gray-900 font-semibold">{workingHours.weekdays}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-gray-700 font-medium">Saturday - Sunday</span>
                <span className="text-gray-900 font-semibold">{workingHours.weekends}</span>
              </div>
            </div>
            
            {shopData.time_slots && shopData.time_slots.length > 0 && (
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900">Available Time Slots</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {shopData.time_slots.map((slot, index) => (
                    <button
                      key={index}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        slot.available && !slot.booked
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!slot.available || slot.booked}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Reviews</h4>
              <div className="flex items-center">
                <div className="flex mr-2">
                  {renderStars(shopData.rating || 0)}
                </div>
                <span className="font-semibold">{shopData.rating || 0}</span>
                <span className="text-gray-600 ml-1">
                  ({shopData.review_count || 0} reviews)
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {shopData.reviews && shopData.reviews.length > 0 ? (
                shopData.reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      {review.user_avatar ? (
                        <img
                          src={review.user_avatar}
                          alt={review.user_name}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h6 className="font-medium text-gray-900">{review.user_name}</h6>
                          <span className="text-sm text-gray-500">{review.created_at}</span>
                        </div>
                        <div className="flex mt-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No reviews yet</p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Shop</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // No data state
  if (!shopData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Shop Not Found</h3>
          <p className="text-gray-600">The requested shop could not be found.</p>
        </div>
      </div>
    )
  }

  const distance = calculateDistance()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug Info */}
      {debug && debugInfo && (
        <div className="bg-blue-50 border border-blue-200 p-3 text-xs mb-4">
          <div className="flex items-center gap-1 mb-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Debug Info</span>
          </div>
          <div className="space-y-1 text-blue-700">
            <div><strong>Source:</strong> {debugInfo.source}</div>
            <div><strong>URL:</strong> {debugInfo.url || 'None'}</div>
            <div><strong>Valid:</strong> {debugInfo.valid ? 'Yes' : 'No'}</div>
            {debugInfo.type && <div><strong>Type:</strong> {debugInfo.type}</div>}
            {debugInfo.optimized !== undefined && (
              <div><strong>Optimized:</strong> {debugInfo.optimized ? 'Yes' : 'No'}</div>
            )}
            {debugInfo.error && <div className="text-red-600"><strong>Error:</strong> {debugInfo.error}</div>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button className="p-3 mr-4 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl shadow-lg">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <Image className="w-8 h-8 text-gray-400 mb-2" />
                    <div className="text-gray-400 text-sm">Loading...</div>
                  </div>
                </div>
              )}
              
              {imageError && !imageLoading && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Image className="w-12 h-12 text-gray-400 mb-2" />
                    <div className="text-gray-500 text-sm font-medium">Image Error</div>
                    <div className="text-gray-400 text-xs">Could not load image</div>
                  </div>
                </div>
              )}

              <img 
                src={getImageUrl()} 
                alt={shopData.name} 
                className={`w-full h-full object-cover ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              
              {/* Status Badge */}
              <div className="absolute top-6 left-6">
                {shopData.is_active ? (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    Open Now
                  </span>
                ) : (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    Closed
                  </span>
                )}
              </div>
              
              {/* Distance Badge */}
              {distance && (
                <div className="absolute top-6 right-6">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} away
                  </span>
                </div>
              )}

              <button 
                onClick={() => navigate(`/booking/${shopId}`)}
                className="absolute bottom-6 right-6 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full text-base font-semibold transition-colors shadow-lg"
              >
                Book Now
              </button>
            </div>

            {/* Business Info */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{shopData.name}</h2>
              
              {shopData.owner_name && (
                <div className="flex items-center text-gray-600 mb-4">
                  <User className="w-5 h-5 mr-3" />
                  <span className="text-lg">Owner: {shopData.owner_name}</span>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-3" />
                  <span className="text-lg">{shopData.address}</span>
                </div>
                <div className="flex items-center text-lg font-semibold">
                  <div className="flex mr-2">
                    {renderStars(shopData.rating || 0)}
                  </div>
                  <span>{shopData.rating || 0} ({shopData.review_count || 0} Reviews)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-8 pt-8 border-t border-gray-200">
                <button 
                  onClick={() => handleActionClick('maps')}
                  className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <div className="p-3 rounded-full group-hover:bg-gray-100 transition-colors">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium mt-1">Maps</span>
                </button>
                
                <button 
                  onClick={() => handleActionClick('chat')}
                  className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <div className="p-3 rounded-full group-hover:bg-gray-100 transition-colors">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium mt-1">Chat</span>
                </button>
                
                <button 
                  onClick={() => handleActionClick('share')}
                  className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  <div className="p-3 rounded-full group-hover:bg-gray-100 transition-colors">
                    <Share className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-medium mt-1">Share</span>
                </button>
                
                {/* <button 
                  onClick={() => handleActionClick('favorite')}
                  className={`flex flex-col items-center transition-colors group ${
                    isFavorite ? 'text-red-500' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="p-3 rounded-full group-hover:bg-gray-100 transition-colors">
                    <Heart className={`w-7 h-7 ${isFavorite ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-sm font-medium mt-1">Favorite</span>
                </button> */}
              </div>
            </div>

            {/* Tabs Content */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex flex-wrap gap-3 mb-8">
                {['about', 'service', 'schedule', 'review'].map((tab) => (
                  <button
                    key={tab}
                    className={`px-6 py-3 rounded-full text-base font-medium transition-colors capitalize ${
                      activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {renderTabContent()}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
              
              {/* {shopData.phone && (
                <button 
                  onClick={() => handleActionClick('phone')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 px-4 rounded-lg font-semibold mb-4 transition-colors flex items-center justify-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Now
                </button>
              )} */}
              
                <button 
                  onClick={() => navigate(`/booking/${shopId}`)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold mb-6 transition-colors"
                >
                  Book Appointment
                </button>

              {/* Business Hours */}
              {/* <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Business Hours
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mon - Fri</span>
                    <span className="text-gray-900">{parseWorkingHours(shopData.opening_hours).weekdays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sat - Sun</span>
                    <span className="text-gray-900">{parseWorkingHours(shopData.opening_hours).weekends}</span>
                  </div>
                </div>
              </div> */}

              {/* Location */}
              {shopData.address && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location
                  </h4>
                  <p className="text-gray-600 text-sm mb-4">{shopData.address}</p>
                  <button 
                    onClick={() => handleActionClick('maps')}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                 >
                   <ExternalLink className="w-4 h-4 mr-2" />
                   View on Maps
                 </button>
               </div>
             )}

             {/* Rating Summary */}
             {shopData.rating && (
               <div className="border-t border-gray-200 pt-6 mt-6">
                 <h4 className="font-semibold text-gray-900 mb-4">Rating</h4>
                 <div className="flex items-center mb-2">
                   <div className="flex mr-3">
                     {renderStars(shopData.rating)}
                   </div>
                   <span className="text-2xl font-bold text-gray-900">{shopData.rating}</span>
                 </div>
                 <p className="text-gray-600 text-sm">Based on {shopData.review_count || 0} reviews</p>
               </div>
             )}

             {/* Additional Info */}
             {shopData.specialties && shopData.specialties.length > 0 && (
               <div className="border-t border-gray-200 pt-6 mt-6">
                 <h4 className="font-semibold text-gray-900 mb-4">Specialties</h4>
                 <div className="flex flex-wrap gap-2">
                   {shopData.specialties.map((specialty, index) => (
                     <span 
                       key={index}
                       className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium"
                     >
                       {specialty}
                     </span>
                   ))}
                 </div>
               </div>
             )}

             {/* Payment Methods */}
             {shopData.payment_methods && shopData.payment_methods.length > 0 && (
               <div className="border-t border-gray-200 pt-6 mt-6">
                 <h4 className="font-semibold text-gray-900 mb-4">Payment Methods</h4>
                 <div className="space-y-2">
                   {shopData.payment_methods.map((method, index) => (
                     <div key={index} className="flex items-center text-gray-600 text-sm">
                       <Check className="w-4 h-4 mr-2 text-green-500" />
                       {method}
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   </div>
 )
}

export default BarberDetails