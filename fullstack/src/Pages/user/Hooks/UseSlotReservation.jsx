import { useState, useEffect, useCallback, useRef } from 'react'
import { reserveSlot, releaseSlot } from '@/endpoints/APIs'
import { toast } from 'react-hot-toast'

export const useSlotReservation = (shopId) => {
  const [currentReservation, setCurrentReservation] = useState(null)
  const [reservationTimer, setReservationTimer] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  
  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])
  
  // Release reservation when component unmounts or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentReservation) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon('slots/release/', JSON.stringify({
          reservation_id: currentReservation.reservation_id
        }))
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (currentReservation) {
        releaseCurrentReservation()
      }
    }
  }, [currentReservation])
  
  const startCountdown = useCallback((expiresAt) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      
      setTimeRemaining(remaining)
      
      if (remaining <= 0) {
        clearInterval(countdownRef.current)
        setCurrentReservation(null)
        toast.error('Slot reservation expired. Please select again.')
      }
    }
    
    updateCountdown() // Initial call
    countdownRef.current = setInterval(updateCountdown, 1000)
  }, [])
  
  const reserveTimeSlot = useCallback(async (appointmentDate, appointmentTime, slotsNeeded = 1) => {
    try {
      // Release any existing reservation first
      if (currentReservation) {
        await releaseCurrentReservation()
      }
      
      const reservationData = {
        shop: shopId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        slots_needed: slotsNeeded
      }
      
      const response = await reserveSlot(reservationData)
      
      if (response.success) {
        const reservation = {
          reservation_id: response.data.reservation_id,
          expires_at: response.data.expires_at,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          slots_needed: slotsNeeded
        }
        
        setCurrentReservation(reservation)
        startCountdown(response.data.expires_at)
        
        // Auto-release after 10 minutes
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
        
        timerRef.current = setTimeout(() => {
          setCurrentReservation(null)
          setTimeRemaining(0)
          toast.error('Slot reservation expired')
        }, 10 * 60 * 1000) // 10 minutes
        
        toast.success('Slot reserved for 10 minutes', {
          duration: 3000,
          icon: '⏰'
        })
        
        return reservation
      } else {
        toast.error(response.error || 'Failed to reserve slot')
        return null
      }
    } catch (error) {
      console.error('Error reserving slot:', error)
      toast.error('Failed to reserve slot. Please try again.')
      return null
    }
  }, [shopId, currentReservation, startCountdown])
  
  const releaseCurrentReservation = useCallback(async () => {
    if (!currentReservation) return
    
    try {
      await releaseSlot({
        reservation_id: currentReservation.reservation_id
      })
      
      setCurrentReservation(null)
      setTimeRemaining(0)
      
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      
    } catch (error) {
      console.error('Error releasing reservation:', error)
      // Don't show error toast as this might be called during cleanup
    }
  }, [currentReservation])
  
  const extendReservation = useCallback(async () => {
    if (!currentReservation) return false
    
    try {
      // Reserve the same slot again to extend the timer
      const newReservation = await reserveTimeSlot(
        currentReservation.appointment_date,
        currentReservation.appointment_time,
        currentReservation.slots_needed
      )
      
      if (newReservation) {
        toast.success('Reservation extended for another 10 minutes')
        return true
      }
      return false
    } catch (error) {
      console.error('Error extending reservation:', error)
      toast.error('Failed to extend reservation')
      return false
    }
  }, [currentReservation, reserveTimeSlot])
  
  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining <= 0) return '00:00'
    
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [timeRemaining])
  
  return {
    currentReservation,
    timeRemaining,
    reserveTimeSlot,
    releaseCurrentReservation,
    extendReservation,
    formatTimeRemaining,
    isSlotReserved: !!currentReservation
  }
}