import ShopCard from "./ShopCard"

export default function ShopsGrid({ 
  shops, 
  userLocation, 
  searchRadius, 
  onExpandSearch, 
  onShowAll 
}) {
  if (shops.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {shops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    )
  }

  return (
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
              onClick={onExpandSearch}
              className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition"
            >
              Expand Search Area
            </button>
          )}
          <button 
            onClick={onShowAll}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
          >
            Show All Shops
          </button>
        </div>
      </div>
    </div>
  )
}