package co.suguna.sdk.cast

import android.content.Context
import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

/**
 * Suguna Cast Android SDK
 * Simplified wrapper for Mediasoup-based Real-time Communication.
 */
class SugunaCast private constructor(private val context: Context, private val appId: String) {

    private var socket: Socket? = null
    private var isInitialized = false

    companion object {
        private const val TAG = "SugunaCast"
        private const val SERVER_URL = "https://cast.suguna.co" // Production Server

        @Volatile
        private var instance: SugunaCast? = null

        fun initialize(context: Context, appId: String): SugunaCast {
            return instance ?: synchronized(this) {
                instance ?: SugunaCast(context, appId).also { 
                    instance = it 
                    it.isInitialized = true
                    Log.d(TAG, "Suguna Cast initialized with App ID: $appId")
                }
            }
        }

        fun getInstance(): SugunaCast {
            return instance ?: throw IllegalStateException("SugunaCast must be initialized first")
        }
    }

    /**
     * Joins a room using a token generated from your backend.
     */
    fun joinRoom(roomId: String, token: String, listener: CastEventListener) {
        try {
            val opts = IO.Options()
            opts.forceNew = true
            socket = IO.socket(SERVER_URL, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to Signaling Server")
                
                // Prepare join room data
                val joinData = JSONObject()
                joinData.put("roomId", roomId)
                joinData.put("token", token)
                
                val metrics = JSONObject()
                metrics.put("device", "Android ${android.os.Build.VERSION.RELEASE}")
                metrics.put("network", "Mobile/WiFi")
                joinData.put("metrics", metrics)

                socket?.emit("joinRoom", joinData) { args ->
                    val response = args[0] as JSONObject
                    if (response.has("error")) {
                        val error = response.getString("error")
                        Log.e(TAG, "Join Room Error: $error")
                        listener.onError(error)
                    } else {
                        Log.d(TAG, "Successfully joined room: $roomId")
                        listener.onJoined(response)
                    }
                }
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Connection Error: ${args[0]}")
                listener.onError("Connection failed")
            }

            socket?.connect()

        } catch (e: URISyntaxException) {
            Log.e(TAG, "Invalid Server URL", e)
            listener.onError("Invalid Server URL")
        }
    }

    /**
     * Leaves the current room and cleans up resources.
     */
    fun leaveRoom() {
        socket?.disconnect()
        socket = null
        Log.d(TAG, "Left room and disconnected")
    }

    interface CastEventListener {
        fun onJoined(data: JSONObject)
        fun onError(message: String)
        fun onPeerJoined(peerId: String)
        fun onPeerLeft(peerId: String)
    }
}
