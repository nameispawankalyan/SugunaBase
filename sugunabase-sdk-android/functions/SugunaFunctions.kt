package co.suguna.sdk.functions

/**
 * Call Suguna Cloud Functions easily
 */
class SugunaFunctions private constructor() {
    companion object {
        @JvmStatic
        fun getInstance(): SugunaFunctions = SugunaFunctions()
    }

    /**
     * Call a function: .getHttpsCallable("helloWorld").call(data)
     */
    fun getHttpsCallable(functionName: String): HttpsCallable {
        return HttpsCallable(functionName)
    }
}

class HttpsCallable(private val name: String) {
    
    /**
     * Trigger the function with parameters
     */
    fun call(data: Map<String, Any>? = null, onComplete: (Map<String, Any>?, String?) -> Unit) {
        // Calls GET or POST https://api.suguna.co/v1/functions/$name
        println("Calling Cloud Function: $name with data $data")
    }
}
