package co.suguna.sdk.auth

import android.content.Intent

/**
 * Detailed SugunaUser Data Model
 */
data class SugunaUser(
    val uid: String,
    val email: String,
    val token: String,
    val displayName: String? = null,
    val photoUrl: String? = null
)

/**
 * Firebase-like Auth class for SugunaBase
 */
class SugunaAuth private constructor() {
    
    companion object {
        private var instance: SugunaAuth? = null
        
        @JvmStatic
        fun getInstance(): SugunaAuth {
            if (instance == null) instance = SugunaAuth()
            return instance!!
        }
    }

    var currentUser: SugunaUser? = null
        private set

    /**
     * Auth 1: Email Login
     */
    fun signInWithEmailAndPassword(email: String, pass: String, onComplete: (Boolean, String?) -> Unit) {
        // Calls POST /v1/auth/login
    }

    /**
     * Auth 2: Registration
     */
    fun createUserWithEmailAndPassword(email: String, pass: String, onComplete: (Boolean, String?) -> Unit) {
        // Calls POST /v1/auth/signup
    }

    /**
     * Auth 3: Google Login
     * @param idToken The token received from Google Sign-In Intent
     */
    fun signInWithGoogle(idToken: String, onComplete: (Boolean, String?) -> Unit) {
        // Calls POST /v1/auth/google
    }

    /**
     * Update Profile (Name, Photo)
     */
    fun updateProfile(name: String?, photoUrl: String?, onComplete: (Boolean) -> Unit) {
        // Calls PATCH /v1/auth/profile
    }

    fun signOut() {
        currentUser = null
    }
}
