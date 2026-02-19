'use client';

import { ArrowLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function AndroidDocs() {
    const [copied, setCopied] = useState(false);

    const kotlinCode = `
// SugunaBase.kt

import android.content.Context
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

object SugunaBase {
    private const val BASE_URL = "http://api.suguna.co/v1"
    private val client = OkHttpClient()
    private val JSON = "application/json; charset=utf-8".toMediaType()
    
    // Store token securely (using SharedPreferences for simplicity)
    private var token: String? = null
    
    fun init(context: Context) {
        // Load token from SharedPreferences
        val prefs = context.getSharedPreferences("suguna_prefs", Context.MODE_PRIVATE)
        token = prefs.getString("auth_token", null)
    }

    // --- AUTHENTICATION ---

    fun login(email: String, pass: String, context: Context, callback: (Boolean, String?) -> Unit) {
        val json = JSONObject().apply {
            put("email", email)
            put("password", pass)
        }

        val body = json.toString().toRequestBody(JSON)
        val request = Request.Builder()
            .url("$BASE_URL/auth/login")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    val resStr = response.body?.string()
                    val jsonRes = JSONObject(resStr)
                    
                    // Save Token
                    token = jsonRes.getString("token")
                    val prefs = context.getSharedPreferences("suguna_prefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("auth_token", token).apply()
                    
                    callback(true, "Login Successful")
                } else {
                    callback(false, "Login Failed: \${response.code}")
                }
            }
        })
    }

    fun signup(email: String, pass: String, name: String, callback: (Boolean, String?) -> Unit) {
        val json = JSONObject().apply {
            put("email", email)
            put("password", pass)
            put("name", name)
        }

        val body = json.toString().toRequestBody(JSON)
        val request = Request.Builder()
            .url("$BASE_URL/auth/signup")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e.message)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    val resStr = response.body?.string()
                    callback(true, "User Created: " + resStr)
                } else {
                    callback(false, "Signup Failed: \${response.code}")
                }
            }
        })
    }

    // --- PROTECTED REQUESTS (Example) ---
    
    fun getProjects(callback: (String?) -> Unit) {
        if (token == null) {
            callback("Error: Not Authenticated")
            return
        }
        
        val request = Request.Builder()
            .url("$BASE_URL/projects")
            .header("Authorization", "Bearer \$token")
            .get()
            .build()
            
        client.newCall(request).enqueue(object : Callback {
             override fun onFailure(call: Call, e: IOException) { callback(null) }
             override fun onResponse(call: Call, response: Response) {
                 callback(response.body?.string())
             }
        })
    }
}
  `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(kotlinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Android Integration Guide</h1>
            <p className="text-gray-600 mb-8 border-b pb-8">
                Follow these steps to integrate SugunaBase Login & Auth into your Android application using Kotlin.
            </p>

            <div className="space-y-8">

                {/* Step 1 */}
                <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">1</div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Add Dependencies</h3>
                        <p className="text-gray-600 mt-2">Add OkHttp to your `build.gradle.kts` (app module).</p>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mt-3 font-mono text-sm">
                            implementation("com.squareup.okhttp3:okhttp:4.12.0")
                            implementation("com.google.android.gms:play-services-auth:20.7.0")
                        </div>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">2</div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-gray-900">Create SugunaBase Helper</h3>
                        <p className="text-gray-600 mt-2">Create a new Kotlin object `SugunaBase.kt`.</p>
                        <p className="text-sm text-gray-500 mb-4">This helper manages Login, Signup, and Token Storage.</p>

                        <div className="relative mt-3 group">
                            <div className="absolute right-4 top-4">
                                <button onClick={handleCopy} className="p-2 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white">
                                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                                </button>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-gray-800">
                                {kotlinCode}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">3</div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-gray-900">Use in LoginActivity</h3>
                        <p className="text-gray-600 mt-2">Example usage in your Activity:</p>
                        <div className="bg-gray-100 p-4 rounded-lg mt-3 font-mono text-sm text-gray-800 border border-gray-200">
                            {`// Create a button click listener
buttonLogin.setOnClickListener {
    val email = editTextEmail.text.toString()
    val password = editTextPassword.text.toString()

    SugunaBase.login(email, password, this) { success, message ->
        runOnUiThread {
            if (success) {
                Toast.makeText(this, "Login Success!", Toast.LENGTH_SHORT).show()
                // Navigate to MainActivity
            } else {
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            }
        }
    }
}`}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
