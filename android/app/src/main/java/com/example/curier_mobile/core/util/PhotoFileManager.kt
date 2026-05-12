package com.example.curier_mobile.core.util

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Utility for managing photo files locally before upload.
 */
object PhotoFileManager {

    private const val PHOTO_DIR = "order_photos"
    private const val PHOTO_PREFIX = "ORDER_"
    private const val PHOTO_EXTENSION = ".jpg"

    fun createPhotoFile(context: Context, orderId: String): File {
        val photoDir = getPhotoDirectory(context)
        if (!photoDir.exists()) {
            photoDir.mkdirs()
        }

        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val safeOrderId = orderId.replace(Regex("[^A-Za-z0-9_-]"), "_")
        val fileName = "${PHOTO_PREFIX}${safeOrderId}_${timestamp}${PHOTO_EXTENSION}"

        return File(photoDir, fileName)
    }

    fun getPhotoFile(context: Context, orderId: String): File? {
        val photoDir = getPhotoDirectory(context)
        if (!photoDir.exists()) return null

        val safeOrderId = orderId.replace(Regex("[^A-Za-z0-9_-]"), "_")
        return photoDir.listFiles()
            ?.filter { it.name.startsWith("${PHOTO_PREFIX}${safeOrderId}_") }
            ?.maxByOrNull { it.lastModified() }
    }

    fun deletePhotoFile(file: File): Boolean {
        return if (file.exists()) {
            file.delete()
        } else {
            false
        }
    }

    private fun getPhotoDirectory(context: Context): File {
        return File(context.filesDir, PHOTO_DIR)
    }

    fun getAllPhotoFiles(context: Context): List<File> {
        val photoDir = getPhotoDirectory(context)
        return photoDir.listFiles()?.toList() ?: emptyList()
    }

    fun cleanupOldPhotos(context: Context, daysToKeep: Int = 30) {
        val photoDir = getPhotoDirectory(context)
        if (!photoDir.exists()) return

        val cutoffTime = System.currentTimeMillis() - (daysToKeep * 24 * 60 * 60 * 1000L)

        photoDir.listFiles()?.forEach { file ->
            if (file.lastModified() < cutoffTime) {
                file.delete()
            }
        }
    }
}
