// components/LoadingSpinner.js
export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      <span className="ml-3 text-gray-600">{message}</span>
    </div>
  )
}