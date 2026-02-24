package co.suguna.sdk.auth

data class SugunaUser(
    val uid: String,
    val email: String,
    val displayName: String,
    val photoUrl: String?,
    val token: String
)
