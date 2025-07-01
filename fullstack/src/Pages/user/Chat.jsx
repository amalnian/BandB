// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { Send, User, Circle, Trash2, Users, MoreVertical, MessageCircle, X } from 'lucide-react';
// import { getchatconversation, createconversation, specificconversation } from '@/endpoints/ChatAPI';
// import { getSocket, disconnectSocket } from '@/service/webSocket';

// const ChatComponent = () => {
//   // State management
//   const [conversations, setConversations] = useState([]);
//   const [activeConversation, setActiveConversation] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [currentUser, setCurrentUser] = useState({ id: 1, username: 'john_doe' });
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [typingUsers, setTypingUsers] = useState([]);
//   const [isTyping, setIsTyping] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [showUserList, setShowUserList] = useState(false);

//   // Refs
//   const messagesEndRef = useRef(null);
//   const chatSocketRef = useRef(null);
//   const userSocketRef = useRef(null);
//   const typingTimeoutRef = useRef(null);

//   // Auto scroll to bottom
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // Initialize user socket for notifications
//   useEffect(() => {
//     if (currentUser?.id) {
//       const userSocket = getSocket(currentUser.id);
//       userSocketRef.current = userSocket;

//       userSocket.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         if (data.type === 'notification') {
//           setNotifications(prev => [...prev, data.message]);
//           // Auto remove notification after 5 seconds
//           setTimeout(() => {
//             setNotifications(prev => prev.filter(n => n !== data.message));
//           }, 5000);
//         }
//       };

//       return () => {
//         disconnectSocket();
//       };
//     }
//   }, [currentUser.id]);

//   // Load conversations
//   const loadConversations = async () => {
//     try {
//       const response = await getchatconversation();
//       setConversations(response.data);
//     } catch (error) {
//       console.error('Error loading conversations:', error);
//     }
//   };

//   // Load messages for active conversation
//   const loadMessages = async (conversationId) => {
//     try {
//       setLoading(true);
//       const response = await specificconversation(conversationId);
//       setMessages(response.data);
//     } catch (error) {
//       console.error('Error loading messages:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Create new conversation
//   const createNewConversation = async (participantIds) => {
//     try {
//       const response = await createconversation({ participants: participantIds });
//       setConversations(prev => [...prev, response.data]);
//       setActiveConversation(response.data);
//       connectToChatSocket(response.data.id);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating conversation:', error);
//       return null;
//     }
//   };

//   useEffect(() => {
//     loadConversations();
//   }, []);

//   // WebSocket connection for chat
//   const connectToChatSocket = useCallback((conversationId) => {
//     if (chatSocketRef.current) {
//       chatSocketRef.current.close();
//     }

//     const chatSocket = new WebSocket(
//       `ws://localhost:8000/ws/chat/${conversationId}/?user_id=${currentUser.id}`
//     );

//     chatSocket.onopen = () => {
//       console.log('Chat WebSocket connected');
//     };

//     chatSocket.onmessage = (event) => {
//       const data = JSON.parse(event.data);
      
//       switch (data.type) {
//         case 'chat_message':
//           setMessages(prev => [...prev, {
//             id: data.id,
//             content: data.message,
//             sender: data.user,
//             timestamp: data.timestamp,
//             conversation: conversationId
//           }]);
//           break;
          
//         case 'online_status':
//           setOnlineUsers(data.online_users);
//           break;
          
//         case 'typing':
//           if (data.user.id !== currentUser.id) {
//             setTypingUsers(prev => {
//               const filtered = prev.filter(u => u.id !== data.user.id);
//               return [...filtered, data.user];
//             });
            
//             // Remove typing indicator after 3 seconds
//             setTimeout(() => {
//               setTypingUsers(prev => prev.filter(u => u.id !== data.user.id));
//             }, 3000);
//           }
//           break;
          
//         case 'message_deleted':
//           setMessages(prev => prev.filter(m => m.id !== data.message_id));
//           break;
//       }
//     };

//     chatSocket.onclose = () => {
//       console.log('Chat WebSocket disconnected');
//     };

//     chatSocket.onerror = (error) => {
//       console.error('Chat WebSocket error:', error);
//     };

//     chatSocketRef.current = chatSocket;
//   }, [currentUser.id]);

//   // Handle conversation selection
//   const handleConversationSelect = async (conversation) => {
//     setActiveConversation(conversation);
//     await loadMessages(conversation.id);
//     connectToChatSocket(conversation.id);
//   };

//   // Send message
//   const sendMessage = () => {
//     if (!newMessage.trim() || !activeConversation || !chatSocketRef.current) return;

//     chatSocketRef.current.send(JSON.stringify({
//       type: 'chat_message',
//       message: newMessage,
//       user: currentUser.id
//     }));

//     setNewMessage('');
//     setIsTyping(false);
//   };

//   // Handle typing
//   const handleTyping = (e) => {
//     setNewMessage(e.target.value);
    
//     if (!isTyping && chatSocketRef.current) {
//       setIsTyping(true);
//       const otherParticipant = activeConversation?.participants.find(p => p.id !== currentUser.id);
      
//       chatSocketRef.current.send(JSON.stringify({
//         type: 'typing',
//         receiver: otherParticipant?.id
//       }));
//     }

//     // Clear typing timeout
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//     }

//     // Set new timeout to stop typing indicator
//     typingTimeoutRef.current = setTimeout(() => {
//       setIsTyping(false);
//     }, 2000);
//   };

//   // Delete message  
//   const deleteMessage = (messageId) => {
//     if (chatSocketRef.current) {
//       chatSocketRef.current.send(JSON.stringify({
//         type: 'delete_message',
//         message_id: messageId
//       }));
//     }
//   };

//   // Format timestamp
//   const formatTime = (timestamp) => {
//     return new Date(timestamp).toLocaleTimeString([], { 
//       hour: '2-digit', 
//       minute: '2-digit' 
//     });
//   };

//   // Get participant name (for group chats)
//   const getConversationName = (conversation) => {
//     const otherParticipants = conversation.participants.filter(p => p.id !== currentUser.id);
//     return otherParticipants.map(p => p.username).join(', ') || 'Chat';
//   };

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Notifications */}
//       <div className="fixed top-4 right-4 z-50 space-y-2">
//         {notifications.map((notification, index) => (
//           <div key={index} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
//             <MessageCircle size={16} />
//             <div>
//               <p className="font-semibold">{notification.sender}</p>
//               <p className="text-sm opacity-90">{notification.content}</p>
//             </div>
//             <button 
//               onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
//               className="ml-2 hover:bg-blue-600 rounded-full p-1"
//             >
//               <X size={14} />
//             </button>
//           </div>
//         ))}
//       </div>

//       {/* Sidebar - Conversations */}
//       <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
//         <div className="p-4 border-b border-gray-200">
//           <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
//           <p className="text-sm text-gray-500">Welcome, {currentUser.username}</p>
//         </div>
        
//         <div className="flex-1 overflow-y-auto">
//           {conversations.map((conversation) => {
//             const otherParticipant = conversation.participants.find(p => p.id !== currentUser.id);
//             const isOnline = onlineUsers.some(u => u.id === otherParticipant?.id);
            
//             return (
//               <div
//                 key={conversation.id}
//                 onClick={() => handleConversationSelect(conversation)}
//                 className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
//                   activeConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
//                 }`}
//               >
//                 <div className="flex items-center space-x-3">
//                   <div className="relative">
//                     <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
//                       <User size={20} className="text-gray-600" />
//                     </div>
//                     {isOnline && (
//                       <Circle size={8} className="absolute -bottom-1 -right-1 fill-green-400 text-green-400" />
//                     )}
//                   </div>
//                   <div className="flex-1">
//                     <p className="font-medium text-gray-900">{getConversationName(conversation)}</p>
//                     <p className="text-sm text-gray-500">
//                       {isOnline ? 'Online' : 'Offline'}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Main Chat Area */}
//       <div className="flex-1 flex flex-col">
//         {activeConversation ? (
//           <>
//             {/* Chat Header */}
//             <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
//               <div className="flex items-center space-x-3">
//                 <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
//                   <User size={16} className="text-gray-600" />
//                 </div>
//                 <div>
//                   <h2 className="font-semibold text-gray-900">{getConversationName(activeConversation)}</h2>
//                   <div className="flex items-center space-x-2 text-sm text-gray-500">
//                     <span>{onlineUsers.length} online</span>
//                     {typingUsers.length > 0 && (
//                       <span className="text-blue-500">
//                         {typingUsers.map(u => u.username).join(', ')} typing...
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setShowUserList(!showUserList)}
//                 className="p-2 hover:bg-gray-100 rounded-full"
//               >
//                 <Users size={20} className="text-gray-600" />
//               </button>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-4">
//               {loading ? (
//                 <div className="flex justify-center items-center h-full">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//                 </div>
//               ) : (
//                 messages.map((message) => (
//                   <div
//                     key={message.id}
//                     className={`flex ${message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'}`}
//                   >
//                     <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
//                       message.sender.id === currentUser.id
//                         ? 'bg-blue-500 text-white'
//                         : 'bg-gray-200 text-gray-900'
//                     }`}>
//                       <div className="flex items-center justify-between mb-1">
//                         <span className="text-xs opacity-75">{message.sender.username}</span>
//                         {message.sender.id === currentUser.id && (
//                           <button
//                             onClick={() => deleteMessage(message.id)}
//                             className="ml-2 opacity-50 hover:opacity-100"
//                           >
//                             <Trash2 size={12} />
//                           </button>
//                         )}
//                       </div>
//                       <p className="text-sm">{message.content}</p>
//                       <p className="text-xs opacity-75 mt-1">{formatTime(message.timestamp)}</p>
//                     </div>
//                   </div>
//                 ))
//               )}
//               <div ref={messagesEndRef} />
//             </div>

//             {/* Message Input */}
//             <div className="p-4 bg-white border-t border-gray-200">
//               <div className="flex items-center space-x-2">
//                 <input
//                   type="text"
//                   value={newMessage}
//                   onChange={handleTyping}
//                   onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
//                   placeholder="Type a message..."
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 <button
//                   onClick={sendMessage}
//                   disabled={!newMessage.trim()}
//                   className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <Send size={20} />
//                 </button>
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center">
//             <div className="text-center">
//               <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
//               <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
//             </div>
//           </div>
//         )}

//         {/* Online Users Panel */}
//         {showUserList && activeConversation && (
//           <div className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-lg z-40">
//             <div className="p-4 border-b border-gray-200 flex items-center justify-between">
//               <h3 className="font-semibold">Online Users</h3>
//               <button
//                 onClick={() => setShowUserList(false)}
//                 className="p-1 hover:bg-gray-100 rounded"
//               >
//                 <X size={16} />
//               </button>
//             </div>
//             <div className="p-4 space-y-2">
//               {onlineUsers.map((user) => (
//                 <div key={user.id} className="flex items-center space-x-2">
//                   <Circle size={8} className="fill-green-400 text-green-400" />
//                   <span className="text-sm">{user.username}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ChatComponent;