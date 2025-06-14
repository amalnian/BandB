// components/ErrorMessage.js
export default function ErrorMessage({ error, onRetry, onShowAll, hasLocation }) {
  return (
    <div className="text-center py-12">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <p className="text-red-600 mb-4">{error}</p>
        <div className="space-x-2">
          <button 
            onClick={onRetry}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            Try Again
          </button>
          {hasLocation && (
            <button 
              onClick={onShowAll}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
            >
              Show All Shops
            </button>
          )}
        </div>
      </div>
    </div>
  )
}