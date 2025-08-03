import React, { useEffect, useState, useRef } from "react";
import { specificconversation } from "@/endpoints/ChatAPI";

const Conversation = ({ conversationId, currentUserId, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [isChange, setIsChange] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const typingTimeoutRef = useRef(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const endRef = useRef();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get user ID from localStorage
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
    return currentUserId; // Fallback to prop
  };

  const actualUserId = getUserId();
const websocket_url = import.meta.env.VITE_WS_CHAT_URL;

  // Clean up function
  const cleanupWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      
      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    setSocket(null);
    setConnectionStatus('disconnected');
  };

  // WebSocket connection function
  const connectWebSocket = () => {
    if (!conversationId || !actualUserId) {
      console.error("Missing conversationId or actualUserId:", { conversationId, actualUserId });
      return;
    }

    // Clean up existing connection
    cleanupWebSocket();
    
    console.log("Attempting to connect WebSocket for user:", actualUserId);
    setConnectionStatus('connecting');
    
    const websocket = new WebSocket(`${websocket_url}${conversationId}?user_id=${actualUserId}`);
    socketRef.current = websocket;

    websocket.onopen = () => {
      console.log("WebSocket connection established");
      console.log("Connected with user ID:", actualUserId);
      setConnectionStatus('connected');
      setSocket(websocket);
      reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
    };
    
    websocket.onclose = (event) => {
      console.log("WebSocket connection closed", event.code, event.reason);
      setConnectionStatus('disconnected');
      setSocket(null);
      
      // Only attempt reconnect if it wasn't a normal closure and we haven't exceeded max attempts
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)); // Exponential backoff
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          const { message, user, timestamp } = data;
          setMessages((prev) => [...prev, { id: data.id, sender: user, content: message, timestamp }]);
          setTimeout(() => {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          setTypingUser(null);
        } else if (data.type === "typing") {
          const { user, receiver } = data;
          if (receiver === actualUserId && user.id !== actualUserId) {
            setTypingUser(user);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
          }
        } else if (data.type === "online_status") {
          setOnlineUsers(data?.online_users || []);
        } else if (data.type === "message_deleted") {
          const { message_id } = data;
          setMessages((prev) => prev.filter((msg) => msg.id !== message_id));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setConnectionStatus('error');
    };
  };

  // Fetch conversation data
  useEffect(() => {
    const fetchConversationData = async () => {
      if (!conversationId) return;
      try {
        setLoading(true);
        const response = await specificconversation(conversationId);
        const messages = response.data || [];
        setMessages(messages);
        
        setTimeout(() => {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        if (messages.length > 0) {
          const participants = messages[0]?.participants || [];
          const chatPartner = participants.find((u) => u.id !== actualUserId);
          if (chatPartner) setChatPartner(chatPartner);
        }
      } catch (error) {
        console.error("Error fetching conversation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [conversationId, actualUserId]);

  // WebSocket connection effect
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupWebSocket();
    };
  }, [conversationId, actualUserId]);

  const handleSendMessage = () => {
    if (!conversationId || !newMessage.trim()) return;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "chat_message",
        message: newMessage,
        user: actualUserId,
      }));
      setNewMessage("");
    } else {
      console.warn("WebSocket is not connected. Cannot send message.");
    }
  };

  const handleTyping = () => {
    if (!chatPartner || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "typing",
      user: actualUserId,
      receiver: chatPartner.id,
    }));
  };

  const debouncedHandleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    handleTyping();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteMessage = (messageId) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "delete_message",
        message_id: messageId,
      }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] w-full bg-white text-black rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 rounded-t-2xl">
        <button
          onClick={onBack}
          aria-label="Close modal"
          className="text-sm text-black hover:underline flex items-center"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 25 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[24px] h-[24px]"
          >
            <path
              d="M16.6904 8.10052C16.8868 8.29472 16.8885 8.6113 16.6943 8.80761L8.95839 16.6279C8.76419 16.8242 8.44761 16.8259 8.2513 16.6317L7.54036 15.9284C7.34405 15.7342 7.34233 15.4177 7.53653 15.2213L15.2724 7.40109C15.4666 7.20477 15.7832 7.20306 15.9795 7.39726L16.6904 8.10052Z"
              fill="black"
            />
            <path
              d="M16.0294 16.5894C15.8352 16.7857 15.5186 16.7874 15.3223 16.5932L7.50202 8.85732C7.30571 8.66312 7.30399 8.34654 7.49819 8.15022L8.20145 7.43929C8.39565 7.24297 8.71223 7.24125 8.90855 7.43546L16.7288 15.1713C16.9251 15.3655 16.9268 15.6821 16.7326 15.8784L16.0294 16.5894Z"
              fill="black"
            />
          </svg>
          <span className="ml-2">Back</span>
        </button>
        
        <div className="flex items-center space-x-2">
          {/* Connection status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          
          <div className="text-sm text-gray-600">
            {onlineUsers.length > 0 ? (
              onlineUsers
                .filter((u) => u.id !== actualUserId)
                .map((u) => (
                  <span key={u.id} className="text-green-600 font-medium">
        {u.username} (online)  
                  </span>
                ))
            ) : (
              <span>No users online</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400">Loading messages...</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isSentByCurrentUser = message.sender?.id === actualUserId;
            return (
              <div
                key={`${message.id}-${index}`}
                onContextMenu={(e) => {
                  if (isSentByCurrentUser) {
                    e.preventDefault();
                    setDeletingIndex(index);
                    setContextMenu({
                      messageId: message.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }
                }}
                className={`flex flex-col ${isSentByCurrentUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`relative max-w-xs px-4 py-2 shadow ${
                    isSentByCurrentUser 
                      ? "bg-black text-white rounded-t-2xl rounded-bl-2xl" 
                      : "bg-gray-200 text-black rounded-t-2xl rounded-br-2xl"
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {formatTimestamp(message.timestamp)}
                </span>
                {contextMenu && deletingIndex === index && (
                  <div
                    style={{ 
                      position: 'fixed',
                      top: contextMenu.y, 
                      left: contextMenu.x,
                      zIndex: 1000 
                    }}
                    className="bg-white border border-gray-300 rounded-md shadow-md p-2 text-sm cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      handleDeleteMessage(contextMenu.messageId);
                      setContextMenu(null);
                      setDeletingIndex(null);
                    }}
                    onMouseLeave={() => {
                      setContextMenu(null);
                      setDeletingIndex(null);
                    }}
                  >
                    Delete
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={endRef}></div>
      </div>

      {/* Typing Indicator */}
      {typingUser && (
        <div className="px-4 py-2 text-sm text-gray-500 italic border-t border-gray-100">
          {typingUser.username} is typing...
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            debouncedHandleTyping();
          }}
          onKeyDown={handleKeyPress}
          placeholder={connectionStatus === 'connected' ? "Type a message..." : "Connecting..."}
          disabled={connectionStatus !== 'connected'}
          className="flex-1 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed border border-gray-200"
        />
        <button 
          onClick={handleSendMessage}
          disabled={connectionStatus !== 'connected' || !newMessage.trim()}
          className="ml-2 p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/eed45cf7b7b9b7c76291651e899f8a045900dabc?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-6 shrink-0"
            alt="Send"
          />
        </button>
      </div>
    </div>
  );
};

export default Conversation;