package co.suguna.sdk.network

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Call
import retrofit2.http.*

interface SugunaBaseApiInterface {
    @POST("v1/auth/app-login")
    fun appLogin(@Body request: AppLoginRequest): Call<AppLoginResponse>

    @GET("v1/app/check-project/{id}")
    fun checkProjectStatus(@Path("id") id: Int): Call<ProjectStatusResponse>

    // Firestore Endpoints
    @GET("v1/firestore/{collection}/{document}")
    fun getDocument(
        @Header("Authorization") token: String,
        @Path("collection", encoded = true) collection: String,
        @Path("document") document: String
    ): Call<Any>

    @POST("v1/firestore/{collection}/{document}")
    fun setDocument(
        @Header("Authorization") token: String,
        @Path("collection", encoded = true) collection: String,
        @Path("document") document: String,
        @Body data: Map<String, String>
    ): Call<Any>

    @PATCH("v1/firestore/{collection}/{document}")
    fun updateDocument(
        @Header("Authorization") token: String,
        @Path("collection", encoded = true) collection: String,
        @Path("document") document: String,
        @Body data: Map<String, String>
    ): Call<Any>

    @GET("v1/firestore/{collection}")
    fun getCollectionDocuments(
        @Header("Authorization") token: String,
        @Path("collection", encoded = true) collection: String,
        @QueryMap filters: Map<String, String>
    ): Call<List<FirestoreDocument>>

    @DELETE("v1/firestore/{documentPath}")
    fun deleteDocument(
        @Header("Authorization") token: String,
        @Path("documentPath", encoded = true) documentPath: String
    ): Call<Any>

    // Storage Upload Endpoint
    @Multipart
    @POST("v1/storage/upload")
    fun uploadFile(
        @Header("Authorization") token: String,
        @Part("folder_path") folderPath: RequestBody,
        @Part file: MultipartBody.Part
    ): Call<UploadResponse>

    @POST("v1/cast/get-token")
    fun getCastToken(@Body request: CastTokenRequest): Call<CastTokenResponse>

    @POST("functions/run/{projectId}/{functionName}")
    fun callFunction(
        @Header("Authorization") token: String,
        @Path("projectId") projectId: String,
        @Path("functionName") functionName: String,
        @Body data: Map<String, Any>
    ): Call<Any>
    
    @POST("v1/messaging/register")
    fun registerMessagingToken(
        @Header("Authorization") token: String,
        @Body request: MessagingTokenRequest
    ): Call<Any>
}
