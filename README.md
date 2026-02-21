# SugunaBase Developer Guide 🚀

SugunaBase is a powerful, lightweight, and professional alternative to Firebase. It provides a robust backend infrastructure for Android developers with modules for **Authentication**, **Suguna Firestore (NoSQL Document Store)**, and **Suguna Storage**.

---

## 🏗️ Core Architecture
- **Base URL**: `https://api.suguna.co`
- **SDK Type**: RESTful API + Socket.io for Real-time
- **Database**: PostgreSQL with JSONB (Highly scalable NoSQL feel)

---

## 🔐 1. Authentication
Handles secure signups and logins.

### **Retrofit API Interfaces**
```kotlin
@POST("v1/auth/login")
fun login(@Body body: HashMap<String, String>): Call<AuthResponse>
```

### **Login Example (Kotlin)**
```kotlin
val loginData = hashMapOf("email" to "user@example.com", "password" to "secret123")
api.login(loginData).enqueue(object : Callback<AuthResponse> {
    override fun onResponse(call: Call<AuthResponse>, response: Response<AuthResponse>) {
        if (response.isSuccessful) {
            val token = response.body()?.token
            // Save token securely in SharedPreferences using MODE_PRIVATE
        }
    }
    override fun onFailure(call: Call<AuthResponse>, t: Throwable) { /* handle error */ }
})
```

---

## 🔥 2. Suguna Firestore (Database)
A JSON document store that supports deeply nested paths and dynamic filtering.

### **Retrofit API Interfaces**
```kotlin
@POST("v1/firestore/{collection}/{documentId}")
fun setDocument(@Header("Authorization") token: String, @Path("collection") col: String, @Path("documentId") docId: String, @Body data: Any): Call<Any>

@GET("v1/firestore/{collection}/{documentId}")
fun getDocument(@Header("Authorization") token: String, @Path("collection") col: String, @Path("documentId") docId: String): Call<Any>

@DELETE("v1/firestore/{collection}")
fun deleteDocument(@Header("Authorization") token: String, @Path("collection", encoded = true) path: String): Call<Any>
```

### **A. Concept**
Firestore is organized into **Collections** and **Documents**.
- **Collection**: A folder (e.g., `users_profile`, `orders`)
- **Document**: An individual JSON object with a unique ID inside that collection.

### **B. CRUD Operations (Step-by-Step)**

#### **Step 1: Save Real-World Data (ex: Image Meta Data)**
Use this to create a new document. E.g., You uploaded an image, got the URL, now save it with Captions!
```kotlin
val data = hashMapOf(
    "name" to "Pawan Kalyan",
    "language" to "Telugu",
    "caption" to "Loving the vibe!",
    "image_token_url" to "https://api.suguna.co/storage/projId/Images/photo.jpg?alt=media&token=xyz"
)
// Path: user_posts/post_123
api.setDocument("Bearer $token", "user_posts", "post_123", data).enqueue(...)
```

#### **Step 2: Read Single Document**
Fetch data for a specific document ID.
```kotlin
api.getDocument("Bearer $token", "user_posts", "post_123").enqueue(...)
```

#### **Step 3: Delete (Document or Collection)**
- **To delete a Document**: Pass the full path (e.g., `users/123`).
- **To delete a Collection**: Pass only the collection path (e.g., `users`).
```kotlin
api.deleteDocument("Bearer $token", "user_posts/post_123").enqueue(...)
```

---

## 📁 3. Suguna Storage (Files, Images, Videos)
Upload raw files to specific dynamic folders and get a tokenized URL to save in your Firestore!

### **Retrofit API Interfaces**
```kotlin
@Multipart
@POST("v1/storage/upload")
fun uploadFile(
    @Header("Authorization") token: String,
    @Part("folder_path") folderPath: RequestBody,
    @Part file: MultipartBody.Part
): Call<UploadResponse>
```

### **A. How Folders Work?**
You don't need to manually string up directories. Just pass a `folder_path` like `FriendZone/Telugu/Post/Images` and SugunaBase will automatically create all those nested folders and place your image safely inside!

### **B. Uploading (Step-by-Step)**

```kotlin
// 1. Prepare your File and Path
val file = File(cacheDir, "my_awesome_pic.jpg")
val requestFile = RequestBody.create(MediaType.parse("image/jpeg"), file)
val body = MultipartBody.Part.createFormData("file", file.name, requestFile)

// 2. Define exactly where it should go in Storage!
val folderPath = "FriendZone/Telugu/Post/Images"
val folderBody = RequestBody.create(MediaType.parse("text/plain"), folderPath)

// 3. Call the API
api.uploadFile("Bearer $token", folderBody, body).enqueue(object : Callback<UploadResponse> {
    override fun onResponse(call: Call<UploadResponse>, response: Response<UploadResponse>) {
        if (response.isSuccessful) {
            // MAGIC HAPPENS HERE:
            // Grab the Firebase-style Token URL!
            val accessUrl = response.body()?.data?.file_url 
            // e.g., https://api.suguna.co/.../my_awesome_pic.jpg?alt=media&token=abcd-1234
            
            // Now you can take this accessUrl and save it in Suguna Firestore! (See Firestore Step 1)
        }
    }
    override fun onFailure(call: Call<UploadResponse>, t: Throwable) { /* error */ }
})
```

### **C. Updating / Replacing a File**
If you want to replace an image at the same location:
Since each upload usually has a unique random filename to avoid clashes, the best way to "Replace" a file is:
1. Upload the New File (you get a **new** URL).
2. Update the user's Firestore Document to point to the **new URL**.
*(Optional: Delete the old file from Storage if needed).*

---

### **D. Deleting a File**
*Note: To delete from API outside console, you must hook up the file ID. Usually, simply removing the visual link from Firestore is enough. But if you must delete hard files:*
```kotlin
// Currently bulk delete is hooked up to Console, but you can build a Retrofit endpoint similar to:
@HTTP(method = "DELETE", path = "v1/console/projects/{id}/storage", hasBody = true)
fun deleteStorageItems(@Header("Authorization") token: String, @Path("id") projectId: String, @Body ids: Map<String, List<String>>): Call<Any>
```

---

## 🖥️ 4. Suguna Console
Manage your projects, auth, database, and storage visually:
- **Project URL**: [https://www.suguna.co](https://www.suguna.co)

---
**Build with Confidence on SugunaBase!** 🚀
