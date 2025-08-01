
// hooks/useGeolocation.js
import { useState, useCallback } from 'react'

export const useGeolocation = () => {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return Promise.reject(new Error('Geolocation not supported'))
    }

    setLoading(true)
    setError(null)

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
          setLocation(newLocation)
          setLoading(false)
          resolve(newLocation)
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          setError(errorMessage)
          setLoading(false)
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setError(null)
  }, [])

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    clearLocation
  }
}