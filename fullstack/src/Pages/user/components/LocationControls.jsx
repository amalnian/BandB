
// components/LocationControls.js
export default function LocationControls({ 
  userLocation, 
  searchRadius, 
  onRadiusChange, 
  onEnableLocation,
  locationLoading 
}) {
  return (
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
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              disabled={locationLoading}
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
          onClick={onEnableLocation}
          disabled={locationLoading}
          className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {locationLoading ? 'Getting Location...' : 'Enable Location'}
        </button>
      )}
    </div>
  )
}