package co.suguna.sdk.storage

import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.network.SugunaNetwork
import co.suguna.sdk.network.UploadResponse
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import java.io.File

class SugunaStorage private constructor() {
    companion object {
        private var instance: SugunaStorage? = null
        
        fun getInstance(): SugunaStorage {
            if (instance == null) {
                instance = SugunaStorage()
            }
            return instance!!
        }
    }

    fun uploadFile(file: File, folderPath: String, callback: (Result<UploadResponse>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        val extension = android.webkit.MimeTypeMap.getFileExtensionFromUrl(file.path)
        val mimeType = android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"
        
        val requestFile = file.asRequestBody(mimeType.toMediaTypeOrNull())
        val body = MultipartBody.Part.createFormData("file", file.name, requestFile)
        val folderBody = folderPath.trim('/').toRequestBody("text/plain".toMediaTypeOrNull())

        SugunaNetwork.api.uploadFile("Bearer ${user.token}", folderBody, body).enqueue(object : Callback<UploadResponse> {
            override fun onResponse(call: Call<UploadResponse>, response: Response<UploadResponse>) {
                if (response.isSuccessful && response.body() != null) {
                    callback(Result.success(response.body()!!))
                } else {
                    callback(Result.failure(Exception("Error: ${response.code()}")))
                }
            }
            override fun onFailure(call: Call<UploadResponse>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }
}
