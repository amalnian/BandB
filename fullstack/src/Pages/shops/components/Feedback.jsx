import React, { useState, useEffect } from 'react';
import { Star, User, Calendar, Clock, MessageSquare } from 'lucide-react';
import { getShopFeedback } from '@/endpoints/ShopAPI'; // Adjust the import path as needed

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [averages, setAverages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const getUserId = () => {
          try {
            const userData = localStorage.getItem("shop_data");
            if (userData) {
              const parsedData = JSON.parse(userData);
              return parsedData.id;
            }
          } catch (error) {
            console.error("Error parsing shop data from localStorage:", error);
          }
          return null;
        };

        const currentShopId = getUserId();
        
        // Check if shopId is available
        if (!currentShopId) {
          console.log('ShopId not available yet:', currentShopId);
          setLoading(false);
          return;
        }
        
        console.log('Fetching feedbacks for shop:', currentShopId);
        const response = await getShopFeedback(currentShopId);
        setFeedbacks(response.data.feedbacks);
        setAverages(response.data.averages);
        setCount(response.data.count);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch feedback data');
        console.error('Error fetching feedbacks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []); // Remove shopId dependency since we're getting it from localStorage

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedbacks</h3>
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading feedbacks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedbacks</h3>
        <div className="text-center py-10">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              const fetchFeedbacks = async () => {
                try {
                  setLoading(true);
                  const getUserId = () => {
                    try {
                      const userData = localStorage.getItem("shop_data");
                      if (userData) {
                        const parsedData = JSON.parse(userData);
                        return parsedData.id;
                      }
                    } catch (error) {
                      console.error("Error parsing shop data from localStorage:", error);
                    }
                    return null;
                  };
                  const currentShopId = getUserId();
                  const response = await getShopFeedback(currentShopId);
                  setFeedbacks(response.data.feedbacks);
                  setAverages(response.data.averages);
                  setCount(response.data.count);
                } catch (err) {
                  setError(err.response?.data?.error || 'Failed to fetch feedback data');
                }
                setLoading(false);
              };
              fetchFeedbacks();
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          Customer Feedbacks ({count})
        </h3>
      </div>

      {/* Average Ratings Summary */}
      {count > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-800 mb-3">Average Ratings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall:</span>
              {renderStars(Math.round(averages.avg_overall || 0))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Service:</span>
              {renderStars(Math.round(averages.avg_service || 0))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Staff:</span>
              {renderStars(Math.round(averages.avg_staff || 0))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cleanliness:</span>
              {renderStars(Math.round(averages.avg_cleanliness || 0))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Value:</span>
              {renderStars(Math.round(averages.avg_value || 0))}
            </div>
          </div>
        </div>
      )}

      {/* Show message when shopId is not available */}
      {!localStorage.getItem("shop_data") && !loading ? (
        <div className="text-center py-10">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Waiting for shop information...</p>
          <p className="text-sm text-gray-400 mt-1">
            Please make sure you're logged in as a shop owner.
          </p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No feedback available yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Feedback will appear here once customers leave reviews.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800">{feedback.user_name}</h5>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(feedback.booking_date)}
                      <Clock className="w-3 h-3 ml-2 mr-1" />
                      {formatTime(feedback.booking_time)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {renderStars(feedback.rating)}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(feedback.created_at)}
                  </p>
                </div>
              </div>

              {feedback.feedback_text && (
                <p className="text-gray-700 mb-3">{feedback.feedback_text}</p>
              )}

              {/* Detailed Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {feedback.service_quality && (
                  <div>
                    <span className="text-gray-600 block">Service Quality</span>
                    {renderStars(feedback.service_quality)}
                  </div>
                )}
                {feedback.staff_behavior && (
                  <div>
                    <span className="text-gray-600 block">Staff Behavior</span>
                    {renderStars(feedback.staff_behavior)}
                  </div>
                )}
                {feedback.cleanliness && (
                  <div>
                    <span className="text-gray-600 block">Cleanliness</span>
                    {renderStars(feedback.cleanliness)}
                  </div>
                )}
                {feedback.value_for_money && (
                  <div>
                    <span className="text-gray-600 block">Value for Money</span>
                    {renderStars(feedback.value_for_money)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feedback;