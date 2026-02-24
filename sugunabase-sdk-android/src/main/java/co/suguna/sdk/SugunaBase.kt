package co.suguna.sdk

import android.content.Context
import android.util.Log

object SugunaBase {
    private var context: Context? = null
    private var projectId: String? = null
    internal var baseUrl: String = "https://api.suguna.co/"
    internal var castBaseUrl: String = "https://cast.suguna.co/"

    fun initialize(context: Context, projectId: String, baseUrl: String? = null, castBaseUrl: String? = null) {
        this.context = context.applicationContext
        this.projectId = projectId
        baseUrl?.let { this.baseUrl = it }
        this.castBaseUrl = castBaseUrl ?: this.baseUrl // Default to main baseUrl if not provided
        Log.d("SugunaBase", "Initialized. Base: ${this.baseUrl}, Cast: ${this.castBaseUrl}")
    }

    fun getContext(): Context {
        return context ?: throw IllegalStateException("SugunaBase not initialized. Call initialize() first.")
    }

    fun getProjectId(): String {
        return projectId ?: throw IllegalStateException("SugunaBase not initialized. Call initialize() first.")
    }
}
