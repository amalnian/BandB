import ShopCard from "./components/ShopCard"
import Header from "./components/Header"
import LocationControls from "./components/LocationControls"
import ShopsGrid from "./components/ShopsGrid"
import LoadingSpinner from "./components/LoadingSpinner"
import ErrorMessage from "./components/ErrorMessage"
import { useEffect, useState, useCallback } from "react"
import { useGeolocation } from "./Hooks/UseGeolocation"
import { useShops } from "./Hooks/UseShops"
import { transformShopData } from "./utils/ShopUtil"

export default function Home() {
  const [searchRadius, setSearchRadius] = useState(10)
  const [isInitialized, setIsInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState("") // Add search query state
  
  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
    clearLocation
  } = useGeolocation()

  const {
    shops,
    loading: shopsLoading,
    error: shopsError,
    fetchAllShops,
    fetchNearbyShops,
    retryFetch,
    setError: setShopsError
  } = useShops()

  // Handle search from Header component
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
  }, [])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // Initialize app - try to get location and fetch shops
 const initializeApp = useCallback(async () => {
  if (isInitialized) return
  
  setIsInitialized(true)
  
  try {
    // First, try to fetch nearby shops using stored coordinates from DB
    await fetchNearbyShops(null, searchRadius)
  } catch (err) {
    console.log('Failed to load nearby shops with stored location:', err)
    
    // Check if the error indicates we need to fallback to all shops
    if (err.message.includes('No location available') || err.message.includes('fallback_needed')) {
      try {
        await fetchAllShops()
      } catch (shopsErr) {
        console.error('Failed to load all shops:', shopsErr)
      }
    }
  }
}, [isInitialized, fetchNearbyShops, fetchAllShops, searchRadius])

  // Handle radius change - only refetch if we have location
const handleRadiusChange = useCallback(async (newRadius) => {
  setSearchRadius(newRadius)
  
  // Don't pass userLocation, let it use stored coordinates
  try {
    await fetchNearbyShops(null, newRadius)
  } catch (err) {
    console.error('Failed to fetch shops with new radius:', err)
  }
}, [fetchNearbyShops])

  // Refresh location and fetch nearby shops
  const refreshLocation = useCallback(async () => {
    setShopsError(null)
    
    try {
      const location = await getCurrentLocation()
      await fetchNearbyShops(location, searchRadius)
    } catch (err) {
      console.error('Failed to refresh location:', err)
    }
  }, [getCurrentLocation, fetchNearbyShops, searchRadius, setShopsError])

  // Enable location for the first time
  const enableLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation()
      await fetchNearbyShops(location, searchRadius)
    } catch (err) {
      console.error('Failed to enable location:', err)
    }
  }, [getCurrentLocation, fetchNearbyShops, searchRadius])

  // Retry with current settings
  const handleRetry = useCallback(async () => {
    try {
      await retryFetch(userLocation, searchRadius)
    } catch (err) {
      console.error('Retry failed:', err)
    }
  }, [retryFetch, userLocation, searchRadius])

  // Show all shops (fallback)
  const showAllShops = useCallback(async () => {
    try {
      await fetchAllShops()
    } catch (err) {
      console.error('Failed to fetch all shops:', err)
    }
  }, [fetchAllShops])

  // Initialize on mount
  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  // Transform shop data for display
  const transformedShops = transformShopData(shops, userLocation)
  
  // Determine loading state
  const isLoading = locationLoading || shopsLoading
  
  // Determine error state
  const hasError = shopsError && !isLoading

  // Get search results count for display
  const getResultsCount = () => {
    if (!searchQuery.trim()) return transformedShops.length
    
    const query = searchQuery.toLowerCase().trim()
    return transformedShops.filter(shop => {
      return (shop.name && shop.name.toLowerCase().includes(query)) ||
             (shop.owner_name && shop.owner_name.toLowerCase().includes(query)) ||
             (shop.address && shop.address.toLowerCase().includes(query)) ||
             (shop.description && shop.description.toLowerCase().includes(query)) ||
             (shop.category && shop.category.toLowerCase().includes(query))
    }).length
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search functionality */}
        <Header 
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onClearSearch={handleClearSearch}
        />

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
                  className="mt-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-md transition disabled:opacity-50"
                  onClick={userLocation ? refreshLocation : enableLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? 'Getting Location...' : 
                   userLocation ? 'Refresh Location' : 'Find Now !'}
                </button>
                
                {locationError && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                    {locationError}
                  </p>
                )}
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
                  {searchQuery ? (
                    `Search Results (${getResultsCount()} found)`
                  ) : userLocation ? (
                    `Popular Shops Near You! (${transformedShops.length} found)`
                  ) : (
                    'Popular Shops!'
                  )}
                </h2>
                
                {/* Location Controls - hide when searching */}
                {!searchQuery && (
                  <LocationControls
                    userLocation={userLocation}
                    searchRadius={searchRadius}
                    onRadiusChange={handleRadiusChange}
                    onEnableLocation={enableLocation}
                    locationLoading={locationLoading}
                  />
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <LoadingSpinner 
                  message={userLocation ? 'Finding nearby shops...' : 'Loading shops...'}
                />
              )}

              {/* Error State */}
              {hasError && (
                <ErrorMessage
                  error={shopsError}
                  onRetry={handleRetry}
                  onShowAll={showAllShops}
                  hasLocation={!!userLocation}
                />
              )}

              {/* Shops Grid with search functionality */}
              {!isLoading && !hasError && (
                <ShopsGrid
                  shops={transformedShops}
                  userLocation={userLocation}
                  searchRadius={searchRadius}
                  searchQuery={searchQuery}
                  onExpandSearch={() => handleRadiusChange(50)}
                  onShowAll={() => {
                    handleClearSearch()
                    showAllShops()
                  }}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}