package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import okhttp3.MultipartBody

/**
 * Photo upload DTO
 * Note: Photo is uploaded as multipart/form-data
 */

@JsonClass(generateAdapter = true)
data class PhotoUploadResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: PhotoData?
)

@JsonClass(generateAdapter = true)
data class PhotoData(
    @Json(name = "photo_url")
    val photoUrl: String,

    @Json(name = "uploaded_at")
    val uploadedAt: String // ISO 8601 timestamp
)
