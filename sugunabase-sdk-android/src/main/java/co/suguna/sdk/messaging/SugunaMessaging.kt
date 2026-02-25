package co.suguna.sdk.messaging

import android.util.Log
import co.suguna.sdk.SugunaBase
import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.network.MessagingTokenRequest
import co.suguna.sdk.network.SugunaNetwork
import com.google.firebase.messaging.FirebaseMessaging
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SugunaMessaging private constructor() {

    companion object {
        private var instance: SugunaMessaging? = null

        @JvmStatic
        fun getInstance(): SugunaMessaging {
            if (instance == null) {
                instance = SugunaMessaging()
            }
            return instance!!
        }
    }

    fun getToken(callback: (String?) -> Unit) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("SugunaMessaging", "FCM token registration failed", task.exception)
                callback(null)
                return@addOnCompleteListener
            }
            val token = task.result
            callback(token)
        }
    }

    internal fun registerTokenOnServer(fcmToken: String) {
        val auth = SugunaAuth.getInstance()
        val token = auth.getToken() ?: return // Only register if user is logged in
        
        val request = MessagingTokenRequest(fcm_token = fcmToken)
        
        SugunaNetwork.api.registerMessagingToken("Bearer $token", request)
            .enqueue(object : Callback<Any> {
                override fun onResponse(call: Call<Any>, response: Response<Any>) {
                    if (response.isSuccessful) {
                        Log.d("SugunaMessaging", "Token registered on SugunaBase")
                    } else {
                        Log.e("SugunaMessaging", "Token registration failed: ${response.code()}")
                    }
                }

                override fun onFailure(call: Call<Any>, t: Throwable) {
                    Log.e("SugunaMessaging", "Token registration error", t)
                }
            })
    }
    
    fun subscribeToTopic(topic: String) {
        FirebaseMessaging.getInstance().subscribeToTopic(topic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Log.d("SugunaMessaging", "Subscribed to $topic")
                }
            }
    }

    fun unsubscribeFromTopic(topic: String) {
        FirebaseMessaging.getInstance().unsubscribeFromTopic(topic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Log.d("SugunaMessaging", "Unsubscribed from $topic")
                }
            }
    }
}
