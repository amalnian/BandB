import { Star, MapPin, Phone, Clock, User } from "lucide-react"

export default function ShopCard({ shop }) {
  // Function to render star ratings
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      )
    }

    // Half star
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

    // Empty stars
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      )
    }

    return stars
  }

  // Format opening hours for display
  const formatOpeningHours = (hours) => {
    if (!hours) return "Hours not available"
    if (hours.includes("-")) {
      return hours
    }
    return "Check hours"
  }

  // Handle card click - you can customize this
  const handleCardClick = () => {
    // Navigate to shop details page or open modal
    console.log(`Clicked on shop: ${shop.name}`)
    // You can add navigation logic here
    // For example: router.push(`/shop/${shop.id}`)
  }

  // Handle phone call
  const handleCallClick = (e) => {
    e.stopPropagation()
    if (shop.phone) {
      window.location.href = `tel:${shop.phone}`
    }
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden group"
      onClick={handleCardClick}
    >
      {/* Shop Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = "/placeholder.svg?height=200&width=300"
          }}
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {shop.isActive ? (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Open
            </span>
          ) : (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Closed
            </span>
          )}
        </div>

        {/* Distance Badge */}
        {shop.distance && (
          <div className="absolute top-3 right-3">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {shop.distance < 1 ? `${Math.round(shop.distance * 1000)}m` : `${shop.distance.toFixed(1)}km`}
            </span>
          </div>
        )}
      </div>

      {/* Shop Information */}
      <div className="p-4">
        {/* Shop Name */}
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
          {shop.name}
        </h3>

        {/* Owner Name */}
        {shop.owner_name && (
          <div className="flex items-center text-gray-600 mb-2">
            <User className="w-4 h-4 mr-1" />
            <span className="text-sm">{shop.owner_name}</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-2">
          <MapPin className="w-4 h-4 mr-1 text-gray-500" />
          <span className="text-sm line-clamp-1">{shop.location}</span>
        </div>

        {/* Opening Hours */}
        {shop.opening_hours && (
          <div className="flex items-center text-gray-600 mb-2">
            <Clock className="w-4 h-4 mr-1 text-gray-500" />
            <span className="text-sm">{formatOpeningHours(shop.opening_hours)}</span>
          </div>
        )}

        {/* Rating and Reviews */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="flex mr-2">
              {renderStars(shop.rating)}
            </div>
            <span className="text-sm text-gray-600">
              {shop.rating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ({shop.reviews} reviews)
          </span>
        </div>

        {/* Description */}
        {shop.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {shop.description}
          </p>
        )}

        {/* Price Range */}
        {shop.price && (
          <div className="mb-3">
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-medium">
              {shop.price}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-md transition-colors duration-200 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
          >
            View Details
          </button>
          
          {shop.phone && (
            <button 
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-md transition-colors duration-200"
              onClick={handleCallClick}
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