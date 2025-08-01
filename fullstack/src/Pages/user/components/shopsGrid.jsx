import ShopCard from "./ShopCard"
import { useMemo } from "react"

export default function ShopsGrid({ 
  shops, 
  userLocation, 
  searchRadius, 
  searchQuery = "",
  onExpandSearch, 
  onShowAll 
}) {

  const filteredShops = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return shops
    }

    const query = searchQuery.toLowerCase().trim()
    const searchTerms = query.split(' ').filter(term => term.length > 0)
    
    return shops.filter(shop => {
      return searchTerms.some(term => {
        // Search in shop name (highest priority)
        if (shop.name && shop.name.toLowerCase().includes(term)) {
          return true
        }
        
        // Search in owner name
        if (shop.owner_name && shop.owner_name.toLowerCase().includes(term)) {
          return true
        }
        
        // Search in address
        if (shop.address && shop.address.toLowerCase().includes(term)) {
          return true
        }
        
        // Search in description if available
        if (shop.description && shop.description.toLowerCase().includes(term)) {
          return true
        }
        
        // Search in category if available
        if (shop.category && shop.category.toLowerCase().includes(term)) {
          return true
        }

        // Search in phone number (partial match)
        if (shop.phone && shop.phone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))) {
          return true
        }
        
        return false
      })
    })
  }, [shops, searchQuery])

  // Sort filtered shops - prioritize name matches first
  const sortedShops = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return filteredShops
    }

    const query = searchQuery.toLowerCase().trim()
    
    return [...filteredShops].sort((a, b) => {
      // Prioritize exact name matches
      const aNameMatch = a.name && a.name.toLowerCase().includes(query)
      const bNameMatch = b.name && b.name.toLowerCase().includes(query)
      
      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1
      
      // Then prioritize starts with matches
      const aStartsWith = a.name && a.name.toLowerCase().startsWith(query)
      const bStartsWith = b.name && b.name.toLowerCase().startsWith(query)
      
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      // Finally sort by distance if available, or alphabetically
      if (a.distance && b.distance) {
        return a.distance - b.distance
      }
      
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [filteredShops, searchQuery])

  const isSearching = searchQuery && searchQuery.trim().length > 0
  const hasResults = sortedShops.length > 0
  const totalShops = shops.length

  if (hasResults) {
    return (
      <div>
        
        {/* Shops grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedShops.map((shop) => (
            <ShopCard 
              key={shop.id || shop._id || shop.shop_id} 
              shop={shop}
              searchQuery={isSearching ? searchQuery : ""} // Pass search query for highlighting
            />
          ))}
        </div>
        
        {/* Show more results hint */}
        {isSearching && sortedShops.length > 0 && sortedShops.length < 20 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Looking for more results? Try searching with different keywords or 
              <button 
                onClick={onShowAll}
                className="text-amber-600 hover:text-amber-700 underline ml-1"
              >
                browse all shops
              </button>
            </p>
          </div>
        )}
      </div>
    )
  }

  // No results found
  return (
    <div className="text-center py-12">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-lg mx-auto">
        {isSearching ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              No shops found for "{searchQuery}"
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any shops matching your search. Here are some suggestions:
            </p>
            <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
              <ul className="text-sm text-gray-600 text-left space-y-2">
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  Check your spelling and try again
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  Use simpler or different keywords
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  Search by shop owner name or location
                </li>
                <li className="flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  Try searching for shop categories or services
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <button 
                onClick={onShowAll}
                className="w-full bg-amber-500 text-white px-6 py-3 rounded-md hover:bg-amber-600 transition font-medium"
              >
                Show All {totalShops} Shops
              </button>
              <p className="text-xs text-gray-500">
                Clear search to browse all available shops
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">No shops available</h3>
            <p className="text-gray-600 mb-6">
              {userLocation 
                ? `We couldn't find any shops within ${searchRadius}km of your location. Try expanding your search area or check if there are approved shops in your region.`
                : "No shops are currently available in our database. Please check back later or contact support if you think this is an error."
              }
            </p>
            <div className="space-y-2">
              {userLocation && (
                <button 
                  onClick={onExpandSearch}
                  className="w-full bg-amber-500 text-white px-6 py-3 rounded-md hover:bg-amber-600 transition font-medium"
                >
                  Expand Search to 50km
                </button>
              )}
              <button 
                onClick={onShowAll}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition font-medium"
              >
                Load All Available Shops
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}