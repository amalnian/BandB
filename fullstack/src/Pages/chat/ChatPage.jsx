"use client";

import { InboxList } from "../../components/user/chat/InboxList";
// import { Navigation } from "../../components/user/othercomponent/Navigation";






const ChatPage = () => {

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
      />
      {/* <Navigation /> */}
      <main className=" h-full bg-black ">
        <InboxList/>
      </main>
    </>
  );
};

export default ChatPage;