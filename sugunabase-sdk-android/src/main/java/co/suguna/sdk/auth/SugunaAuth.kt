package co.suguna.sdk.auth

import android.content.Context
import co.suguna.sdk.SugunaBase
import co.suguna.sdk.network.AppLoginRequest
import co.suguna.sdk.network.AppLoginResponse
import co.suguna.sdk.network.ProjectStatusResponse
import co.suguna.sdk.network.SugunaNetwork
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SugunaAuth private constructor() {
    private val sharedPref = SugunaBase.getContext().getSharedPreferences("SugunaAuthPrefs", Context.MODE_PRIVATE)

    companion object {
        private var instance: SugunaAuth? = null
        
        fun getInstance(): SugunaAuth {
            if (instance == null) {
                instance = SugunaAuth()
            }
            return instance!!
        }
    }

    val currentUser: SugunaUser?
        get() {
            val token = sharedPref.getString("token", null) ?: return null
            return SugunaUser(
                uid = sharedPref.getString("user_id", "") ?: "",
                email = sharedPref.getString("email", "") ?: "",
                displayName = sharedPref.getString("user_name", "") ?: "",
                photoUrl = sharedPref.getString("profile_pic", "") ?: "",
                token = token
            )
        }

    fun checkProjectStatus(projectId: String, callback: (Result<ProjectStatusResponse>) -> Unit) {
        SugunaNetwork.api.checkProjectStatus(projectId).enqueue(object : Callback<ProjectStatusResponse> {
            override fun onResponse(call: Call<ProjectStatusResponse>, response: Response<ProjectStatusResponse>) {
                if (response.isSuccessful && response.body() != null) {
                    callback(Result.success(response.body()!!))
                } else {
                    callback(Result.failure(Exception("Error: ${response.code()}")))
                }
            }
            override fun onFailure(call: Call<ProjectStatusResponse>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }

    fun login(request: AppLoginRequest, callback: (Result<SugunaUser>) -> Unit) {
        SugunaNetwork.api.appLogin(request).enqueue(object : Callback<AppLoginResponse> {
            override fun onResponse(call: Call<AppLoginResponse>, response: Response<AppLoginResponse>) {
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val user = SugunaUser(
                        uid = body.user.id,
                        email = body.user.email,
                        displayName = body.user.name,
                        photoUrl = body.user.profile_pic,
                        token = body.token
                    )
                    saveUser(user)
                    callback(Result.success(user))
                } else {
                    val error = response.errorBody()?.string() ?: "Login failed"
                    callback(Result.failure(Exception(error)))
                }
            }
            override fun onFailure(call: Call<AppLoginResponse>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }

    /**
     * Simplified helper for Google Sign-In integration
     */
    fun signInWithGoogle(projectId: String, email: String, googleId: String, name: String, photoUrl: String?, callback: (Result<SugunaUser>) -> Unit) {
        val request = AppLoginRequest(
            project_id = projectId,
            email = email,
            name = name,
            photo_url = photoUrl,
            google_id = googleId,
            provider = "google"
        )
        login(request, callback)
    }

    fun saveUser(user: SugunaUser) {
        with(sharedPref.edit()) {
            putString("token", user.token)
            putString("user_id", user.uid)
            putString("user_name", user.displayName)
            putString("email", user.email)
            putString("profile_pic", user.photoUrl)
            apply()
        }
    }

    fun signOut() {
        with(sharedPref.edit()) {
            clear()
            apply()
        }
    }
}
