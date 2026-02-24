package co.suguna.sdk.cast

import android.content.Context
import android.util.Log

object SugunaCast {
    private const val TAG = "SugunaCastSDK"
    private var isInitialized = false
    private var appId: String? = null

    fun initialize(context: Context, appId: String) {
        this.appId = appId
        this.isInitialized = true
        Log.d(TAG, "Suguna Cast SDK Initialized with App ID: $appId")
    }

    fun isReady(): Boolean = isInitialized
}
