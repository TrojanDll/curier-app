# Curier Mobile - Courier Delivery Management System

## Overview
Android application for courier delivery management with REST API backend. Allows couriers to manage orders, track delivery progress, capture delivery photos, and view statistics.

## Architecture

### Android App (Clean Architecture + MVVM)

**Layers:**
- **Presentation** (MVVM): Fragments, ViewModels, UI States
- **Domain**: Business models (Order, User, Statistics), Repository interfaces
- **Data**: Repository implementations, API service, local database, DTOs, mappers

**Key Components:**
- Navigation Component with nested graphs (auth flow + bottom navigation)
- Room database for offline caching (OrderEntity, UserEntity)
- Retrofit + OkHttp for networking with JWT authentication
- ViewBinding for type-safe view access
- Kotlin Coroutines for async operations
- Manual DI via factory pattern (Hilt temporarily disabled)

### Backend (Node.js + Express)

**Tech Stack:** Express.js, JWT authentication, bcrypt, multer (photo uploads), in-memory database

**Structure:**
- `server.js` - entry point, middleware setup
- `routes/` - auth, orders, profile, statistics endpoints
- `data/database.js` - in-memory data storage (users, orders, completed orders)
- `middleware/auth.js` - JWT token verification

## Data Models

### Order
- **Statuses:** assigned → picked_up → near_customer → delivered → returned
- **Fields:** id, orderNumber, customerName, customerPhone, deliveryAddress, productDescription, comments, status, timestamps, photoUrl

### User (Courier)
- Fields: id, username, fullName, email, phone, dateOfBirth

### Statistics
- Fields: totalDeliveries, completedDeliveries, averageDeliveryTimeMinutes, successRate, periodStart, periodEnd

## Screens & Features

### Authentication
- **Login/Register** - JWT-based authentication with token refresh

### Main Container (Bottom Navigation)
Three tabs with nested navigation:

#### 1. Orders Tab
- **OrdersListFragment** - list of active orders with pull-to-refresh, create new order button
- **OrderDetailsFragment** - order details, status workflow with next status button, photo capture
- **PhotoCaptureFragment** - camera integration for delivery proof photos

#### 2. History Tab
- **HistoryFragment** - completed orders history with date filtering

#### 3. Profile Tab
- **ProfileFragment** - courier profile info, statistics display, logout

## API Endpoints

### Auth
- `POST /api/auth/register` - register courier
- `POST /api/auth/login` - login, returns JWT tokens
- `POST /api/auth/logout` - invalidate session
- `POST /api/auth/refresh` - refresh access token

### Orders
- `POST /api/courier/orders/new` - create random order (demo)
- `GET /api/courier/orders/active` - get active orders
- `GET /api/courier/orders/history` - get completed orders with date filters
- `GET /api/courier/orders/{id}` - get order details
- `PUT /api/courier/orders/{id}/status` - update order status
- `POST /api/courier/orders/{id}/photo` - upload delivery photo (multipart)

### Profile & Statistics
- `GET /api/courier/profile` - get courier profile
- `PUT /api/courier/profile` - update profile
- `GET /api/courier/statistics` - get delivery statistics with date filters

## Technical Details

### Android Configuration
- **Min SDK:** 24 (Android 7.0)
- **Target/Compile SDK:** 36
- **Language:** Kotlin, JVM target 11
- **Build System:** Gradle (Kotlin DSL)

### Key Dependencies
- AndroidX Core, AppCompat, Lifecycle (ViewModel, LiveData)
- Navigation Component with Safe Args
- Room Database with KSP
- Retrofit + Moshi for JSON serialization
- OkHttp with logging interceptor
- Material Design Components
- SwipeRefreshLayout, RecyclerView
- CameraX for photo capture

### Network Configuration
- Debug: `http://10.49.230.177:8081/` (physical device on same WiFi)
- Release: `http://192.168.0.101:8081/`
- Network security config allows cleartext HTTP traffic
- JWT tokens stored in encrypted SharedPreferences via TokenManager

### Backend Configuration
- Port: 8081 (configurable via PORT env variable)
- CORS enabled for all origins
- Listens on 0.0.0.0 for network access
- In-memory data storage (suitable for development/demo)

## Order Workflow
1. Courier logs in
2. Views active orders or creates new random order
3. Selects order to view details
4. Updates status through workflow: assigned → picked_up → near_customer → delivered → returned
5. Captures delivery photo when near customer
6. Completes delivery, order moves to history
7. Views completed orders in History tab

## Data Flow
1. UI action triggers ViewModel method
2. ViewModel calls Repository
3. Repository fetches from API (via Retrofit) and/or local database (Room)
4. Mapper converts DTO/Entity to Domain model
5. Result wrapped in custom Result sealed class (Success/Error)
6. ViewModel updates UiState (sealed class with Loading/Success/Error states)
7. Fragment observes UiState and updates UI

## Key Features
- Offline-first with local caching (Room database)
- JWT authentication with auto token refresh via interceptor
- Photo capture and upload for delivery proof
- Pull-to-refresh on order lists
- Status workflow validation (only next status allowed)
- Statistics tracking (delivery count, success rate, average time)
- Date-filtered history and statistics
- Material Design UI with bottom navigation
- Error handling with user-friendly messages
