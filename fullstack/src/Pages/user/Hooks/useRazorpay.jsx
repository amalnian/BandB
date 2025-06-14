// hooks/useRazorpay.js
import { useState } from 'react'
import { createRazorpayOrder, verifyRazorpayPayment, handlePaymentFailure } from '@/endpoints/APIs'

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false)
  
  // Function to load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Razorpay) {
        resolve(true)
        return
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (existingScript) {
        existingScript.onload = () => resolve(true)
        existingScript.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
        return
      }

      // Create and load script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        console.log('Razorpay SDK loaded successfully')
        resolve(true)
      }
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK')
        reject(new Error('Failed to load Razorpay SDK'))
      }
      
      document.head.appendChild(script)
    })
  }
  
  const initiatePayment = async (paymentData, onSuccess, onFailure) => {
    try {
      setIsLoading(true)
      
      console.log('Creating Razorpay order with data:', paymentData)
      
      // Create Razorpay order
      const orderResponse = await createRazorpayOrder({
        amount: paymentData.amount
      })
      
      console.log('Order response:', orderResponse)
      
      if (!orderResponse.data.success) {
        throw new Error('Failed to create order')
      }
      
      const { order_id, amount, currency, key_id } = orderResponse.data.data
      
      // Load Razorpay script if not already loaded
      await loadRazorpayScript()
      
      // Double check if Razorpay is now available
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection and try again.')
      }
      
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: paymentData.businessName || 'Your Business',
        description: paymentData.description || 'Service Booking Payment',
        order_id: order_id,
        handler: async function (response) {
        try {
            console.log('Payment successful - Raw response:', response)
            
            // Log all the response fields to debug
            console.log('Payment ID:', response.razorpay_payment_id)
            console.log('Order ID:', response.razorpay_order_id)
            console.log('Signature:', response.razorpay_signature)
            
            const verificationData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            // Add booking data if needed for creating the booking
            booking_data: paymentData.bookingData || {}
            }
            
            console.log('Sending verification data:', verificationData)
            
            const verificationResponse = await verifyRazorpayPayment(verificationData)
            
            console.log('Verification response:', verificationResponse)
            
            if (verificationResponse.data.success) {
            console.log('Payment verified successfully')
            // Pass both payment response and booking data to success callback
            onSuccess({
                ...response,
                booking_data: verificationResponse.data.data
            })
            } else {
            console.error('Payment verification failed:', verificationResponse.data)
            throw new Error(verificationResponse.data.error || 'Payment verification failed')
            }
        } catch (verifyError) {
            console.error('Payment verification error:', verifyError)
            console.error('Error response:', verifyError.response?.data)
            console.error('Error status:', verifyError.response?.status)
            
            // Show more detailed error information
            const errorMessage = verifyError.response?.data?.error || 
                            verifyError.response?.data?.message || 
                            verifyError.message || 
                            'Payment verification failed'
            
            onFailure(new Error(errorMessage))
        } finally {
            setIsLoading(false)
        }
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed')
            setIsLoading(false)
            onFailure(new Error('Payment cancelled by user'))
          }
        },
        prefill: {
          name: paymentData.customerName || '',
          email: paymentData.customerEmail || '',
          contact: paymentData.customerPhone || ''
        },
        notes: {
          booking_id: paymentData.bookingId || '',
          service_id: paymentData.serviceId || ''
        },
        theme: {
          color: paymentData.themeColor || '#3399cc'
        }
      }
      
      const rzp = new window.Razorpay(options)
      
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error)
        handlePaymentFailure({
          payment_id: response.error.metadata?.payment_id,
          order_id: response.error.metadata?.order_id,
          error_code: response.error.code,
          error_description: response.error.description
        })
        onFailure(new Error(response.error.description || 'Payment failed'))
        setIsLoading(false)
      })
      
      rzp.open()
      
    } catch (error) {
      console.error('Payment initiation error:', error)
      console.error('Error details:', error.response?.data)
      onFailure(error)
      setIsLoading(false)
    }
  }
  
  return {
    initiatePayment,
    isLoading
  }
}