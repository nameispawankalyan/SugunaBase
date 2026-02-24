package co.suguna.app

import android.util.Log
import co.suguna.sdk.SugunaBase
import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.firestore.SugunaFirestore
import co.suguna.sdk.storage.SugunaStorage
import co.suguna.sdk.functions.SugunaFunctions
import co.suguna.sdk.cast.SugunaCast
import org.json.JSONObject
import java.io.File

/**
 * Detailed Usage Example for SugunaBase Android SDK.
 * This file demonstrates real-world implementation of all SDK features.
 */
class UsageExample {

    fun init(context: android.content.Context) {
        // 1. Initialize Core SDK
        SugunaBase.initialize(context, "project_15")
        
        // 2. Initialize Suguna Cast
        SugunaCast.initialize(context, "cast_app_id_99")
    }

    /**
     * Authentication Workflows (Google Login & Session Management)
     */
    fun authWorkflows() {
        val auth = SugunaAuth.getInstance()

        // Google Login
        auth.signInWithGoogle(
            projectId = 15,
            email = "user@gmail.com",
            googleId = "google_12345",
            name = "Pawan Kalyan",
            photoUrl = "https://example.com/pawan.jpg"
        ) { result ->
            result.onSuccess { user ->
                Log.d("SugunaAuth", "Session Started: ${user.token}")
            }
        }

        // Check current session
        val currentUser = auth.currentUser
        if (currentUser != null) {
            Log.d("SugunaAuth", "User is logged in: ${currentUser.displayName}")
        }

        // Logout
        auth.signOut()
    }

    /**
     * Firestore CRUD Operations (NoSQL Database)
     */
    fun firestoreWorkflows() {
        val db = SugunaFirestore.getInstance()
        val docRef = db.collection("users").document("user_pawan")

        // 1. CREATE / SET
        val data = mapOf("bio" to "Power Star", "location" to "Andhra Pradesh")
        docRef.set(data) { result ->
            result.onSuccess { Log.d("SugunaFS", "Document Saved!") }
        }

        // 2. READ
        docRef.get { result ->
            result.onSuccess { snapshot ->
                if (snapshot.exists()) {
                    val bio = snapshot.getString("bio")
                    Log.d("SugunaFS", "Bio: $bio")
                }
            }
        }

        // 3. UPDATE
        docRef.update(mapOf("status" to "Busy")) { result ->
            result.onSuccess { Log.d("SugunaFS", "Updated!") }
        }

        // 4. DELETE
        docRef.delete { result ->
            result.onSuccess { Log.d("SugunaFS", "Deleted permanently") }
        }

        // 5. FETCH ENTIRE COLLECTION
        db.collection("posts").getDocuments(filters = mapOf("category" to "politics")) { result ->
            result.onSuccess { list ->
                Log.d("SugunaFS", "Found ${list.size} articles")
            }
        }
    }

    /**
     * File Storage Workflows
     */
    fun storageWorkflows() {
        val storage = SugunaStorage.getInstance()
        val file = File("/sdcard/image.jpg")

        // UPLOAD
        storage.uploadFile(file, folderPath = "profiles/2026") { result ->
            result.onSuccess { response ->
                Log.d("SugunaStorage", "Live URL: ${response.data.file_url}")
            }
        }
    }

    /**
     * Suguna Cloud Functions (Serverless logic)
     */
    fun callServerLogic() {
        val functions = SugunaFunctions.getInstance()
        val params = mapOf("userId" to "pawan_123", "action" to "verify_account")

        functions.call("verifyUser", params) { result ->
            result.onSuccess { response ->
                Log.d("SugunaFunctions", "Result: $response")
            }
        }
    }

    /**
     * Suguna Cast (Real-time Video/Audio Communication)
     */
    fun startCast() {
        val cast = SugunaCast.getInstance()

        cast.joinRoom(
            roomId = "main_hall",
            appId = "APP_ID",
            appSecret = "APP_SECRET",
            listener = object : SugunaCast.CastEventListener {
                override fun onJoined(data: JSONObject) {
                    Log.d("SugunaCast", "Camera is Live!")
                }

                override fun onPeerJoined(data: JSONObject) {
                    Log.d("SugunaCast", "Peer joined the call")
                }

                override fun onPeerLeft(data: JSONObject) {}
                override fun onMessage(from: String, message: String) {}
                override fun onError(error: String) {}
            }
        )
    }
}
