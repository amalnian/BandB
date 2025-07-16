const user_url = "ws://localhost:8000/ws/user/";
let socketInstance = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export const getSocket = (userId) => {
    if (!socketInstance || socketInstance.readyState === WebSocket.CLOSED) {
        console.log(`🔌 Creating new WebSocket connection for user ${userId}`);
        console.log(`🔗 Connecting to: ${user_url}${userId}/`);
        
        try {
            socketInstance = new WebSocket(`${user_url}${userId}/`);
            
            socketInstance.onopen = () => {
                console.log("✅ WebSocket connected successfully");
                console.log("🔍 Connection state:", socketInstance.readyState);
                reconnectAttempts = 0; // Reset on successful connection
            };

            socketInstance.onclose = (event) => {
                console.log("❌ WebSocket disconnected:", {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                
                // Common WebSocket close codes
                const closeCodes = {
                    1000: "Normal closure",
                    1001: "Going away",
                    1002: "Protocol error",
                    1003: "Unsupported data",
                    1005: "No status received",
                    1006: "Abnormal closure",
                    1007: "Invalid frame payload data",
                    1008: "Policy violation",
                    1009: "Message too big",
                    1010: "Missing extension",
                    1011: "Internal error",
                    1012: "Service restart",
                    1013: "Try again later",
                    1014: "Bad gateway",
                    1015: "TLS handshake fail",
                    4001: "Custom: User not found",
                    4002: "Custom: Connection failed"
                };
                
                console.log(`📋 Close code meaning: ${closeCodes[event.code] || 'Unknown'}`);
                socketInstance = null;
                
                // Attempt to reconnect for certain close codes
                if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                    setTimeout(() => getSocket(userId), 1000 * reconnectAttempts);
                }
            };

            socketInstance.onerror = (error) => {
                console.error("❌ WebSocket error:", error);
                console.log("🔍 Error details:", {
                    readyState: socketInstance.readyState,
                    url: socketInstance.url,
                    protocol: socketInstance.protocol,
                    extensions: socketInstance.extensions
                });
            };

            // Default message handler - can be overridden
            socketInstance.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("📨 Default handler - Received:", data);
                } catch (e) {
                    console.error("❌ Failed to parse message:", e);
                    console.log("📝 Raw message:", event.data);
                }
            };

            // Connection timeout with more detailed logging
            setTimeout(() => {
                if (socketInstance && socketInstance.readyState === WebSocket.CONNECTING) {
                    console.error("❌ WebSocket connection timeout");
                    console.log("🔍 Connection state at timeout:", socketInstance.readyState);
                    socketInstance.close();
                }
            }, 10000); // Increased timeout to 10 seconds

        } catch (error) {
            console.error("❌ Error creating WebSocket:", error);
            return null;
        }
    } else {
        console.log("🔄 Reusing existing WebSocket connection");
        console.log("🔍 Current state:", socketInstance.readyState);
    }

    return socketInstance;
};

export const closeSocket = () => {
    if (socketInstance) {
        console.log("🔌 Manually closing WebSocket connection");
        socketInstance.close(1000, "Manual close");
        socketInstance = null;
    }
};

// Test connection function
// Either remove this function entirely or change it to:
export const testConnection = async (userId) => {
    console.log("🧪 Testing WebSocket connection...");
    // Don't test WebSocket endpoints with HTTP requests
    return true;
};