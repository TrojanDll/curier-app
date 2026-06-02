package com.example.curier_mobile.presentation.orders

import android.content.Intent
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentOrderDetailsBinding
import com.example.curier_mobile.domain.model.OrderPriority
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.presentation.common.BaseFragment
import com.example.curier_mobile.presentation.ViewModelFactory
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
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
                order.customerPhone?.let { phone ->
                    makePhoneCall(phone)
                } ?: run {
                    Snackbar.make(binding.root, "Номер телефона не указан", Snackbar.LENGTH_SHORT).show()
                }
            }
        }

        // SMS button
        binding.btnSms.setOnClickListener {
            viewModel.uiState.value.order?.let { order ->
                order.customerPhone?.let { phone ->
                    sendSms(phone)
                } ?: run {
                    Snackbar.make(binding.root, "Номер телефона не указан", Snackbar.LENGTH_SHORT).show()
                }
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

        // Cancel order button — открывает диалог с вводом причины отмены
        binding.btnCancelOrder.setOnClickListener {
            showCancelOrderDialog()
        }

        // Photo capture button
        binding.btnTakePhoto.setOnClickListener {
            navigateToPhotoCapture()
        }

        // Если этот fragment воссоздан после возврата из PhotoCaptureFragment
        // (см. popUpToInclusive в nav_graph_main.xml), `args.photoPath` хранит
        // путь к снятому файлу. ViewModel сам гарантирует, что upload запустится
        // ровно один раз за свой жизненный цикл.
        viewModel.consumeCapturedPhotoPath(args.photoPath)
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

            binding.chipPriority.text = order.priority.displayName
            binding.chipPriority.setChipBackgroundColorResource(getPriorityColor(order.priority))

            binding.tvCustomerName.text = order.customerName
            binding.tvPhone.text = order.customerPhone ?: "Не указан"
            binding.tvDeliveryAddress.text = order.deliveryAddress

            // Format assigned date
            binding.tvAssignedAt.text = order.assignedAt
                ?.let { getString(R.string.assigned_at_format, it) }
                ?: getString(R.string.not_specified)

            // Show notes if available
            if (!order.comments.isNullOrBlank()) {
                binding.cardNotes.visibility = View.VISIBLE
                binding.tvNotes.text = order.comments
            } else {
                binding.cardNotes.visibility = View.GONE
            }

            // Show cancellation reason when the order has been cancelled
            if (order.status == OrderStatus.CANCELLED && !order.cancellationReason.isNullOrBlank()) {
                binding.tvCancellationReason.visibility = View.VISIBLE
                binding.tvCancellationReason.text =
                    getString(R.string.cancellation_reason_format, order.cancellationReason)
            } else {
                binding.tvCancellationReason.visibility = View.GONE
            }
        }

        // Update status buttons visibility based on available transitions
        updateStatusButtons(
            state.availableStatusTransitions,
            state.isUpdatingStatus || state.isUploadingPhoto,
            state.canCancel
        )

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

        if (state.cancelSuccess) {
            Snackbar.make(binding.root, R.string.order_cancelled_successfully, Snackbar.LENGTH_SHORT).show()
            viewModel.clearCancelSuccess()
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

    private fun updateStatusButtons(
        availableTransitions: List<OrderStatus>,
        isUpdating: Boolean,
        canCancel: Boolean
    ) {
        // Hide all buttons first
        binding.btnStatusPickedUp.visibility = View.GONE
        binding.btnStatusNearCustomer.visibility = View.GONE
        binding.btnStatusDelivered.visibility = View.GONE
        binding.btnStatusReturned.visibility = View.GONE
        binding.btnTakePhoto.visibility = View.GONE
        binding.btnCancelOrder.visibility = View.GONE

        // Show only available transitions
        availableTransitions.forEach { status ->
            when (status) {
                OrderStatus.NEW, OrderStatus.ASSIGNED -> {
                    // ASSIGNED — стартовый статус для курьера, кнопок нет.
                    // NEW в available-списке не появляется, см. OrderStatus.getNextStatus.
                }
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
                OrderStatus.CANCELLED -> {
                    // Терминальный статус — forward-кнопок нет.
                }
            }
        }

        // Show photo button when order is delivered
        val currentOrder = viewModel.uiState.value.order
        if (currentOrder?.status == OrderStatus.DELIVERED) {
            binding.btnTakePhoto.visibility = View.VISIBLE
            binding.btnTakePhoto.isEnabled = !isUpdating
        }

        // Show cancel button while the order can still be aborted (before delivery)
        if (canCancel) {
            binding.btnCancelOrder.visibility = View.VISIBLE
            binding.btnCancelOrder.isEnabled = !isUpdating
        }
    }

    private fun getStatusColor(status: OrderStatus): Int {
        return when (status) {
            OrderStatus.NEW -> android.R.color.darker_gray
            OrderStatus.ASSIGNED -> android.R.color.holo_purple
            OrderStatus.PICKED_UP -> android.R.color.holo_blue_light
            OrderStatus.NEAR_CUSTOMER -> android.R.color.holo_orange_light
            OrderStatus.DELIVERED -> android.R.color.holo_green_light
            OrderStatus.RETURNED -> android.R.color.darker_gray
            OrderStatus.CANCELLED -> android.R.color.holo_red_dark
        }
    }

    private fun getPriorityColor(priority: OrderPriority): Int {
        return when (priority) {
            OrderPriority.HIGH -> android.R.color.holo_red_light
            OrderPriority.NORMAL -> android.R.color.darker_gray
            OrderPriority.LOW -> android.R.color.holo_blue_light
        }
    }

    /**
     * Диалог отмёны заказа с обязательным вводом причины. Кнопка подтверждения
     * не закрывает диалог при пустом поле — показываем ошибку прямо в поле.
     */
    private fun showCancelOrderDialog() {
        val context = requireContext()
        val pad = (16 * resources.displayMetrics.density).toInt()

        val inputLayout = TextInputLayout(context).apply {
            hint = getString(R.string.cancel_order_reason_hint)
            boxBackgroundMode = TextInputLayout.BOX_BACKGROUND_OUTLINE
        }
        val input = TextInputEditText(context).apply {
            isSingleLine = false
            maxLines = 4
        }
        inputLayout.addView(input)

        val container = FrameLayout(context).apply {
            setPadding(pad, pad / 2, pad, 0)
            addView(inputLayout)
        }

        val dialog = MaterialAlertDialogBuilder(context)
            .setTitle(R.string.cancel_order_dialog_title)
            .setMessage(R.string.cancel_order_dialog_message)
            .setView(container)
            .setPositiveButton(R.string.cancel_order_confirm, null)
            .setNegativeButton(R.string.cancel_order_dismiss, null)
            .create()

        dialog.setOnShowListener {
            dialog
                .getButton(android.content.DialogInterface.BUTTON_POSITIVE)
                .setOnClickListener {
                    val reason = input.text?.toString()?.trim().orEmpty()
                    if (reason.isEmpty()) {
                        inputLayout.error = getString(R.string.cancel_order_reason_required)
                    } else {
                        viewModel.cancelOrder(reason)
                        dialog.dismiss()
                    }
                }
        }
        dialog.show()
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
        // Try to open Yandex Maps app first
        val yandexMapsIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("yandexmaps://maps.yandex.ru/?text=${Uri.encode(address)}")
            setPackage("ru.yandex.yandexmaps")
        }

        // Check if Yandex Maps is installed
        val packageManager = requireActivity().packageManager
        if (yandexMapsIntent.resolveActivity(packageManager) != null) {
            // Yandex Maps is installed, open it
            startActivity(yandexMapsIntent)
        } else {
            // Yandex Maps not installed, try web version
            openYandexMapsWeb(address)
        }
    }

    private fun openYandexMapsWeb(address: String) {
        // Open Yandex Maps web version in browser
        val webIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://yandex.ru/maps/?text=${Uri.encode(address)}")
        }

        try {
            startActivity(webIntent)
        } catch (e: Exception) {
            // Fallback to generic geo intent as last resort
            openGenericMaps(address)
        }
    }

    private fun openGenericMaps(address: String) {
        val genericIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("geo:0,0?q=${Uri.encode(address)}")
        }

        try {
            startActivity(genericIntent)
        } catch (e: Exception) {
            Snackbar.make(
                binding.root,
                getString(R.string.no_maps_app_available),
                Snackbar.LENGTH_LONG
            ).show()
        }
    }

    private fun navigateToPhotoCapture() {
        val action = OrderDetailsFragmentDirections
            .actionOrderDetailsFragmentToPhotoCaptureFragment(orderId = args.orderId)
        findNavController().navigate(action)
    }
}
