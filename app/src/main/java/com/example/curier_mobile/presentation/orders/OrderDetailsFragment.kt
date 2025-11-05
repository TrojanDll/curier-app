package com.example.curier_mobile.presentation.orders

import android.content.Intent
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentOrderDetailsBinding
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.presentation.common.BaseFragment
import com.example.curier_mobile.presentation.ViewModelFactory
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class OrderDetailsFragment : BaseFragment<FragmentOrderDetailsBinding>() {

    private val args: OrderDetailsFragmentArgs by navArgs()

    private val viewModel: OrderDetailsViewModel by viewModels {
        ViewModelFactory(orderId = args.orderId)
    }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentOrderDetailsBinding {
        return FragmentOrderDetailsBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Call button
        binding.btnCall.setOnClickListener {
            viewModel.uiState.value.order?.let { order ->
                makePhoneCall(order.customerPhone)
            }
        }

        // SMS button
        binding.btnSms.setOnClickListener {
            viewModel.uiState.value.order?.let { order ->
                sendSms(order.customerPhone)
            }
        }

        // Open map button
        binding.btnOpenMap.setOnClickListener {
            viewModel.uiState.value.order?.let { order ->
                openInMaps(order.deliveryAddress)
            }
        }

        // Status update buttons
        binding.btnStatusPickedUp.setOnClickListener {
            viewModel.updateOrderStatus(OrderStatus.PICKED_UP)
        }

        binding.btnStatusNearCustomer.setOnClickListener {
            viewModel.updateOrderStatus(OrderStatus.NEAR_CUSTOMER)
        }

        binding.btnStatusDelivered.setOnClickListener {
            viewModel.updateOrderStatus(OrderStatus.DELIVERED)
        }

        binding.btnStatusReturned.setOnClickListener {
            viewModel.updateOrderStatus(OrderStatus.RETURNED)
        }

        // Photo capture button
        binding.btnTakePhoto.setOnClickListener {
            navigateToPhotoCapture()
        }

        // Check if photo was captured
        args.photoPath?.let { photoPath ->
            handleCapturedPhoto(photoPath)
        }
    }

    override fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    updateUI(state)
                }
            }
        }
    }

    private fun updateUI(state: OrderDetailsUiState) {
        // Loading state
        binding.progressIndicator.visibility = if (state.isLoading) View.VISIBLE else View.GONE
        binding.scrollView.visibility = if (state.isLoading) View.GONE else View.VISIBLE
        binding.statusButtonsContainer.visibility = if (state.isLoading) View.GONE else View.VISIBLE

        // Order details
        state.order?.let { order ->
            binding.tvOrderNumber.text = getString(R.string.order_number_format, order.orderNumber)
            binding.chipStatus.text = order.status.displayName
            binding.chipStatus.setChipBackgroundColorResource(getStatusColor(order.status))

            binding.tvCustomerName.text = order.customerName
            binding.tvPhone.text = order.customerPhone
            binding.tvDeliveryAddress.text = order.deliveryAddress

            // Format assigned date
            binding.tvAssignedAt.text = getString(R.string.assigned_at_format, order.assignedAt)

            // Show notes if available
            if (!order.comments.isNullOrBlank()) {
                binding.cardNotes.visibility = View.VISIBLE
                binding.tvNotes.text = order.comments
            } else {
                binding.cardNotes.visibility = View.GONE
            }
        }

        // Update status buttons visibility based on available transitions
        updateStatusButtons(state.availableStatusTransitions, state.isUpdatingStatus || state.isUploadingPhoto)

        // Show uploading indicator
        if (state.isUploadingPhoto) {
            binding.progressIndicator.visibility = View.VISIBLE
        } else if (!state.isLoading) {
            binding.progressIndicator.visibility = View.GONE
        }

        // Show success messages
        if (state.statusUpdateSuccess) {
            Snackbar.make(binding.root, R.string.status_updated_successfully, Snackbar.LENGTH_SHORT).show()
            viewModel.clearStatusUpdateSuccess()
        }

        if (state.photoUploadSuccess) {
            Snackbar.make(binding.root, R.string.photo_uploaded_successfully, Snackbar.LENGTH_SHORT).show()
            viewModel.clearPhotoUploadSuccess()
        }

        // Show error
        state.error?.let { error ->
            Snackbar.make(binding.root, error, Snackbar.LENGTH_LONG).show()
            viewModel.clearError()
        }
    }

    private fun updateStatusButtons(availableTransitions: List<OrderStatus>, isUpdating: Boolean) {
        // Hide all buttons first
        binding.btnStatusPickedUp.visibility = View.GONE
        binding.btnStatusNearCustomer.visibility = View.GONE
        binding.btnStatusDelivered.visibility = View.GONE
        binding.btnStatusReturned.visibility = View.GONE
        binding.btnTakePhoto.visibility = View.GONE

        // Show only available transitions
        availableTransitions.forEach { status ->
            when (status) {
                OrderStatus.PICKED_UP -> {
                    binding.btnStatusPickedUp.visibility = View.VISIBLE
                    binding.btnStatusPickedUp.isEnabled = !isUpdating
                }
                OrderStatus.NEAR_CUSTOMER -> {
                    binding.btnStatusNearCustomer.visibility = View.VISIBLE
                    binding.btnStatusNearCustomer.isEnabled = !isUpdating
                }
                OrderStatus.DELIVERED -> {
                    binding.btnStatusDelivered.visibility = View.VISIBLE
                    binding.btnStatusDelivered.isEnabled = !isUpdating
                }
                OrderStatus.RETURNED -> {
                    binding.btnStatusReturned.visibility = View.VISIBLE
                    binding.btnStatusReturned.isEnabled = !isUpdating
                }
            }
        }

        // Show photo button when order is delivered
        val currentOrder = viewModel.uiState.value.order
        if (currentOrder?.status == OrderStatus.DELIVERED) {
            binding.btnTakePhoto.visibility = View.VISIBLE
            binding.btnTakePhoto.isEnabled = !isUpdating
        }
    }

    private fun getStatusColor(status: OrderStatus): Int {
        return when (status) {
            OrderStatus.PICKED_UP -> android.R.color.holo_blue_light
            OrderStatus.NEAR_CUSTOMER -> android.R.color.holo_orange_light
            OrderStatus.DELIVERED -> android.R.color.holo_green_light
            OrderStatus.RETURNED -> android.R.color.darker_gray
        }
    }

    private fun makePhoneCall(phoneNumber: String) {
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phoneNumber")
        }
        startActivity(intent)
    }

    private fun sendSms(phoneNumber: String) {
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("smsto:$phoneNumber")
        }
        startActivity(intent)
    }

    private fun openInMaps(address: String) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("geo:0,0?q=${Uri.encode(address)}")
        }
        startActivity(intent)
    }

    private fun navigateToPhotoCapture() {
        val action = OrderDetailsFragmentDirections
            .actionOrderDetailsFragmentToPhotoCaptureFragment(orderId = args.orderId)
        findNavController().navigate(action)
    }

    private fun handleCapturedPhoto(photoPath: String) {
        // Upload photo to server
        viewModel.uploadPhoto(photoPath)
    }
}
