// Simple in-memory database for development
// In production, use a real database like PostgreSQL, MongoDB, etc.

export const database = {
  users: [
    {
      id: 1,
      username: 'courier1',
      password: '$2a$10$4rOoWlyWp4cmbmfpnz.3DuY/9xJv53RJ9ZKw5eMZSlsY4E1T.YSeq', // password: 123456
      full_name: 'Иван Иванов',
      email: 'ivan@example.com',
      phone: '+79991234567',
      date_of_birth: '1990-01-15'
    }
  ],

  orders: [
    {
      id: 1,
      order_number: 'ORD-001',
      courier_id: 1,
      customer_name: 'Петр Петров',
      customer_phone: '+79997654321',
      delivery_address: 'ул. Ленина, д. 10, кв. 5',
      notes: 'Код домофона: 123',
      status: 'assigned',
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      order_number: 'ORD-002',
      courier_id: 1,
      customer_name: 'Мария Сидорова',
      customer_phone: '+79995555555',
      delivery_address: 'пр. Победы, д. 25, кв. 12',
      notes: 'Оставить у двери',
      status: 'picked_up',
      assigned_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ],

  completedOrders: [
    {
      id: 100,
      order_number: 'ORD-100',
      courier_id: 1,
      customer_name: 'Анна Смирнова',
      customer_phone: '+79993333333',
      delivery_address: 'ул. Гагарина, д. 5',
      status: 'delivered',
      assigned_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date(Date.now() - 82800000).toISOString()
    }
  ],

  // Statistics data
  statistics: {
    1: { // courier_id
      total_deliveries: 45,
      successful_deliveries: 42,
      returned_orders: 3,
      avg_delivery_time: 35 // minutes
    }
  },

  // Tokens storage (in production use Redis or similar)
  tokens: new Map()
};

// Helper functions
export const findUserByUsername = (username) => {
  return database.users.find(u => u.username === username);
};

export const findUserById = (id) => {
  return database.users.find(u => u.id === id);
};

export const createUser = (userData) => {
  const newUser = {
    id: database.users.length + 1,
    ...userData,
    created_at: new Date().toISOString()
  };
  database.users.push(newUser);
  return newUser;
};

export const getActiveOrdersByCourier = (courierId) => {
  return database.orders.filter(o => o.courier_id === courierId);
};

export const getOrderById = (orderId) => {
  return database.orders.find(o => o.id === orderId) ||
         database.completedOrders.find(o => o.id === orderId);
};

export const updateOrderStatus = (orderId, newStatus) => {
  const order = database.orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    order.updated_at = new Date().toISOString();

    // Move to completed if delivered or returned
    if (newStatus === 'delivered' || newStatus === 'returned') {
      order.completed_at = new Date().toISOString();
      database.completedOrders.push(order);
      database.orders = database.orders.filter(o => o.id !== orderId);
    }
    return order;
  }
  return null;
};

export const getOrderHistory = (courierId) => {
  return database.completedOrders.filter(o => o.courier_id === courierId);
};

export const getStatistics = (courierId) => {
  return database.statistics[courierId] || {
    total_deliveries: 0,
    successful_deliveries: 0,
    returned_orders: 0,
    avg_delivery_time: 0
  };
};

// Sample order templates for random generation
const orderTemplates = [
  {
    customer_name: 'Александр Кузнецов',
    customer_phone: '+79991234567',
    delivery_address: 'ул. Ленина, д. 15, кв. 23',
    notes: 'Код домофона: 456'
  },
  {
    customer_name: 'Елена Новикова',
    customer_phone: '+79997654321',
    delivery_address: 'пр. Победы, д. 42, кв. 8',
    notes: 'Оставить у двери'
  },
  {
    customer_name: 'Дмитрий Морозов',
    customer_phone: '+79995555555',
    delivery_address: 'ул. Гагарина, д. 7, офис 12',
    notes: 'Позвонить за 10 минут'
  },
  {
    customer_name: 'Ольга Соколова',
    customer_phone: '+79993333333',
    delivery_address: 'ул. Пушкина, д. 3, кв. 45',
    notes: 'Домофон не работает, позвонить'
  },
  {
    customer_name: 'Михаил Волков',
    customer_phone: '+79992222222',
    delivery_address: 'пр. Мира, д. 88, кв. 101',
    notes: 'Код домофона: 789'
  },
  {
    customer_name: 'Анна Федорова',
    customer_phone: '+79991111111',
    delivery_address: 'ул. Чехова, д. 21, кв. 6',
    notes: 'Встретить на первом этаже'
  },
  {
    customer_name: 'Сергей Павлов',
    customer_phone: '+79994444444',
    delivery_address: 'ул. Советская, д. 9, кв. 34',
    notes: null
  },
  {
    customer_name: 'Мария Лебедева',
    customer_phone: '+79996666666',
    delivery_address: 'пр. Строителей, д. 55, кв. 78',
    notes: 'Код домофона: 123#'
  }
];

// Generate random order for courier
export const createRandomOrder = (courierId) => {
  const template = orderTemplates[Math.floor(Math.random() * orderTemplates.length)];
  const orderId = Math.max(...database.orders.map(o => o.id), ...database.completedOrders.map(o => o.id)) + 1;
  const orderNumber = `ORD-${String(orderId).padStart(3, '0')}`;

  const newOrder = {
    id: orderId,
    order_number: orderNumber,
    courier_id: courierId,
    customer_name: template.customer_name,
    customer_phone: template.customer_phone,
    delivery_address: template.delivery_address,
    notes: template.notes,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  database.orders.push(newOrder);
  return newOrder;
};
