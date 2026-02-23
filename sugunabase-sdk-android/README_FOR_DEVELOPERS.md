# 🚀 SugunaBase Android SDK Guide

Integrate SugunaBase into your Android app in minutes.

## 📦 1. Installation

Add the following to your `build.gradle` (Module: app):

```gradle
dependencies {
    implementation 'co.suguna:sdk:1.0.0'
}
```

## ⚙️ 2. Initialization

Initialize SugunaBase in your `Application` class or `MainActivity`:

```kotlin
SugunaBase.initialize(this, "YOUR_PROJECT_ID")
```

## 🔐 3. Authentication (Firebase style)

### Login
```kotlin
SugunaAuth.getInstance().signInWithEmailAndPassword("user@mail.com", "pass123") { success, error ->
    if (success) {
        val user = SugunaAuth.getInstance().currentUser
        println("User UID: ${user?.uid}")
    }
}
```

## 🔥 4. Firestore (CRUD)

### Save Data
```kotlin
SugunaFirestore.getInstance()
    .collection("users")
    .document("pawan_123")
    .set(mapOf("name" to "Pawan Kalyan")) { success, error ->
        if (success) println("Saved!")
    }
```

## 📁 5. Storage (Files)

### Upload File
```kotlin
val file = File(path)
SugunaStorage.getInstance()
    .getReference("profile/my_pic.jpg")
    .putFile(file) { success, url, error ->
        if (success) println("Live Link: $url")
    }
```

## ⚡ 6. Cloud Functions

```kotlin
SugunaFunctions.getInstance()
    .getHttpsCallable("helloWorld")
    .call(mapOf("msg" to "Hi!")) { response, error ->
        // Handle result
    }
```
