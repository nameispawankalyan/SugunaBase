package co.suguna.sdk.network

import co.suguna.sdk.SugunaBase
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

internal object SugunaNetwork {
    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(logging)
        .build()

    val api: SugunaBaseApiInterface by lazy {
        Retrofit.Builder()
            .baseUrl(SugunaBase.baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SugunaBaseApiInterface::class.java)
    }

    val castApi: SugunaBaseApiInterface by lazy {
        Retrofit.Builder()
            .baseUrl(SugunaBase.castBaseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SugunaBaseApiInterface::class.java)
    }
}
