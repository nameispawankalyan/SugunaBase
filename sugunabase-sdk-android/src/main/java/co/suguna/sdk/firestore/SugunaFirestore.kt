package co.suguna.sdk.firestore

import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.network.SugunaNetwork
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SugunaFirestore private constructor() {
    companion object {
        private var instance: SugunaFirestore? = null
        
        fun getInstance(): SugunaFirestore {
            if (instance == null) {
                instance = SugunaFirestore()
            }
            return instance!!
        }
    }

    fun collection(collectionPath: String): CollectionReference {
        return CollectionReference(collectionPath)
    }
}

class CollectionReference(private val path: String) {
    fun document(docId: String): DocumentReference {
        return DocumentReference("$path/$docId")
    }

    fun getDocuments(filters: Map<String, String> = emptyMap(), callback: (Result<List<co.suguna.sdk.network.FirestoreDocument>>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        SugunaNetwork.api.getCollectionDocuments("Bearer ${user.token}", path, filters).enqueue(object : retrofit2.Callback<List<co.suguna.sdk.network.FirestoreDocument>> {
            override fun onResponse(call: retrofit2.Call<List<co.suguna.sdk.network.FirestoreDocument>>, response: retrofit2.Response<List<co.suguna.sdk.network.FirestoreDocument>>) {
                if (response.isSuccessful && response.body() != null) {
                    val documents = response.body()!!
                    // Cache the collection data
                    FirestoreCache.saveCollection(path, documents)
                    callback(Result.success(documents))
                } else {
                    // Try to return from cache if network fails
                    val cached = FirestoreCache.getCollection(path)
                    if (cached != null) {
                        callback(Result.success(cached))
                    } else {
                        callback(Result.failure(Exception("Error: ${response.code()}")))
                    }
                }
            }
            override fun onFailure(call: retrofit2.Call<List<co.suguna.sdk.network.FirestoreDocument>>, t: Throwable) {
                // Return from cache on network failure
                val cached = FirestoreCache.getCollection(path)
                if (cached != null) {
                    callback(Result.success(cached))
                } else {
                    callback(Result.failure(t))
                }
            }
        })
    }
}

class DocumentReference(private val path: String) {
    fun get(callback: (Result<SugunaDocumentSnapshot>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        val parts = path.split("/")
        if (parts.size < 2) {
            callback(Result.failure(Exception("Invalid path: $path")))
            return
        }
        val collection = parts[0]
        val documentSlice = parts.subList(1, parts.size).joinToString("/")
        
        SugunaNetwork.api.getDocument("Bearer ${user.token}", collection, documentSlice).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful && response.body() != null) {
                    val data = response.body() as Map<String, Any>
                    val snapshot = SugunaDocumentSnapshot(parts.last(), data)
                    // Save to local cache
                    FirestoreCache.saveDocument(path, data)
                    callback(Result.success(snapshot))
                } else {
                    // Try to return from cache if offline or 404
                    val cachedData = FirestoreCache.getDocument(path)
                    if (cachedData != null) {
                        callback(Result.success(SugunaDocumentSnapshot(parts.last(), cachedData)))
                    } else {
                        callback(Result.failure(Exception("Error: ${response.code()}")))
                    }
                }
            }
            override fun onFailure(call: Call<Any>, t: Throwable) {
                // Offline fallback
                val cachedData = FirestoreCache.getDocument(path)
                if (cachedData != null) {
                    callback(Result.success(SugunaDocumentSnapshot(parts.last(), cachedData)))
                } else {
                    callback(Result.failure(t))
                }
            }
        })
    }

    fun set(data: Map<String, String>, callback: (Result<Any>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        val parts = path.split("/")
        val collection = parts[0]
        val documentSlice = parts.subList(1, parts.size).joinToString("/")

        SugunaNetwork.api.setDocument("Bearer ${user.token}", collection, documentSlice, data).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful && response.body() != null) {
                    FirestoreCache.saveDocument(path, data as Map<String, Any>)
                    callback(Result.success(response.body()!!))
                } else {
                    callback(Result.failure(Exception("Error: ${response.code()}")))
                }
            }
            override fun onFailure(call: Call<Any>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }

    fun update(data: Map<String, String>, callback: (Result<Any>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        val parts = path.split("/")
        val collection = parts[0]
        val documentSlice = parts.subList(1, parts.size).joinToString("/")

        SugunaNetwork.api.updateDocument("Bearer ${user.token}", collection, documentSlice, data).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful && response.body() != null) {
                    // Update cache (Note: this is a simple replacement for now)
                    val current = FirestoreCache.getDocument(path) ?: emptyMap()
                    FirestoreCache.saveDocument(path, current + data)
                    callback(Result.success(response.body()!!))
                } else {
                    callback(Result.failure(Exception("Error: ${response.code()}")))
                }
            }
            override fun onFailure(call: Call<Any>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }

    fun delete(callback: (Result<Any>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        SugunaNetwork.api.deleteDocument("Bearer ${user.token}", path).enqueue(object : Callback<Any> {
            override fun onResponse(call: Call<Any>, response: Response<Any>) {
                if (response.isSuccessful) {
                    FirestoreCache.removeDocument(path)
                    callback(Result.success(response.body() ?: "Deleted"))
                } else {
                    callback(Result.failure(Exception("Error: ${response.code()}")))
                }
            }
            override fun onFailure(call: Call<Any>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }
}

/**
 * Internal Cache mechanism for SugunaFirestore
 */
internal object FirestoreCache {
    private val prefs by lazy {
        co.suguna.sdk.SugunaBase.getContext().getSharedPreferences("SugunaFirestoreCache", android.content.Context.MODE_PRIVATE)
    }
    private val gson = com.google.gson.Gson()

    fun saveDocument(path: String, data: Map<String, Any>) {
        prefs.edit().putString("doc_$path", gson.toJson(data)).apply()
    }

    fun getDocument(path: String): Map<String, Any>? {
        val json = prefs.getString("doc_$path", null) ?: return null
        val type = object : com.google.gson.reflect.TypeToken<Map<String, Any>>() {}.type
        return gson.fromJson(json, type)
    }

    fun removeDocument(path: String) {
        prefs.edit().remove("doc_$path").apply()
    }

    fun saveCollection(path: String, documents: List<co.suguna.sdk.network.FirestoreDocument>) {
        prefs.edit().putString("col_$path", gson.toJson(documents)).apply()
    }

    fun getCollection(path: String): List<co.suguna.sdk.network.FirestoreDocument>? {
        val json = prefs.getString("col_$path", null) ?: return null
        val type = object : com.google.gson.reflect.TypeToken<List<co.suguna.sdk.network.FirestoreDocument>>() {}.type
        return gson.fromJson(json, type)
    }
}

data class SugunaDocumentSnapshot(
    val id: String,
    val data: Map<String, Any>?
) {
    fun exists(): Boolean = data != null
    
    fun getString(field: String): String? = data?.get(field)?.toString()
    
    fun getBoolean(field: String): Boolean = data?.get(field) == true || data?.get(field) == "true"
}
