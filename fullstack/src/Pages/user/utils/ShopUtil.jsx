export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  
  return distance
}

export const transformShopData = (apiShops, userLocation = null) => {
  if (!Array.isArray(apiShops)) {
    console.warn('apiShops is not an array:', typeof apiShops)
    return []
  }

  return apiShops.map(shop => {
    // Calculate distance if not provided by API
    let distance = shop.distance
    if (!distance && userLocation && shop.latitude && shop.longitude) {
      distance = calculateDistance(
        userLocation.latitude, 
        userLocation.longitude,
        shop.latitude, 
        shop.longitude
      )
    }

    return {
      id: shop.id,
      name: shop.name || "Unknown Shop",
      location: distance 
        ? (distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`)
        : shop.address || "Location not available",
      rating: shop.average_rating || 4.0,
      reviews: shop.total_reviews || shop.review_count || 0,
      price: shop.price_range || "$20-50",
      image: shop.image_url || "/placeholder.svg?height=300&width=300",
      phone: shop.phone,
      description: shop.description,
      owner_name: shop.owner_name,
      opening_hours: shop.opening_hours,
      isActive: shop.is_active !== false,
      distance: distance,
      latitude: shop.latitude,
      longitude: shop.longitude,
      images: shop.images || []
    }
  })
}