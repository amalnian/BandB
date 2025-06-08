import ShopCard from "./components/ShopCard"
import Header from "./components/Header"
import Sidebar from "./components/sidebar"
import { useEffect, useState } from "react"
import { getShops, getNearbyShops, updateUserLocation } from "@/endpoints/APIs"

export default function Home() {
  // State management
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [searchRadius, setSearchRadius] = useState(10) // 10km default radius
  const [locationUpdated, setLocationUpdated] = useState(false)
  const [debugInfo, setDebugInfo] = useState([]) // For debugging

  // Helper function to add debug info
  const addDebugInfo = (message) => {
    console.log(message)
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Fetch shops data on component mount
  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoading(true)
        setError(null)
        addDebugInfo("Starting to fetch shops...")

        // Try to get user's location first
        if (navigator.geolocation) {
          addDebugInfo("Requesting geolocation...")
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
              setUserLocation(location)
              addDebugInfo(`Got user location: ${location.latitude}, ${location.longitude}`)
              
              try {
                // Update user location in backend
                addDebugInfo("Updating user location in backend...")
                const updateResponse = await updateUserLocation(location)
                addDebugInfo(`Location update response: ${JSON.stringify(updateResponse.data)}`)
                setLocationUpdated(true)
                
                // Fetch nearby shops based on user location
                addDebugInfo(`Fetching nearby shops within ${searchRadius}km...`)
                const response = await getNearbyShops({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  radius: searchRadius
                })
                
                addDebugInfo(`Nearby shops API response: ${JSON.stringify(response.data)}`)
                
                if (response.data && response.data.success) {
                  setShops(response.data.shops || [])
                  addDebugInfo(`Found ${response.data.shops?.length || 0} nearby shops`)
                } else {
                  throw new Error(response.data?.error || 'Failed to fetch nearby shops')
                }
              } catch (locationError) {
                addDebugInfo(`Nearby shops fetch failed: ${locationError.message}`)
                console.log("Nearby shops fetch failed, fetching all shops:", locationError)
                
                // Fallback to all shops if nearby fetch fails
                try {
                  addDebugInfo("Falling back to all shops...")
                  const allShopsResponse = await getShops()
                  if (allShopsResponse.data && allShopsResponse.data.success) {
                    setShops(allShopsResponse.data.shops || [])
                    addDebugInfo(`Loaded ${allShopsResponse.data.shops?.length || 0} shops as fallback`)
                  } else {
                    throw new Error('Failed to fetch shops')
                  }
                } catch (fallbackError) {
                  addDebugInfo(`Fallback also failed: ${fallbackError.message}`)
                  throw fallbackError
                }
              }
            },
            async (locationError) => {
              const errorMsg = `Geolocation failed: ${locationError.message} (Code: ${locationError.code})`
              addDebugInfo(errorMsg)
              console.log("Geolocation failed, fetching all shops:", locationError)
              
              // Fallback to all shops if location access is denied
              try {
                addDebugInfo("Fetching all shops (no location)...")
                const response = await getShops()
                if (response.data && response.data.success) {
                  setShops(response.data.shops || [])
                  addDebugInfo(`Loaded ${response.data.shops?.length || 0} shops without location`)
                } else {
                  throw new Error('Failed to fetch shops')
                }
              } catch (apiError) {
                addDebugInfo(`All shops fetch failed: ${apiError.message}`)
                console.error("Failed to fetch shops:", apiError)
                setError("Failed to load shops. Please try again later.")
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 15000, // Increased timeout
              maximumAge: 300000 // 5 minutes
            }
          )
        } else {
          addDebugInfo("No geolocation support, fetching all shops...")
          // No geolocation support, fetch all shops
          const response = await getShops()
          if (response.data && response.data.success) {
            setShops(response.data.shops || [])
            addDebugInfo(`Loaded ${response.data.shops?.length || 0} shops (no geolocation support)`)
          } else {
            throw new Error('Failed to fetch shops')
          }
        }
      } catch (err) {
        const errorMsg = `Error fetching shops: ${err.message}`
        addDebugInfo(errorMsg)
        console.error("Error fetching shops:", err)
        setError("Failed to load shops. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [searchRadius]) // Removed locationUpdated dependency to prevent infinite loops

  // Function to retry fetching nearby shops
  const handleRetryNearby = async () => {
    if (!userLocation) {
      handleRetry()
      return
    }

    try {
      setLoading(true)
      setError(null)
      addDebugInfo("Retrying nearby shops fetch...")
      
      const response = await getNearbyShops({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: searchRadius
      })
      
      if (response.data && response.data.success) {
        setShops(response.data.shops || [])
        addDebugInfo(`Retry successful: Found ${response.data.shops?.length || 0} nearby shops`)
      } else {
        throw new Error(response.data?.error || 'Failed to fetch nearby shops')
      }
    } catch (err) {
      addDebugInfo(`Retry failed: ${err.message}`)
      console.error("Retry failed:", err)
      setError("Failed to load nearby shops. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Function to retry fetching all shops
  const handleRetry = async () => {
    try {
      setLoading(true)
      setError(null)
      addDebugInfo("Retrying all shops fetch...")
      
      const response = await getShops()
      if (response.data && response.data.success) {
        setShops(response.data.shops || [])
        addDebugInfo(`Retry successful: Found ${response.data.shops?.length || 0} shops`)
      } else {
        throw new Error('Failed to fetch shops')
      }
    } catch (err) {
      addDebugInfo(`Retry failed: ${err.message}`)
      console.error("Retry failed:", err)
      setError("Failed to load shops. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Function to manually refresh location and nearby shops
  const refreshLocation = () => {
    setLocationUpdated(false)
    setUserLocation(null)
    // This will trigger the useEffect to run again
    window.location.reload()
  }

  // Calculate distance for display (if user location is available)
  const calculateDistance = (shopLat, shopLng) => {
    if (!userLocation || !shopLat || !shopLng) return null
    
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (shopLat - userLocation.latitude) * Math.PI / 180
    const dLon = (shopLng - userLocation.longitude) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(shopLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in kilometers
    
    return distance
  }

  // Transform API data to match your component structure
  const transformShopData = (apiShops) => {
    if (!Array.isArray(apiShops)) {
      addDebugInfo(`Warning: apiShops is not an array: ${typeof apiShops}`)
      return []
    }

    return apiShops.map(shop => {
      // Calculate distance if not provided by API
      let distance = shop.distance
      if (!distance && userLocation && shop.latitude && shop.longitude) {
        distance = calculateDistance(shop.latitude, shop.longitude)
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
        // Additional data that might be useful
        phone: shop.phone,
        description: shop.description,
        owner_name: shop.owner_name,
        opening_hours: shop.opening_hours,
        isActive: shop.is_active !== false, // Default to true if not specified
        distance: distance,
        latitude: shop.latitude,
        longitude: shop.longitude
      }
    })
  }

  const transformedShops = transformShopData(shops)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - visible on desktop, hidden on mobile */}
      {/* <Sidebar /> */}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Debug Panel - Remove in production */}
        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">Debug Info:</p>
                <div className="mt-2 text-sm text-yellow-700">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-xs">{info}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero section */}
          <section className="bg-gradient-to-r from-amber-400 to-amber-500 relative">
            <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 z-10">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                  Find the Best
                  <br />
                  Shops Near You!
                </h1>
                <button 
                  className="mt-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-md transition"
                  onClick={refreshLocation}
                >
                  {userLocation ? 'Refresh Location' : 'Find Now !'}
                </button>
              </div>
              <div className="md:w-1/2 mt-8 md:mt-0 relative">
                <div
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-20"
                  style={{ backgroundImage: "url('/placeholder.svg?height=400&width=400')" }}
                ></div>
              </div>
            </div>
          </section>

          {/* Shops section */}
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">
                  {userLocation ? `Popular Shops Near You! (${transformedShops.length} found)` : 'Popular Shops!'}
                </h2>
                
                {/* Location status and controls */}
                <div className="flex items-center space-x-4">
                  {userLocation && (
                    <>
                      <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        📍 Location enabled
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Radius:</label>
                        <select 
                          value={searchRadius} 
                          onChange={(e) => setSearchRadius(Number(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value={1}>1km</option>
                          <option value={5}>5km</option>
                          <option value={10}>10km</option>
                          <option value={20}>20km</option>
                          <option value={50}>50km</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {!userLocation && (
                    <button 
                      onClick={refreshLocation}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                    >
                      Enable Location
                    </button>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                  <span className="ml-3 text-gray-600">
                    {userLocation ? 'Finding nearby shops...' : 'Loading shops...'}
                  </span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-red-600 mb-4">{error}</p>
                    <div className="space-x-2">
                      <button 
                        onClick={userLocation ? handleRetryNearby : handleRetry}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                      >
                        Try Again
                      </button>
                      {userLocation && (
                        <button 
                          onClick={handleRetry}
                          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
                        >
                          Show All Shops
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shops Grid */}
              {!loading && !error && (
                <>
                  {transformedShops.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {transformedShops.map((shop) => (
                        <ShopCard key={shop.id} shop={shop} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
                        <p className="text-gray-600 mb-4">
                          {userLocation 
                            ? `We couldn't find any shops within ${searchRadius}km of your location. Try increasing the search radius or check if there are approved shops in your area.`
                            : "No shops are currently available. Please check back later."
                          }
                        </p>
                        <div className="space-x-2">
                          {userLocation && (
                            <button 
                              onClick={() => setSearchRadius(50)}
                              className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition"
                            >
                              Expand Search Area
                            </button>
                          )}
                          <button 
                            onClick={handleRetry}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
                          >
                            Show All Shops
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}