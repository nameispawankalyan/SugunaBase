package co.suguna.sdk.cast

import android.content.Context
import android.util.Log
import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.network.CastTokenRequest
import co.suguna.sdk.network.CastTokenResponse
import co.suguna.sdk.network.SugunaNetwork
import org.json.JSONObject
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SugunaCast private constructor() {

    interface CastEventListener {
        fun onJoined(data: JSONObject)
        fun onPeerJoined(data: JSONObject)
        fun onPeerLeft(data: JSONObject)
        fun onMessage(from: String, message: String)
        fun onError(error: String)
    }

    companion object {
        private const val TAG = "SugunaCastSDK"
        private var instance: SugunaCast? = null
        private var isInitialized = false
        private var appId: String? = null

        fun initialize(context: Context, appId: String) {
            this.appId = appId
            this.isInitialized = true
            Log.d(TAG, "Suguna Cast SDK Initialized with App ID: $appId")
        }

        fun getInstance(): SugunaCast {
            if (instance == null) {
                instance = SugunaCast()
            }
            return instance!!
        }
    }

    /**
     * Joins a room by first fetching a token automatically.
     */
    fun joinRoom(roomId: String, appId: String, appSecret: String, listener: CastEventListener) {
        if (!isInitialized) {
            listener.onError("SDK not initialized. Please call SugunaCast.initialize() first.")
            return
        }

        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            listener.onError("User not authenticated. Please log in first.")
            return
        }

        val tokenRequest = CastTokenRequest(
            app_id = appId,
            app_secret = appSecret,
            room_id = roomId,
            uid = user.uid,
            role = "broadcaster",
            type = "video_call"
        )

        Log.d(TAG, "Requesting token for room: $roomId")

        SugunaNetwork.castApi.getCastToken(tokenRequest).enqueue(object : Callback<CastTokenResponse> {
            override fun onResponse(call: Call<CastTokenResponse>, response: Response<CastTokenResponse>) {
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.token
                    Log.d(TAG, "Token received, joining room...")
                    joinRoomWithToken(roomId, token, listener)
                } else {
                    listener.onError("Failed to get cast token: ${response.message()}")
                }
            }

            override fun onFailure(call: Call<CastTokenResponse>, t: Throwable) {
                listener.onError("Network error: ${t.message}")
            }
        })
    }

    /**
     * Joins a room with an existing token.
     */
    fun joinRoomWithToken(roomId: String, token: String, listener: CastEventListener) {
        if (!isInitialized) {
            listener.onError("SDK not initialized. Please call SugunaCast.initialize() first.")
            return
        }

        Log.d(TAG, "Joining room: $roomId with token: $token")
        
        // Mocking a successful join
        // In a real implementation, this would connect via WebRTC/Socket.io
        val mockData = JSONObject().apply {
            put("status", "success")
            put("roomId", roomId)
        }
        listener.onJoined(mockData)
    }
}
