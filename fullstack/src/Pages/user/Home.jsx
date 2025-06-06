import BarberCard from "./components/BarberCard"
import Header from "./components/Header"
import Sidebar from "./components/sidebar"
import { useEffect, useState } from "react"
import { getBarbers, getNearbyBarbers } from "@/endpoints/APIs" // Import your API functions

export default function Home() {
  // State management
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [searchRadius, setSearchRadius] = useState(10) // 10km default radius

  // Fetch barbers data on component mount
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to get user's location first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
              setUserLocation(location)
              
              try {
                // Fetch nearby barbers based on user location
                const response = await getNearbyBarbers({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  radius: searchRadius
                })
                setBarbers(response.data)
              } catch (locationError) {
                console.log("Nearby barbers fetch failed, fetching all barbers:", locationError)
                // Fallback to all barbers if nearby fetch fails
                const allBarbersResponse = await getBarbers()
                setBarbers(allBarbersResponse.data)
              }
            },
            async (locationError) => {
              console.log("Geolocation failed, fetching all barbers:", locationError)
              // Fallback to all barbers if location access is denied
              try {
                const response = await getBarbers()
                setBarbers(response.data)
              } catch (apiError) {
                console.error("Failed to fetch barbers:", apiError)
                setError("Failed to load barbers. Please try again later.")
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            }
          )
        } else {
          // No geolocation support, fetch all barbers
          const response = await getBarbers()
          setBarbers(response.data)
        }
      } catch (err) {
        console.error("Error fetching barbers:", err)
        setError("Failed to load barbers. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchBarbers()
  }, [searchRadius])

  // Function to retry fetching data
  const handleRetry = () => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getBarbers()
        setBarbers(response.data)
      } catch (err) {
        console.error("Retry failed:", err)
        setError("Failed to load barbers. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }

  // Calculate distance for display (if user location is available)
  const calculateDistance = (barberLat, barberLng) => {
    if (!userLocation) return null
    
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (barberLat - userLocation.latitude) * Math.PI / 180
    const dLon = (barberLng - userLocation.longitude) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(barberLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in kilometers
    
    return distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`
  }

  // Transform API data to match your component structure
  const transformBarberData = (apiBarbers) => {
    return apiBarbers.map(barber => ({
      id: barber.id,
      name: barber.name || barber.owner_name || "Unknown Barber",
      location: userLocation && barber.latitude && barber.longitude 
        ? calculateDistance(barber.latitude, barber.longitude)
        : barber.address || "Location not available",
      rating: barber.average_rating || barber.rating || 4.0,
      reviews: barber.total_reviews || barber.review_count || 0,
      price: barber.price_range || "$20-50",
      image: barber.images && barber.images.length > 0 
        ? barber.images.find(img => img.is_primary)?.image_url || barber.images[0].image_url
        : "/placeholder.svg?height=300&width=300",
      // Additional data that might be useful
      phone: barber.phone,
      description: barber.description,
      isOpen: barber.is_open || true,
      businessHours: barber.business_hours || []
    }))
  }

  const transformedBarbers = transformBarberData(barbers)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - visible on desktop, hidden on mobile */}
      {/* <Sidebar /> */}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero section */}
          <section className="bg-gradient-to-r from-amber-400 to-amber-500 relative">
            <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 z-10">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                  Find the Best
                  <br />
                  Barbers Near You!
                </h1>
                <button className="mt-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-md transition">
                  Find Now !
                </button>
              </div>
              <div className="md:w-1/2 mt-8 md:mt-0 relative">
                <div
                  className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-20"
                  style={{ backgroundImage: "url('/placeholder.svg?height=400&width=400')" }}
                ></div>
                {/* <img
                  src="/placeholder.svg?height=500&width=400"
                  alt="Barber with phone"
                  className="relative z-10 w-full max-w-md mx-auto"
                /> */}
              </div>
            </div>
          </section>

          {/* Barbers section */}
          <section className="py-12 px-4">
            <div className="container mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">
                  {userLocation ? 'Popular Barbers Near You!' : 'Popular Barbers!'}
                </h2>
                
                {/* Optional: Add search radius selector if user location is available */}
                {userLocation && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Radius:</label>
                    <select 
                      value={searchRadius} 
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={5}>5km</option>
                      <option value={10}>10km</option>
                      <option value={20}>20km</option>
                      <option value={50}>50km</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                  <span className="ml-3 text-gray-600">Loading barbers...</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button 
                      onClick={handleRetry}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Barbers Grid */}
              {!loading && !error && (
                <>
                  {transformedBarbers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {transformedBarbers.map((barber) => (
                        <BarberCard key={barber.id} barber={barber} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No barbers found</h3>
                        <p className="text-gray-600 mb-4">
                          {userLocation 
                            ? `We couldn't find any barbers within ${searchRadius}km of your location. Try increasing the search radius.`
                            : "No barbers are currently available. Please check back later."
                          }
                        </p>
                        {userLocation && (
                          <button 
                            onClick={() => setSearchRadius(50)}
                            className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition"
                          >
                            Expand Search Area
                          </button>
                        )}
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