package com.example.curier_mobile.presentation.photo

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.example.curier_mobile.R
import com.example.curier_mobile.core.util.PhotoFileManager
import com.example.curier_mobile.databinding.FragmentPhotoCaptureBinding
import com.example.curier_mobile.presentation.common.BaseFragment
import com.google.android.material.snackbar.Snackbar
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class PhotoCaptureFragment : BaseFragment<FragmentPhotoCaptureBinding>() {

    private val args: PhotoCaptureFragmentArgs by navArgs()

    private var imageCapture: ImageCapture? = null
    private lateinit var cameraExecutor: ExecutorService

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startCamera()
        } else {
            Snackbar.make(
                binding.root,
                R.string.camera_permission_required,
                Snackbar.LENGTH_LONG
            ).show()
            findNavController().navigateUp()
        }
    }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentPhotoCaptureBinding {
        return FragmentPhotoCaptureBinding.inflate(inflater, container, false)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cameraExecutor = Executors.newSingleThreadExecutor()
    }

    override fun setupUI() {
        binding.btnCapture.setOnClickListener {
            takePhoto()
        }

        binding.btnCancel.setOnClickListener {
            findNavController().navigateUp()
        }

        // Check camera permission
        if (allPermissionsGranted()) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    override fun observeViewModel() {
        // No ViewModel for this simple screen
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            // Preview
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(binding.previewView.surfaceProvider)
                }

            // Image capture
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            // Select back camera
            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                // Unbind all use cases before rebinding
                cameraProvider.unbindAll()

                // Bind use cases to camera
                cameraProvider.bindToLifecycle(
                    viewLifecycleOwner,
                    cameraSelector,
                    preview,
                    imageCapture
                )

            } catch (exc: Exception) {
                Log.e(TAG, "Camera binding failed", exc)
                Snackbar.make(
                    binding.root,
                    R.string.camera_initialization_failed,
                    Snackbar.LENGTH_LONG
                ).show()
            }

        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun takePhoto() {
        val imageCapture = imageCapture ?: return

        // Show loading
        binding.progressIndicator.visibility = View.VISIBLE
        binding.btnCapture.isEnabled = false

        // Create output file
        val photoFile = PhotoFileManager.createPhotoFile(
            requireContext(),
            args.orderId
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(requireContext()),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    binding.progressIndicator.visibility = View.GONE
                    binding.btnCapture.isEnabled = true

                    // Navigate back with photo path
                    val action = PhotoCaptureFragmentDirections
                        .actionPhotoCaptureFragmentToOrderDetailsFragment(
                            orderId = args.orderId,
                            photoPath = photoFile.absolutePath
                        )
                    findNavController().navigate(action)
                }

                override fun onError(exc: ImageCaptureException) {
                    binding.progressIndicator.visibility = View.GONE
                    binding.btnCapture.isEnabled = true

                    Log.e(TAG, "Photo capture failed: ${exc.message}", exc)
                    Snackbar.make(
                        binding.root,
                        R.string.photo_capture_failed,
                        Snackbar.LENGTH_LONG
                    ).show()
                }
            }
        )
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(
            requireContext(), it
        ) == PackageManager.PERMISSION_GRANTED
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    companion object {
        private const val TAG = "PhotoCaptureFragment"
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }
}
