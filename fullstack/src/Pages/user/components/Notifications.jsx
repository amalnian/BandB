import React, { useEffect, useRef, useState } from 'react';
import { getSocket, testConnection } from '@/service/webSocket';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { MessageSquareText, Navigation } from 'lucide-react';

function Notification() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const navigate = useNavigate();
  
  const getUserId = () => {
    try {
      const userData = localStorage.getItem("user_data");
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.id;
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
    }
    return null;
  };

  const getUserRole = () => {
    try {
      const userData = localStorage.getItem("user_data");
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.role;
      }
    } catch (error) {
      console.error("Error parsing user role from localStorage:", error);
    }
    return null;
  };

  const actualUserId = getUserId();
  const userRole = getUserRole();
  const userId = actualUserId;
  const socketRef = useRef(null);

  // Function to handle navigation to chat
  const navigateToChat = (conversationId, conversationType) => {
    if (conversationId) {
      console.log(`🧭 Navigating to conversation ${conversationId} for role: ${userRole}`);
      
      // Determine the navigation path based on user role
      let chatPath;
      if (userRole === 'shop') {
        chatPath = `/shop/chat/${conversationId}`;
      } else {
        chatPath = `/chat/${conversationId}`;
      }
      
      // Navigate to the appropriate chat page with conversation ID
      navigate(chatPath);
      
      // Also send a message to the chat component in case it's already loaded
      window.postMessage({
        type: 'NAVIGATE_TO_CHAT',
        payload: {
          conversationId,
          conversationType,
          userRole,
          chatPath,
          timestamp: Date.now()
        }
      }, window.location.origin);
      
      // Dismiss the toast after navigation
      toast.dismiss();
    }
  };

  // Function to check if notification contains only conversation ID (navigation notification)
  const isNavigationOnly = (messageData) => {
    return messageData.conversation_id && 
           (!messageData.content || !messageData.sender || 
            (messageData.content === "" && messageData.sender === ""));
  };

  const connectWebSocket = async () => {
    if (!userId) {
      console.error("❌ No user ID found");
      return;
    }

    console.log(`🔌 Attempting to connect WebSocket for user ${userId} with role ${userRole}`);
    setConnectionAttempts(prev => prev + 1);
    
    // Test server connectivity first
    const serverReachable = await testConnection(userId);
    if (!serverReachable) {
      console.error("❌ Server not reachable");
      setConnectionStatus('server_unreachable');
      return;
    }

    setConnectionStatus('connecting');
    const socket = getSocket(userId);
    
    if (!socket) {
      console.error("❌ Failed to create WebSocket");
      setConnectionStatus('failed');
      return;
    }

    socketRef.current = socket;

    // Override the onmessage handler to handle notifications
    socket.onmessage = (event) => {
      console.log("📨 Raw message received:", event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log("📊 Parsed message data:", data);
        
        // Check if this is a notification
        if (data.type === 'notification' && data.message) {
          console.log("🔔 Processing notification:", data.message);
          
          // Check if this is a navigation-only notification
          if (isNavigationOnly(data.message)) {
            console.log("🧭 Navigation-only notification detected");
            
            // Show navigation notification
            toast.custom((t) => (
              <div
                className={`max-w-sm w-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-blue-400 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                  t.visible ? 'animate-enter' : 'animate-leave'
                }`}
                onClick={() => navigateToChat(data.message.conversation_id, data.message.conversation_type)}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Navigation className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-white">
                        🧭 Navigate to Chat
                      </p>
                      <p className="mt-1 text-sm text-blue-100">
                        Open conversation {data.message.conversation_id}
                      </p>
                      {data.message.conversation_name && (
                        <p className="mt-1 text-xs text-blue-200">
                          📨 {data.message.conversation_name}
                        </p>
                      )}
                      {userRole === 'shop' && (
                        <p className="mt-1 text-xs text-blue-200">
                          🏪 Shop Dashboard
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-blue-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-150"
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ), {
              duration: 4000,
              position: 'top-right',
              id: `navigation-${data.message.conversation_id}-${Date.now()}`
            });
          } else {
            console.log("💬 Regular message notification detected");
            
            // Show regular message notification
            toast.custom((t) => (
              <div
                className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                  t.visible ? 'animate-enter' : 'animate-leave'
                }`}
                onClick={() => navigateToChat(data.message.conversation_id, data.message.conversation_type)}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <MessageSquareText className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                         {data.message.sender || 'Unknown Sender'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {data.message.content || 'No message content'}
                      </p>
                      {data.message.conversation_name && (
                        <p className="mt-1 text-xs text-gray-400">
                          📨 {data.message.conversation_name}
                        </p>
                      )}
                      {/* {userRole === 'shop' && (
                        <p className="mt-1 text-xs text-gray-400">
                          🏪 Shop Chat
                        </p>
                      )} */}
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigation when dismissing
                      toast.dismiss(t.id);
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ), {
              duration: 5000, // Longer duration for interaction
              position: 'top-right',
              id: `notification-${data.message.conversation_id}-${Date.now()}` // Unique ID
            });
          }
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    // Add connection status logging
    socket.onopen = () => {
      console.log("✅ WebSocket connected successfully");
      setConnectionStatus('connected');
    };

    socket.onclose = (event) => {
      console.log("❌ WebSocket disconnected:", event.code, event.reason);
      setConnectionStatus('disconnected');
      socketRef.current = null;
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setConnectionStatus('error');
    };
  };

  useEffect(() => {
    if (userId && !socketRef.current) {
      connectWebSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log("🔌 Closing WebSocket connection");
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [userId]);

  // Debug component - remove in production
  const showConnectionStatus = () => {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-1 rounded text-xs z-50">
          WebSocket: {connectionStatus} | Attempts: {connectionAttempts} | Role: {userRole}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'notification-toast',
          style: {
            boxShadow: 'none',
            padding: 0,
          },
        }}
      />
      {/* {showConnectionStatus()} */}
    </>
  );
}

export default Notification;