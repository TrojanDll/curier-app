import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getStatistics } from '../data/database.js';

const router = express.Router();

// Get courier statistics
router.get('/statistics', authenticateToken, (req, res) => {
  try {
    const stats = getStatistics(req.user.id);

    res.json({
      success: true,
      message: 'Statistics retrieved',
      data: {
        statistics: {
          total_deliveries: stats.total_deliveries,
          successful_deliveries: stats.successful_deliveries,
          returned_orders: stats.returned_orders,
          avg_delivery_time: stats.avg_delivery_time
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

export default router;
