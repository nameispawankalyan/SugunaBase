package co.suguna.sdk.messaging

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SugunaMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("SugunaSCM", "New token generated: $token")
        SugunaMessaging.getInstance().registerTokenOnServer(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d("SugunaSCM", "Message received from: ${remoteMessage.from}")

        // Check if message contains Suguna SCM data
        if (remoteMessage.data.isNotEmpty() && remoteMessage.data["suguna_scm"] == "true") {
            handleSugunaMessage(remoteMessage.data)
        }
    }

    private fun handleSugunaMessage(data: Map<String, String>) {
        val title = data["title"] ?: "Suguna Notification"
        val body = data["body"] ?: ""
        val imageUrl = data["image"]
        
        Log.d("SugunaSCM", "Handling SCM: $title - $body")
        
        // Show Local Notification
        NotificationHelper.showNotification(applicationContext, title, body, imageUrl, data)
    }
}
