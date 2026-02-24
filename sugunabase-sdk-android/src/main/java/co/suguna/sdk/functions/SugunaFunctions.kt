package co.suguna.sdk.functions

import co.suguna.sdk.auth.SugunaAuth
import co.suguna.sdk.network.SugunaNetwork

class SugunaFunctions private constructor() {
    companion object {
        private var instance: SugunaFunctions? = null
        
        fun getInstance(): SugunaFunctions {
            if (instance == null) {
                instance = SugunaFunctions()
            }
            return instance!!
        }
    }

    /**
     * Calls a cloud function by name with provided data.
     */
    fun call(name: String, data: Map<String, Any> = emptyMap(), callback: (Result<Any>) -> Unit) {
        val user = SugunaAuth.getInstance().currentUser
        if (user == null) {
            callback(Result.failure(Exception("User not authenticated")))
            return
        }

        val projectId = co.suguna.sdk.SugunaBase.getProjectId()

        SugunaNetwork.api.callFunction("Bearer ${user.token}", projectId, name, data).enqueue(object : retrofit2.Callback<Any> {
            override fun onResponse(call: retrofit2.Call<Any>, response: retrofit2.Response<Any>) {
                if (response.isSuccessful && response.body() != null) {
                    callback(Result.success(response.body()!!))
                } else {
                    val error = response.errorBody()?.string() ?: "Function call failed"
                    callback(Result.failure(Exception(error)))
                }
            }
            override fun onFailure(call: retrofit2.Call<Any>, t: Throwable) {
                callback(Result.failure(t))
            }
        })
    }
}
