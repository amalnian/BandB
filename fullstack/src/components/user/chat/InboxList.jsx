import React, { useEffect, useState } from "react";
import { InboxListItem } from "./InboxListItem";
import { useSelector } from "react-redux";
import { getchatconversation } from "@/endpoints/ChatAPI";
import Conversation from "../../../Pages/chat/Conversatio";
import { useLocation, useParams } from "react-router-dom";

export const InboxList = () => {
  const [conversations, setConversations] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Get URL parameters for direct navigation
  const { conversationId } = useParams();
  const location = useLocation();

  const getUserData = () => {
    try {
      const userData = localStorage.getItem("user_data");
      if (userData) {
        const parsedData = JSON.parse(userData);
        return {
          id: parsedData.id,
          role: parsedData.role
        };
      }
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
    }
    return { id: currentUserId, role: null };
  };

  // Function to get the appropriate chat base path based on role
  const getChatBasePath = () => {
    return userRole === 'shop' ? '/shop/chat' : '/chat';
  };

  // Function to find conversation by ID
  const findConversationById = (id) => {
    return conversations.find(conv => conv.id === parseInt(id));
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        const userData = getUserData();
        console.log("User data:", userData);
        setCurrentUserId(userData.id);
        setUserRole(userData.role);
        
        const conversationResponse = await getchatconversation();
        setConversations(conversationResponse.data);
        
        // If there's a conversationId in URL, auto-select that conversation
        if (conversationId && conversationResponse.data) {
          const targetConversation = conversationResponse.data.find(
            conv => conv.id === parseInt(conversationId)
          );
          if (targetConversation) {
            setActiveConversation(targetConversation);
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, []);

  // Handle URL changes (when navigating from notifications)
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const targetConversation = findConversationById(conversationId);
      if (targetConversation && targetConversation.id !== activeConversation?.id) {
        setActiveConversation(targetConversation);
      }
    }
  }, [conversationId, conversations]);

  // Listen for notification navigation events
  useEffect(() => {
    const handleNotificationNavigation = (event) => {
      if (event.data.type === 'NAVIGATE_TO_CHAT') {
        const { conversationId: targetId, userRole: notificationUserRole } = event.data.payload;
        
        // Verify the role matches current user's role
        if (notificationUserRole && notificationUserRole !== userRole) {
          console.warn("Role mismatch in notification navigation");
          return;
        }
        
        const targetConversation = findConversationById(targetId);
        if (targetConversation) {
          setActiveConversation(targetConversation);
        }
      }
    };

    window.addEventListener('message', handleNotificationNavigation);
    return () => {
      window.removeEventListener('message', handleNotificationNavigation);
    };
  }, [conversations, userRole]);

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    
    // Update URL without full page reload - use role-based path
    if (window.history && window.history.pushState) {
      const chatPath = `${getChatBasePath()}/${conversation.id}`;
      window.history.pushState(
        null, 
        '', 
        chatPath
      );
    }
  };

  const handleBackToChatList = () => {
    setActiveConversation(null);
    
    // Update URL to remove conversation ID - use role-based path
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', getChatBasePath());
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {!activeConversation ? (
          // Chat List View
          <div className="bg-[#0e0e0e] rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-white text-xl font-semibold mb-4">
              {userRole === 'shop' ? 'Messages' : 'Messages'}
            </h2>
            {conversations
              .filter(conversation => conversation && conversation.participants)
              .map((conversation) => {
                const otherParticipant = conversation.participants.find(
                  (user) => user && user.id !== currentUserId
                );

                if (!otherParticipant) {
                  return null;
                }

                const displayName = otherParticipant.display_name || otherParticipant.username;
                const displayImage = otherParticipant.display_image || otherParticipant.profile_url;

                return (
                  <InboxListItem
                    key={conversation.id}
                    name={displayName}
                    avatar={displayImage}
                    verified={otherParticipant?.is_verified}
                    onClick={() => handleSelectConversation(conversation)}
                  />
                );
              })
              .filter(Boolean)}
          </div>
        ) : (
          // Conversation View
          <div className="w-full">
            <Conversation
              conversationId={activeConversation.id}
              currentUserId={currentUserId}
              userRole={userRole}
              onBack={handleBackToChatList}
            />
          </div>
        )}
      </div>
    </div>
  );
};