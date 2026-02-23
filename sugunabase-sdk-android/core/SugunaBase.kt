package co.suguna.sdk

import android.content.Context

/**
 * SugunaBase Main Initialization Class
 */
object SugunaBase {
    private var projectId: String? = null
    private var baseUrl: String = "https://api.suguna.co"

    /**
     * Initialize SugunaBase in your Application class
     */
    fun initialize(context: Context, projectId: String) {
        this.projectId = projectId
        // In a real SDK, we would also initialize shared preferences to store tokens
    }

    fun getProjectId(): String {
        return projectId ?: throw IllegalStateException("SugunaBase not initialized. Call initialize() first.")
    }

    fun getBaseUrl(): String = baseUrl
}
