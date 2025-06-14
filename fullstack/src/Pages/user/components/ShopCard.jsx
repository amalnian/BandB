import { Star, MapPin, Phone, Clock, User, Image, AlertCircle, ExternalLink, Check, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"


export default function ShopCard({ shop, debug = false }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (debug) {
      console.log('🔍 Shop data:', shop)
      console.log('🖼️ Image sources found:', {
        images_array: shop.images,
        direct_image: shop.image,
        image_url: shop.image_url,
        cloudinary_url: shop.images[0]?.image_url
      })
    }
  }, [shop, debug])

  const handleCardClick = () => {
    // Navigate to shop detail page using the shop ID
    const shopId = shop.id || shop._id || shop.shop_id
    if (shopId) {
      navigate(`/shop/${shopId}`)
    } else {
      console.error('Shop ID not found:', shop)
    }
  }

  const handleButtonClick = (e, action) => {
    // Prevent card click when buttons are clicked
    e.stopPropagation()
    
    switch (action) {
      case 'details':
        handleCardClick()
        break
      case 'phone':
        if (shop.phone) {
          window.open(`tel:${shop.phone}`, '_self')
        }
        break
      default:
        break
    }
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

  // Enhanced Cloudinary-aware image URL detection
  const getImageUrl = () => {
    if (imageError) {
      return createPlaceholderDataUrl("Image Error")
    }

    let imageUrl = null
    let source = "none"

    // Check all possible image sources
    const imageSources = [
      { url: shop.cloudinary_url, source: "cloudinary_url" },
      { url: shop.image_url, source: "image_url" },
      { url: shop.image, source: "image" },
      { url: shop.photo, source: "photo" },
      { url: shop.thumbnail, source: "thumbnail" }
    ]

    // Check images array
    if (shop.images && Array.isArray(shop.images) && shop.images.length > 0) {
      const primaryImage = shop.images.find(img => img.is_primary && img.image_url)
      if (primaryImage) {
        imageSources.unshift({ url: primaryImage.image_url, source: "primary_image_array" })
      }
      
      const firstImage = shop.images.find(img => img.image_url)
      if (firstImage && firstImage !== primaryImage) {
        imageSources.unshift({ url: firstImage.image_url, source: "first_image_array" })
      }
    }

    // Find the first valid URL
    for (const { url, source: src } of imageSources) {
      if (url && typeof url === 'string' && url.trim()) {
        imageUrl = url.trim()
        source = src
        break
      }
    }

    if (imageUrl) {
      // Cloudinary URL validation and optimization
      if (imageUrl.includes('cloudinary.com')) {
        // Cloudinary URLs should work as-is, but we can optimize them
        // Example: add quality and format optimizations
        if (!imageUrl.includes('q_auto')) {
          // Add quality auto if not present
          imageUrl = imageUrl.replace('/upload/', '/upload/q_auto,f_auto/')
        }
        
        // Check if it's a valid Cloudinary URL structure
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
        } else {
          console.warn('⚠️ Invalid Cloudinary URL format:', imageUrl)
        }
      }
      
      // For non-Cloudinary URLs, do basic validation
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

    if (debug) {
      setDebugInfo({ url: null, source, valid: false, error: 'No valid image URL found' })
    }

    return createPlaceholderDataUrl("No Image")
  }

  const handleImageError = (e) => {
    const failedUrl = e.target.src
    console.error('🚨 Image failed to load:', {
      shop: shop.name,
      url: failedUrl,
      error: e.type
    })
    
    // Check if it's a Cloudinary URL
    if (failedUrl.includes('cloudinary.com')) {
      console.error('🔍 Cloudinary debugging:', {
        'URL structure': failedUrl.match(/https:\/\/res\.cloudinary\.com\/[^\/]+\/image\/upload\//),
        'Has file extension': /\.(jpg|jpeg|png|gif|webp)$/i.test(failedUrl),
        'Has transformations': failedUrl.includes('q_auto') || failedUrl.includes('f_auto')
      })
    }
    
    if (!imageError) {
      setImageError(true)
      setImageLoading(false)
    }
  }

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', shop.name)
    setImageLoading(false)
    setImageError(false)
  }

  const rating = shop.rating || shop.average_rating || 0
  const reviewsCount = shop.reviews || shop.reviews_count || 0

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      {/* Debug Info */}
      {debug && debugInfo && (
        <div className="bg-blue-50 border border-blue-200 p-3 text-xs">
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

      {/* Shop Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
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
          alt={shop.name || 'Shop image'}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
        
        <div className="absolute top-3 left-3 z-20">
          {shop.is_active !== undefined ? (
            shop.is_active ? (
              <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                Open
              </span>
            ) : (
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                Closed
              </span>
            )
          ) : null}
        </div>

        {shop.distance && (
          <div className="absolute top-3 right-3 z-20">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
              {shop.distance < 1 ? `${Math.round(shop.distance * 1000)}m` : `${shop.distance.toFixed(1)}km`}
            </span>
          </div>
        )}
      </div>

      {/* Shop Information */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">
          {shop.name || 'Shop Name'}
        </h3>

        {shop.owner_name && (
          <div className="flex items-center text-gray-600 mb-2">
            <User className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="text-sm truncate">{shop.owner_name}</span>
          </div>
        )}

        {shop.address && (
          <div className="flex items-center text-gray-600 mb-2">
            <MapPin className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
            <span className="text-sm line-clamp-1">{shop.address}</span>
          </div>
        )}

        {rating > 0 && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="flex mr-2">
                {renderStars(rating)}
              </div>
              <span className="text-sm text-gray-600 font-medium">
                {rating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-md transition-colors duration-200 text-sm font-medium"
            onClick={(e) => handleButtonClick(e, 'details')}
          >
            View Details
          </button>
          
          {shop.phone && (
            <button 
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-md transition-colors duration-200"
              onClick={(e) => handleButtonClick(e, 'phone')}
              title="Call shop"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}