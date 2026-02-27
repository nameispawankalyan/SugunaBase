package co.suguna.sdk.network

import com.google.gson.annotations.SerializedName

data class AppLoginRequest(
    val project_id: String,
    val email: String,
    val name: String,
    val photo_url: String?,
    val google_id: String?,
    val provider: String
)

data class AppLoginResponse(
    val user: ApiUser,
    val token: String
)

data class ApiUser(
    val id: String,
    val email: String,
    val name: String,
    val profile_pic: String?
)

data class ProjectStatusResponse(
    val exists: Boolean,
    val active: Boolean
)

data class CastTokenRequest(
    val app_id: String,
    val app_secret: String,
    val room_id: String,
    val uid: String,
    val role: String = "broadcaster",
    val type: String = "video_call"
)

data class CastTokenResponse(
    val token: String
)

data class MessagingTokenRequest(
    val fcm_token: String,
    val device_id: String? = null,
    val platform: String = "android"
)

data class FirestoreDocument(
    val document_id: String,
    val data: Map<String, Any>
)

data class UploadResponse(
    val message: String,
    val data: StorageFile?
)

data class StorageFile(
    val id: Int,
    val project_id: String,
    val folder_path: String?,
    val file_name: String,
    val file_url: String,
    val file_type: String?,
    val file_size: Long,
    val created_at: String
)
