# SugunaBase Developer Guide 🚀

SugunaBase is a powerful, lightweight, and professional alternative to Firebase. It provides a robust backend infrastructure for Android developers with modules for **Authentication**, **Suguna Firestore (NoSQL Document Store)**, and **Real-time Updates**.

---

## 🏗️ Core Architecture
- **Base URL**: `https://api.suguna.co`
- **SDK Type**: RESTful API + Socket.io for Real-time
- **Database**: PostgreSQL with JSONB (Highly scalable NoSQL feel)

---

## 🔐 1. Authentication
SugunaBase Auth handles user signups and logins securely.

### **Login Example (Kotlin)**
```kotlin
val loginData = hashMapOf("email" to "user@example.com", "password" to "secret123")
api.login(loginData).enqueue(object : Callback<AuthResponse> {
    override fun onResponse(call: Call<AuthResponse>, response: Response<AuthResponse>) {
        if (response.isSuccessful) {
            val token = response.body()?.token
            // Save token securely in SharedPreferences
        }
    }
    override fun onFailure(call: Call<AuthResponse>, t: Throwable) { /* handle error */ }
})
```

---

## 🔥 2. Suguna Firestore
A JSON document store that supports deeply nested paths and dynamic filtering.

### **A. Concept**
Firestore is organized into **Collections** and **Documents**.
- **Collection**: A folder (e.g., `users_profile`, `orders`)
- **Document**: An individual JSON object with a unique ID.

### **B. Deeply Nested Paths**
You can organize data as deep as you want:
- Path: `Wallet/Coins/Today` (Total 3 levels)
- Document ID: `user123`

### **C. Dynamic Filtering**
Search for documents based on specific fields without creating any indexes manually.

```kotlin
// Example: Get "Telugu" speaking users with "Age 25"
val filters = hashMapOf("language" to "Telugu", "age" to "25")

api.getCollectionDocuments(token, "users_profile", filters).enqueue(object : Callback<List<FirestoreDocument>> {
    override fun onResponse(call: Call<List<FirestoreDocument>>, response: Response<List<FirestoreDocument>>) {
        val users = response.body() // List only contains Telugu users of age 25
    }
    override fun onFailure(call: Call<List<FirestoreDocument>>, t: Throwable) { /* ... */ }
})
```

### **D. Set/Save Document**
```kotlin
val data = hashMapOf("profile_name" to "Pawan Kalyan", "coins" to "500")
api.setDocument(token, "users_profile", "unique_user_id", data).enqueue(...)
```

---

## 📡 3. Selective Real-time (Socket.io)
SugunaBase allows you to listen for real-time changes selectively. You don't have to listen to everything; only subscribe to what matters.

### **Subscribe to a Collection**
When you enter a specific screen (e.g., Wallet), you can join a "Room" for that specific data.

```kotlin
// Connect to Socket
val socket = IO.socket("https://api.suguna.co")
socket.connect()

// Join a specific room (Project ID + Collection Name)
val roomData = JSONObject()
roomData.put("project_id", 15)
roomData.put("collection", "wallet_updates")

socket.emit("subscribe_collection", roomData)

// Listen for updates
socket.on("firestore_update") { args ->
    val data = args[0] as JSONObject
    Log.d("RealTime", "New Data Received: $data")
    // Update UI immediately (e.g., Coin Balance)
}
```

---

## 🖥️ 4. Suguna Console
Manage your database visually via the Suguna Console:
- **URL**: [https://suguna.co](https://suguna.co)
- View all collections and nested documents.
- Search and modify data in real-time.

---

## 🛠️ Integration Checklist
1. Add **Retrofit** and **Socket.io** dependencies to your `build.gradle`.
2. Initialize `RetrofitClient` with `https://api.suguna.co/`.
3. Use the `Bearer` token in the `Authorization` header for all Firestore requests.
4. For nested paths, ensure slashes are properly handled (handled automatically by SugunaBase).

---
**Build with Confidence on SugunaBase!** 🚀
