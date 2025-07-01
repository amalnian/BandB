import React, { useEffect, useState, useRef } from "react";
import { specificconversation } from "@/endpoints/ChatAPI";
import { useSelector } from "react-redux";

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
  const typingTimeoutRef = useRef(null);
  const [deletingIndex,setDeletingIndex] = useState(null)
  const endRef = useRef()
  const user = useSelector((state) => state.user);

  const websocket_url =  "ws://localhost:8000/ws/chat/"
  useEffect(() => {
    const fetchConversationData = async () => {
      if (!conversationId) return;
      try {
        setLoading(true);
        const response = await specificconversation(conversationId);
        const messages = response.data || [];
        setMessages(messages);
        
        setTimeout(()=>{
          endRef.current?.scrollIntoView({behaviour:'smooth'})
        },100)


        if (messages.length > 0) {
          const participants = messages[0]?.participants || [];
          const chatPartner = participants.find((u) => u.id !== currentUserId);
          if (chatPartner) setChatPartner(chatPartner);
        }
      } catch (error) {
        console.error("Error fetching conversation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const websocket = new WebSocket(`${websocket_url}${conversationId}/?user_id=${user?.user?.id}`);

    websocket.onopen = () => console.log("WebSocket connection established");
    websocket.onclose = () => {
      setIsChange(!isChange);
      console.log("WebSocket connection closed");
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          const { message, user, timestamp } = data;
          setMessages((prev) => [...prev, { id: data.id, sender: user, content: message, timestamp }]);
          endRef.current?.scrollIntoView({behaviour:'smooth'})

          setTypingUser(null);
        } else if (data.type === "typing") {
          const { user, receiver } = data;
          if (receiver === currentUserId && user.id !== currentUserId) {
            setTypingUser(user);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
          }
        } else if (data.type === "online_status") {
          setOnlineUsers(data?.online_users);
        } else if (data.type === "message_deleted") {
          const { message_id } = data;
          setMessages((prev) => prev.filter((msg) => msg.id !== message_id));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      } finally{
        endRef.current?.scrollIntoView({behaviour:'smooth'})
      }
    };

    websocket.onerror = (error) => console.error("WebSocket Error:", error);

    setSocket(websocket);


    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      websocket.close();
    };
  }, [isChange]);

  const handleSendMessage = () => {
    if (!conversationId || !newMessage.trim()) return;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "chat_message",
        message: newMessage,
        user: currentUserId,
      }));
      setNewMessage("");
    }
  };

  const handleTyping = () => {
    if (!chatPartner || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "typing",
      user: currentUserId,
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

  return (
    <div className="absolute top-0  z-10 flex flex-col h-full w-full bg-white text-black rounded-2xl shadow-md overflow-hidden ">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">

        <button
          onClick={onBack}
          aria-label="Close modal"
          className="text-sm text-black hover:underline"
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
        </button>
        <div className="text-sm text-gray-600">
          {onlineUsers.length > 0 ? (
            onlineUsers
              .filter((u) => u.id !== currentUserId)
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

      <div className="flex-1 overflow-y-auto custom-scroll-hide p-4 space-y-4 bg-white">
        {loading ? (
          <p className="text-gray-400">Loading messages...</p>
        ) : (
          messages.map((message, index) => {
            const isSentByCurrentUser = message.sender?.id === currentUserId;
            return (
              <div
                key={index}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeletingIndex(index)
                  setContextMenu({
                    messageId: message.id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                className={`flex flex-col ${isSentByCurrentUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`relative max-w-xs px-4 py-2  shadow ${isSentByCurrentUser ? "bg-black text-white rounded-t-2xl rounded-bl-2xl" : "bg-gray-200 text-black rounded-t-2xl rounded-br-2xl"
                    }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {formatTimestamp(message.timestamp)}
                </span>
                {contextMenu && deletingIndex==index && (
                  <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className=" bg-white border border-gray-300 rounded-md shadow-md p-2 text-sm"
                    onClick={() => {
                      handleDeleteMessage(contextMenu.messageId);
                      setContextMenu(null);
                    }}
                    onMouseLeave={() => setContextMenu(null)}
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

      {typingUser && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          {typingUser.username} is typing...
        </div>
      )}

      <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            debouncedHandleTyping();
          }}
          onKeyDown={handleTyping}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2  rounded-xl focus:outline-none "
        />
        <button
          onClick={handleSendMessage}>
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