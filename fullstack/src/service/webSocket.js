// const user_url = "ws://localhost:8000/ws/notification/";
// let socketInstance = null;

// export const getSocket = (userId) => {
//     if (!socketInstance || socketInstance.readyState === WebSocket.CLOSED) {
//         socketInstance = new WebSocket(`${user_url}${userId}/`);

//         socketInstance.onopen = () => {
//             console.log("✅ WebSocket connected");
//         };

//         socketInstance.onclose = (event) => {
//             console.log("❌ WebSocket disconnected:", event.code, event.reason);
//             socketInstance = null;
//         };

//         socketInstance.onerror = (error) => {
//             console.error("❌ WebSocket error:", error);
//         };

//         // Add connection timeout
//         setTimeout(() => {
//             if (socketInstance && socketInstance.readyState === WebSocket.CONNECTING) {
//                 console.error("WebSocket connection timeout");
//                 socketInstance.close();
//             }
//         }, 5000);

//     }

//     return socketInstance;
// };

// export const disconnectSocket = () => {
//     if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
//         socketInstance.close();
//         socketInstance = null;
//         console.log("🔌 WebSocket manually disconnected");
//     }
// };