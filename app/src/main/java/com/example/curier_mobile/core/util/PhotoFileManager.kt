package com.example.curier_mobile.core.util

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Utility for managing photo files
 */
object PhotoFileManager {

    private const val PHOTO_DIR = "order_photos"
    private const val PHOTO_PREFIX = "ORDER_"
    private const val PHOTO_EXTENSION = ".jpg"

    /**
     * Create a new photo file for an order
     */
    fun createPhotoFile(context: Context, orderId: Long): File {
        val photoDir = getPhotoDirectory(context)
        if (!photoDir.exists()) {
            photoDir.mkdirs()
        }

        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val fileName = "${PHOTO_PREFIX}${orderId}_${timestamp}${PHOTO_EXTENSION}"

        return File(photoDir, fileName)
    }

    /**
     * Get photo file for an order if it exists
     */
    fun getPhotoFile(context: Context, orderId: Long): File? {
        val photoDir = getPhotoDirectory(context)
        if (!photoDir.exists()) return null

        return photoDir.listFiles()
            ?.filter { it.name.startsWith("${PHOTO_PREFIX}${orderId}_") }
            ?.maxByOrNull { it.lastModified() }
    }

    /**
     * Delete photo file
     */
    fun deletePhotoFile(file: File): Boolean {
        return if (file.exists()) {
            file.delete()
        } else {
            false
        }
    }

    /**
     * Get photo directory
     */
    private fun getPhotoDirectory(context: Context): File {
        return File(context.filesDir, PHOTO_DIR)
    }

    /**
     * Get all photo files for cleanup
     */
    fun getAllPhotoFiles(context: Context): List<File> {
        val photoDir = getPhotoDirectory(context)
        return photoDir.listFiles()?.toList() ?: emptyList()
    }

    /**
     * Clean up old photos (older than 30 days)
     */
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
