# 🚀 SugunaBase Android SDK

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://developer.android.com)
[![API](https://img.shields.io/badge/API-21%2B-brightgreen.svg)](https://android-arsenal.com/api?level=21)

**SugunaBase** is a powerful, lightweight, and easy-to-use backend solution for Android developers. It provides Authentication, Firestore (NoSQL Database), Storage, Cloud Functions, and Real-time Video/Audio via Suguna Cast.

---

## 📦 1. Installation

Add the JitPack repository to your root `build.gradle` file:

```gradle
allprojects {
    repositories {
        ...
        maven { url 'https://jitpack.io' }
    }
}
```

Add the dependency to your app's `build.gradle`:

```gradle
dependencies {
    implementation 'com.github.SugunaBase:sugunabase-sdk-android:1.0.0'
}
```

---

## ⚙️ 2. Initialization

Initialize the SDK in your `Application` class or the `onCreate` method of your main activity:

```kotlin
import co.suguna.sdk.SugunaBase

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize SugunaBase
        SugunaBase.initialize(
            context = this,
            projectId = "YOUR_PROJECT_ID",
            baseUrl = "https://api.suguna.co/" // Optional: your self-hosted URL
        )
    }
}
```

---

## 🔐 3. Suguna Authentication

Handle user login, signup, and profile management seamlessly.

### Google Sign-In
```kotlin
val auth = SugunaAuth.getInstance()

auth.signInWithGoogle(
    projectId = 15,
    email = "user@gmail.com",
    googleId = "google_uid_123",
    name = "Pawan Kalyan",
    photoUrl = "https://example.com/photo.jpg"
) { result ->
    result.onSuccess { user ->
        Log.d("SugunaAuth", "Welcome ${user.displayName}!")
    }
    result.onFailure { error ->
        Log.e("SugunaAuth", "Login Failed: ${error.message}")
    }
}
```

### Get Current User & Logout
```kotlin
val user = SugunaAuth.getInstance().currentUser
if (user != null) {
    println("Active User: ${user.email}")
}

// Logout
SugunaAuth.getInstance().signOut()
```

---

## 🔥 4. Suguna Firestore (CRUD)

A flexible NoSQL document database.

### Create / Set Data
```kotlin
val db = SugunaFirestore.getInstance()

val userData = mapOf(
    "name" to "Pawan Kalyan",
    "role" to "Developer",
    "status" to "Active"
)

db.collection("users")
    .document("uid_123")
    .set(userData) { result ->
        result.onSuccess { println("Data Saved Successfully!") }
    }
```

### Read Data (Real-time & Offline Cache)
```kotlin
db.collection("users")
    .document("uid_123")
    .get { result ->
        result.onSuccess { snapshot ->
            if (snapshot.exists()) {
                val name = snapshot.getString("name")
                println("User Name: $name")
            }
        }
    }
```

### Update Data
```kotlin
db.collection("users")
    .document("uid_123")
    .update(mapOf("status" to "Offline")) { result ->
        result.onSuccess { println("Updated!") }
    }
```

### Delete Data
```kotlin
db.collection("users")
    .document("uid_123")
    .delete { result ->
        result.onSuccess { println("Deleted!") }
    }
```

### Fetch Collection with Filters
```kotlin
db.collection("users")
    .getDocuments(filters = mapOf("role" to "Developer")) { result ->
        result.onSuccess { docs ->
            docs.forEach { println("Found User: ${it.document_id}") }
        }
    }
```

---

## 📁 5. Suguna Storage

Upload and manage files with ease.

### Upload a File
```kotlin
val storage = SugunaStorage.getInstance()
val file = File(localFilePath)

storage.uploadFile(file, folderPath = "profiles/images") { result ->
    result.onSuccess { response ->
        println("File uploaded! Link: ${response.data.file_url}")
    }
    result.onFailure { error ->
        println("Upload failed: ${error.message}")
    }
}
```

---

## ⚡ 6. Suguna Functions

Run backend logic without managing servers.

```kotlin
val functions = SugunaFunctions.getInstance()

val data = mapOf("orderId" to "order_99")

functions.call("processPayment", data) { result ->
    result.onSuccess { response ->
        println("Function Response: $response")
    }
}
```

---

## 🎥 7. Suguna Cast (Video & Audio)

Real-time communication for calls and live streams.

```kotlin
val cast = SugunaCast.getInstance()

// Initialize Cast with your App ID
SugunaCast.initialize(context, "YOUR_CAST_APP_ID")

cast.joinRoom(
    roomId = "global_room",
    appId = "YOUR_CAST_APP_ID",
    appSecret = "YOUR_CAST_APP_SECRET",
    listener = object : SugunaCast.CastEventListener {
        override fun onJoined(data: JSONObject) {
            println("Joined Room!")
        }

        override fun onPeerJoined(data: JSONObject) {
            println("New friend joined")
        }

        override fun onPeerLeft(data: JSONObject) {
            println("Friend left")
        }

        override fun onMessage(from: String, message: String) {
            println("$from says: $message")
        }

        override fun onError(error: String) {
            println("Error: $error")
        }
    }
)
```

---

## 🛠️ Requirements
- Android 5.0 (API level 21) or higher
- Internet permission in `AndroidManifest.xml`

## 📄 License
Copyright © 2026 SugunaBase. Licensed under the Apache 2.0 License.
