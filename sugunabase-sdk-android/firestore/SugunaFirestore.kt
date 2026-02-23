package co.suguna.sdk.firestore

/**
 * Firebase-like Firestore wrapper for SugunaBase
 */
class SugunaFirestore private constructor() {
    companion object {
        @JvmStatic
        fun getInstance(): SugunaFirestore = SugunaFirestore()
    }

    fun collection(path: String): CollectionReference {
        return CollectionReference(path)
    }
}

class CollectionReference(private val path: String) {
    
    // Filtering like Firebase: .whereEqualTo("category", "android")
    private var filterKey: String? = null
    private var filterValue: Any? = null

    fun whereEqualTo(field: String, value: Any): CollectionReference {
        this.filterKey = field
        this.filterValue = value
        return this
    }

    fun document(id: String): DocumentReference {
        return DocumentReference("$path/$id")
    }

    /**
     * Read Collection: db.collection("posts").get { ... }
     */
    fun get(onComplete: (List<Map<String, Any>>?, String?) -> Unit) {
        // Calls GET /v1/firestore/$path?key=$filterKey&value=$filterValue
    }
}

class DocumentReference(private val fullPath: String) {
    
    /**
     * CREATE / OVERWRITE: .set(data)
     */
    fun set(data: Any, onComplete: (Boolean, String?) -> Unit) {
        // Calls POST /v1/firestore/$fullPath
    }

    /**
     * READ: .get()
     */
    fun get(onComplete: (Map<String, Any>?, String?) -> Unit) {
        // Calls GET /v1/firestore/$fullPath
    }

    /**
     * UPDATE: .update(map)
     */
    fun update(data: Map<String, Any>, onComplete: (Boolean, String?) -> Unit) {
        // Calls PATCH /v1/firestore/$fullPath
    }

    /**
     * DELETE: .delete()
     */
    fun delete(onComplete: (Boolean, String?) -> Unit) {
        // Calls DELETE /v1/firestore/$fullPath
    }
}
