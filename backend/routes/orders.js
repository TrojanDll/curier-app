import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import {
  getActiveOrdersByCourier,
  getOrderById,
  updateOrderStatus,
  getOrderHistory
} from '../data/database.js';

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get active orders
router.get('/active', authenticateToken, (req, res) => {
  try {
    const orders = getActiveOrdersByCourier(req.user.id);

    res.json({
      success: true,
      message: 'Active orders retrieved',
      data: {
        orders: orders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          delivery_address: order.delivery_address,
          notes: order.notes,
          status: order.status,
          assigned_at: order.assigned_at
        }))
      }
    });
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

// Get order history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const orders = getOrderHistory(req.user.id);

    res.json({
      success: true,
      message: 'Order history retrieved',
      data: {
        orders: orders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_address: order.delivery_address,
          status: order.status,
          assigned_at: order.assigned_at,
          completed_at: order.completed_at
        }))
      }
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order history'
    });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to this courier
    if (order.courier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      message: 'Order retrieved',
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          delivery_address: order.delivery_address,
          notes: order.notes,
          status: order.status,
          assigned_at: order.assigned_at,
          updated_at: order.updated_at,
          completed_at: order.completed_at
        }
      }
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
});

// Update order status
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['assigned', 'picked_up', 'near_customer', 'delivered', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = getOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to this courier
    if (order.courier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedOrder = updateOrderStatus(orderId, status);

    res.json({
      success: true,
      message: 'Order status updated',
      data: {
        order: {
          id: updatedOrder.id,
          order_number: updatedOrder.order_number,
          status: updatedOrder.status,
          updated_at: updatedOrder.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Upload photo
router.post('/:id/photo', authenticateToken, upload.single('photo'), (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to this courier
    if (order.courier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Photo file is required'
      });
    }

    // In production, save photo to storage (S3, local filesystem, etc.)
    const photoUrl = `http://10.0.2.2:8080/uploads/${orderId}_${Date.now()}.jpg`;

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photo_url: photoUrl,
        uploaded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo'
    });
  }
});

export default router;
