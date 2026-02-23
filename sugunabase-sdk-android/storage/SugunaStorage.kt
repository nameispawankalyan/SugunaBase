package co.suguna.sdk.storage

import java.io.File

/**
 * Firebase-like Storage wrapper for SugunaBase
 */
class SugunaStorage private constructor() {
    companion object {
        @JvmStatic
        fun getInstance(): SugunaStorage = SugunaStorage()
    }

    fun getReference(path: String): StorageReference {
        return StorageReference(path)
    }
}

class StorageReference(private val path: String) {

    /**
     * UPLOAD: storage.getReference("pics/me.jpg").putFile(file)
     */
    fun putFile(file: File, onComplete: (Boolean, String?, String?) -> Unit) {
        // Calls POST /v1/storage/upload
        // Returns: Success, DownloadURL, Error
    }

    /**
     * READ Metadata / URL
     */
    fun getDownloadUrl(onComplete: (String?, String?) -> Unit) {
        // Calls GET /v1/storage/metadata/$path
    }

    /**
     * DELETE
     */
    fun delete(onComplete: (Boolean, String?) -> Unit) {
        // Calls DELETE /v1/storage/$path
    }
    
    /**
     * UPDATE (Re-upload)
     */
    fun updateFile(file: File, onComplete: (Boolean, String?, String?) -> Unit) {
        // Usually delete old and put new, or overwrite if supported
        putFile(file, onComplete)
    }
}
