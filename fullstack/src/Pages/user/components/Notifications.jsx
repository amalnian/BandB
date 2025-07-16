import React, { useEffect, useRef, useState } from 'react';
import { getSocket, testConnection } from '@/service/webSocket';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { MessageSquareText } from 'lucide-react';

function Notification() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
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

  const actualUserId = getUserId();
  const userId = actualUserId;
  const socketRef = useRef(null);

  const connectWebSocket = async () => {
    if (!userId) {
      console.error("❌ No user ID found");
      return;
    }

    console.log(`🔌 Attempting to connect WebSocket for user ${userId}`);
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
          console.log("🔔 Displaying notification:", data.message);
          
          toast.custom((t) => (
            <div
              className={`max-w-xs w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 ${
                t.visible ? 'animate-enter' : 'animate-leave'
              }`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <MessageSquareText className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {data.message.sender} sent a message
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {data.message.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ), {
            duration: 4000,
            position: 'top-right'
          });
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
}

export default Notification;