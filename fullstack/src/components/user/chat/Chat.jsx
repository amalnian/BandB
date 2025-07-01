import React, { useState } from "react";
// import { useForm } from "react-hook-form";

// Chat Header Component
const ChatHeader = ({ avatarUrl, username, route }) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-stretch gap-3.5 ml-[31px] max-md:ml-2.5">
        <img
          src={avatarUrl}
          alt={username}
          className="aspect-[0.97] object-contain w-[34px] shrink-0"
        />
        <div className="flex items-stretch gap-[3px] my-auto">
          <div className="text-[#CDCDCD] text-sm font-medium leading-none grow">
            {username}
          </div>
          <div className="flex flex-col relative aspect-[0.941] w-4">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/ac356513f4cd364f86e079687e73a62865c2b46b?placeholderIfAbsent=true"
              className="absolute h-full w-full object-cover inset-0"
              alt="Status"
            />
            <img
              src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/ac356513f4cd364f86e079687e73a62865c2b46b?placeholderIfAbsent=true"
              className="aspect-[0.94] object-contain w-full"
              alt="Status"
            />
          </div>
        </div>
      </div>
      <div className="text-[#CDCDCD] text-sm font-medium leading-5 ml-[31px] mt-[18px] max-md:ml-2.5">
        <span className="text-[#4D4D4D]">
          {route.from} → {route.to}
        </span>
        <br />
        Booked {route.date} ,{route.time}
      </div>
    </div>
  );
};

// Chat Message Component
const ChatMessage = ({ message, timestamp, isSent = false }) => {
  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={`
        bg-[rgba(217,217,217,1)] 
        flex 
        w-[115px] 
        max-w-full 
        flex-col 
        font-medium 
        px-2.5 
        py-[11px] 
        rounded-[0px_15px_15px_15px]
      `}
      >
        <div className="text-[rgba(77,77,77,1)] text-sm leading-none">
          {message}
        </div>
        <div className="text-[rgba(134,134,134,1)] text-[13px] leading-loose mt-[11px]">
          {timestamp}
        </div>
      </div>
    </div>
  );
};

// Chat Input Component
const ChatInput = ({ onSendMessage }) => {
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = (data) => {
    onSendMessage(data.message);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="bg-[rgba(89,89,89,1)] w-full max-w-[701px] overflow-hidden text-sm text-[rgba(134,134,134,1)] font-medium leading-none rounded-[15px] max-md:max-w-full">
        <div className="bg-[rgba(192,192,192,1)] flex items-stretch gap-5 flex-wrap justify-between px-5 py-[13px] max-md:max-w-full">
          <input
            type="text"
            placeholder="Your message"
            className="bg-transparent outline-none flex-1 text-[rgba(77,77,77,1)]"
            {...register("message", { required: true })}
          />
          <button type="submit">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/eed45cf7b7b9b7c76291651e899f8a045900dabc?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-6 shrink-0"
              alt="Send"
            />
          </button>
        </div>
      </div>
    </form>
  );
};

// Main Chat Interface Component
export const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "hi broo",
      timestamp: "3:45 pm",
      isSent: false,
    },
  ]);

  const handleSendMessage = (message) => {
    const newMessage = {
      id: messages.length + 1,
      text: message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isSent: true,
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="max-w-[840px]">
      <div className="bg-white flex w-full flex-col pt-[15px] pb-7 px-8 rounded-[25px] max-md:max-w-full max-md:px-5">
        <ChatHeader
          avatarUrl="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/838129489dfc12f95960a2e90143c38a172e2694?placeholderIfAbsent=true"
          username="Sundhar kum"
          route={{
            from: "Kochi,Ernakulam,Kerala,India",
            to: "Thrissur,Stand,Kerala,india",
            date: "Fri,28 March",
            time: "8:00",
          }}
        />

        <div className="border self-stretch shrink-0 h-[3px] mt-[26px] border-[rgba(215,215,215,1)] border-solid max-md:max-w-full" />

        <div className="flex flex-col space-y-4 mt-4 mb-4 min-h-[300px]">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              timestamp={message.timestamp}
              isSent={message.isSent}
            />
          ))}
        </div>

        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};