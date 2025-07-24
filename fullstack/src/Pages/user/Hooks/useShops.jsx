// hooks/useShops.js
import { useState, useCallback } from 'react'
import { getShops, getNearbyShops, updateUserLocation } from '@/endpoints/APIs'

export const useShops = () => {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAllShops = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getShops()
      if (response.data && response.data.success) {
        setShops(response.data.shops || [])
        return response.data.shops || []
      } else {
        throw new Error(response.data?.error || 'Failed to fetch shops')
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

const fetchNearbyShops = useCallback(async (location, radius = 10) => {
  setLoading(true)
  setError(null)
  
  try {
    // Only update user location if a new location is provided
    if (location && location.latitude && location.longitude) {
      await updateUserLocation(location)
    }
    
    const requestParams = { radius: radius }
    
    if (location && location.latitude && location.longitude) {
      requestParams.latitude = location.latitude
      requestParams.longitude = location.longitude
    }
    
    const response = await getNearbyShops(requestParams)
    
    console.log('Nearby shops response:', response.data) // ADD THIS DEBUG LINE
    
    if (response.data && response.data.success) {
      setShops(response.data.shops || [])
      return response.data.shops || []
    } else {
      throw new Error(response.data?.error || 'Failed to fetch nearby shops')
    }
  } catch (err) {
    console.error('fetchNearbyShops error:', err) // ADD THIS DEBUG LINE
    setError(err.message)
    throw err
  } finally {
    setLoading(false)
  }
}, [])

  const retryFetch = useCallback(async (location = null, radius = 10) => {
    try {
      if (location) {
        return await fetchNearbyShops(location, radius)
      } else {
        return await fetchAllShops()
      }
    } catch (err) {
      console.error('Retry failed:', err)
      throw err
    }
  }, [fetchAllShops, fetchNearbyShops])

  return {
    shops,
    loading,
    error,
    fetchAllShops,
    fetchNearbyShops,
    retryFetch,
    setError
  }
}