package co.suguna.app

import co.suguna.sdk.SugunaBase
import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.firestore.SugunaFirestore
import co.suguna.sdk.storage.SugunaStorage
import co.suguna.sdk.functions.SugunaFunctions
import java.io.File

class MainActivity {

    fun init() {
        SugunaBase.initialize(context, "my_project_id")
    }

    // --- AUTH EXAMPLES ---
    fun authWorkflows() {
        val auth = SugunaAuth.getInstance()

        // 1. Email Signup
        auth.createUserWithEmailAndPassword("new@mail.com", "pass123") { success, err -> }

        // 2. Google Login
        auth.signInWithGoogle("google_id_token_here") { success, err -> }

        // 3. Update Profile
        auth.updateProfile("Pawan Kalyan", "https://pic.url") { success -> }
    }

    // --- FIRESTORE CRUD EXAMPLES ---
    fun firestoreWorkflows() {
        val db = SugunaFirestore.getInstance()

        // CREATE / SET
        db.collection("users").document("pawan").set(mapOf("bio" to "Ready!")) { success, _ -> }

        // READ
        db.collection("users").document("pawan").get { data, error ->
            val bio = data?.get("bio")
        }

        // UPDATE
        db.collection("users").document("pawan").update(mapOf("bio" to "Updated!")) { s, _ -> }

        // DELETE
        db.collection("users").document("pawan").delete { s, _ -> }

        // QUERY / FILTER
        db.collection("posts")
            .whereEqualTo("status", "published")
            .get { list, err ->
                println("Found ${list?.size} posts")
            }
    }

    // --- STORAGE WORKFLOWS ---
    fun storageWorkflows() {
        val storage = SugunaStorage.getInstance()
        val file = File("local/path.jpg")

        // UPLOAD
        storage.getReference("profile/pawan.jpg").putFile(file) { success, url, error ->
            if (success) println("Download here: $url")
        }

        // DELETE
        storage.getReference("profile/pawan.jpg").delete { success, err -> }
    }

    // --- CLOUD FUNCTIONS ---
    fun callServerCode() {
        val params = mapOf("orderId" to "123", "amount" to 500)
        
        SugunaFunctions.getInstance()
            .getHttpsCallable("processPayment")
            .call(params) { response, error ->
                if (error == null) println("Payment Status: ${response?.get("status")}")
            }
    }
}
