package co.suguna.sdk

import android.content.Context
import android.util.Log

object SugunaBase {
    private const val TAG = "SugunaBaseSDK"
    private var isInitialized = false

    fun initialize(context: Context, appId: String) {
        if (isInitialized) return
        
        Log.d(TAG, "SugunaBase SDK Initialized with App ID: $appId")
        isInitialized = true
    }

    fun getStatus(): String {
        return if (isInitialized) "SDK is ready!" else "SDK not initialized."
    }
}
