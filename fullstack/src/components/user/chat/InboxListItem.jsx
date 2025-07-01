import React from "react";

export const InboxListItem = ({ name, avatar, verified = true,onClick }) => {
  return (
    <article className="flex items-center gap-4 p-4   transition rounded-lg" onClick={onClick}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <img
          src={avatar}
          alt={`${name}'s avatar`}
          className="w-12 h-12 rounded-full object-cover border"
        />
      </div>

      {/* Name and Verified */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-lg font-medium text-white">
          {name}
          {verified && (
            <img
              src="https://cdn.builder.io/api/v1/image/assets/aadabba814c24e21949a3d066a352728/ac356513f4cd364f86e079687e73a62865c2b46b?placeholderIfAbsent=true"
              alt="Verified badge"
              className="w-4 h-4"
            />
          )}
        </div>
      </div>
    </article>
  );
};
