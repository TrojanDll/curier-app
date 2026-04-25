package com.example.curier_mobile.presentation.orders

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.curier_mobile.databinding.ItemOrderBinding
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * RecyclerView adapter for orders list
 */
class OrderAdapter(
    private val onOrderClick: (Order) -> Unit
) : ListAdapter<Order, OrderAdapter.OrderViewHolder>(OrderDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return OrderViewHolder(binding, onOrderClick)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class OrderViewHolder(
        private val binding: ItemOrderBinding,
        private val onOrderClick: (Order) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(order: Order) {
            binding.apply {
                tvOrderNumber.text = "Заказ #${order.orderNumber}"
                tvCustomerName.text = order.customerName
                tvDeliveryAddress.text = order.deliveryAddress
                tvPhone.text = order.customerPhone ?: "Не указан"
                tvAssignedAt.text = "Назначен: ${formatTime(order.assignedAt)}"

                // Status chip
                chipStatus.text = order.status.displayName
                chipStatus.setChipBackgroundColorResource(getStatusColor(order.status))

                // Click listener
                root.setOnClickListener {
                    onOrderClick(order)
                }
            }
        }

        private fun formatTime(isoTimestamp: String): String {
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                val date = inputFormat.parse(isoTimestamp)
                date?.let { outputFormat.format(it) } ?: isoTimestamp
            } catch (e: Exception) {
                isoTimestamp
            }
        }

        private fun getStatusColor(status: OrderStatus): Int {
            return when (status) {
                OrderStatus.ASSIGNED -> android.R.color.holo_purple
                OrderStatus.PICKED_UP -> android.R.color.holo_blue_light
                OrderStatus.NEAR_CUSTOMER -> android.R.color.holo_orange_light
                OrderStatus.DELIVERED -> android.R.color.holo_green_light
                OrderStatus.RETURNED -> android.R.color.darker_gray
            }
        }
    }

    class OrderDiffCallback : DiffUtil.ItemCallback<Order>() {
        override fun areItemsTheSame(oldItem: Order, newItem: Order): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Order, newItem: Order): Boolean {
            return oldItem == newItem
        }
    }
}
