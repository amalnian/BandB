import axios from "../axiosinterceptor/UserInterceptor"

export const getchatconversation = () => axios.get('chat/conversations/')

// Fix: The participants should be passed directly, not wrapped in an object
export const createconversation = (participants) => axios.post("chat/conversations/", { participants })

export const specificconversation = (conversationId) => axios.get(
    `chat/conversations/${conversationId}/messages/`
)