import React, { useEffect, useState } from "react";
import { InboxListItem } from "./InboxListItem";
import { useSelector } from "react-redux";
import { getchatconversation } from "@/endpoints/ChatAPI";
import Conversation from "../../../pages/chat/Conversation";

export const InboxList = () => {

  const [conversations, setConversations] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const user = useSelector(state => state.user)

  useEffect(() => {
    const initializeData = async () => {
      try {

        setCurrentUserId(user?.user?.id);
        const conversationResponse = await getchatconversation();
        setConversations(conversationResponse.data);
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, []);


  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleBackToChatList = () => {
    setActiveConversation(null);
  };
  return (
    <div className="relative w-full min-h-screen bg-white overflow-hidden">
      <img
        // src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/04634a6562dfc88f9a10ed30c6642d9e9b360aed?placeholderIfAbsent=true"
        alt="Background"
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20 z-0"
      />

      <div className="relative z-10 max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">

        <div className="bg-[#0e0e0e] rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {conversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(
              (user) => user.id !== currentUserId
            );

            return (
                <InboxListItem
                  key={otherParticipant.id}
                  name={otherParticipant?.username}
                  avatar={otherParticipant?.profile_url}
                  verified={otherParticipant?.is_verified}
                  onClick={() => handleSelectConversation(conversation)}
                />
            );
          })}

        </div>
      </div>
      <div>
        {activeConversation&&
          <Conversation
            conversationId={activeConversation.id}
            currentUserId={currentUserId}
            onBack={handleBackToChatList}
          />}
      </div>
    </div>
  );
};
