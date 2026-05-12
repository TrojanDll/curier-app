# Architecture Design

> **⚠️ Этот документ описывает v1 (одиночный Android-клиент + Express
> backend) и сохранён как исторический артефакт. Live-архитектура v2
> распределена по reference-докам:**
>
> | Если вам нужно | Смотрите |
> |---|---|
> | Общая картина v2 (Android + admin + backend + Docker) | [`README.md`](../README.md) |
> | Скоуп, прогресс, технологические решения | [`Documentation/completion_plan.md`](completion_plan.md) §0, §14–§16 |
> | Контракты backend-модулей (auth, orders, photos, …) | [`docs/INDEX.md`](../docs/INDEX.md) — секция «Backend Reference» |
> | Интеграция admin ↔ backend | [`docs/admin-*.md`](../docs/INDEX.md) |
> | Android-уровень после v2-доработок | [`docs/android-*.md`](../docs/INDEX.md) |
> | Production-стек Docker (db + backend + admin) | [`docs/docker-stack.md`](../docs/docker-stack.md) |
>
> Ниже — оригинальный v1-документ. Конкретные классы / пути могут не
> совпадать с актуальным кодом (структура /android изменилась при
> v2-рефакторинге, см. CLAUDE.md «Repository Layout (v2)»).

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Approved (для v1 — суперседед v2-документами выше)

## 1. System Overview

The Courier Mobile Application follows Clean Architecture principles with MVVM (Model-View-ViewModel) pattern for the presentation layer. The architecture is designed to be:
- **Testable**: Clear separation of concerns enables easy unit testing
- **Maintainable**: Modular structure allows for easy updates and bug fixes
- **Scalable**: Can accommodate new features without major refactoring
- **Decoupled**: Dependencies flow inward, making components replaceable

## 2. Architecture Pattern

### Primary Pattern: Clean Architecture + MVVM

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Activity │→ │ Fragment │→ │ViewModel │→ │ UIState  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Use Cases│  │ Models   │  │Repository│                 │
│  │          │  │(Entities)│  │Interface │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Repository│  │ Remote   │  │  Local   │                 │
│  │  Impl    │→ │DataSource│  │DataSource│                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│       │             │              │                         │
│  ┌────▼─────┐  ┌───▼────┐    ┌────▼─────┐                │
│  │   DTO    │  │  API   │    │   Room   │                │
│  │  Models  │  │ Service│    │ Database │                │
│  └──────────┘  └────────┘    └──────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## 3. System Components

### 3.1 Presentation Layer

**Purpose**: Handle UI logic and user interactions

**Components**:

#### 3.1.1 Activities
- **MainActivity**: Single activity host for navigation
  - Hosts navigation graph
  - Manages bottom navigation
  - Handles authentication state

#### 3.1.2 Fragments
- **LoginFragment**: User authentication screen
- **ProfileFragment**: User profile and settings
- **OrdersFragment**: Active orders list
- **OrderDetailsFragment**: Detailed order view
- **HistoryFragment**: Completed orders with statistics

#### 3.1.3 ViewModels
- **LoginViewModel**: Manages login state and authentication
- **ProfileViewModel**: Handles profile data and settings sync
- **OrdersViewModel**: Manages orders list and filtering
- **OrderDetailsViewModel**: Handles order details and status updates
- **HistoryViewModel**: Manages history list and statistics calculation

#### 3.1.4 UI States
- **LoginUiState**: Login form state, loading, errors
- **ProfileUiState**: Profile data, edit mode, sync status
- **OrdersUiState**: Orders list, loading, empty states
- **OrderDetailsUiState**: Order data, status update state
- **HistoryUiState**: History list, statistics, loading

#### 3.1.5 UI Components
- **OrderListItem**: Reusable order list item view
- **StatisticsCard**: Delivery statistics display
- **StatusSelector**: Order status update component
- **PhotoCaptureView**: Camera preview and capture
- **LoadingView**: Common loading indicator
- **ErrorView**: Error message display

### 3.2 Business Logic Layer (Domain)

**Purpose**: Contains business rules and use cases

**Components**:

#### 3.2.1 Use Cases
- **LoginUseCase**: Handle user authentication flow
- **GetActiveOrdersUseCase**: Fetch and filter active orders
- **GetOrderHistoryUseCase**: Fetch completed orders for period
- **UpdateOrderStatusUseCase**: Update status with validation
- **UploadDeliveryPhotoUseCase**: Handle photo upload
- **GetCourierProfileUseCase**: Fetch courier profile
- **UpdateProfileUseCase**: Update and sync profile settings
- **CalculateStatisticsUseCase**: Calculate delivery statistics

#### 3.2.2 Domain Models (Entities)
- **Courier**: Courier profile information
- **Order**: Complete order information
- **OrderStatus**: Status enum with workflow
- **DeliveryStatistics**: Calculated statistics
- **ProfileSettings**: User settings

#### 3.2.3 Repository Interfaces
- **IAuthRepository**: Authentication operations
- **IOrderRepository**: Order data operations
- **IProfileRepository**: Profile data operations
- **IPhotoRepository**: Photo upload operations

### 3.3 Data Access Layer

**Purpose**: Implement data fetching from various sources

**Components**:

#### 3.3.1 Repositories (Implementation)
- **AuthRepositoryImpl**: Implements IAuthRepository
  - Coordinates API and secure storage
  - Manages token lifecycle
  - Handles auth state

- **OrderRepositoryImpl**: Implements IOrderRepository
  - Fetches orders from API
  - Maps DTO to domain models
  - Handles caching if needed

- **ProfileRepositoryImpl**: Implements IProfileRepository
  - Syncs profile with server
  - Manages local settings storage
  - Handles conflicts

- **PhotoRepositoryImpl**: Implements IPhotoRepository
  - Compresses photos
  - Uploads to server
  - Returns upload status

#### 3.3.2 Remote Data Sources
- **AuthApi**: Authentication API endpoints
  - POST /api/auth/login
  - POST /api/auth/logout
  - POST /api/auth/refresh

- **OrderApi**: Order management API endpoints
  - GET /api/courier/orders/active
  - GET /api/courier/orders/history
  - GET /api/courier/orders/{id}
  - PUT /api/courier/orders/{id}/status

- **ProfileApi**: Profile API endpoints
  - GET /api/courier/profile
  - PUT /api/courier/profile

- **PhotoApi**: Photo upload API
  - POST /api/courier/orders/{id}/photo

- **StatisticsApi**: Statistics API
  - GET /api/courier/statistics

#### 3.3.3 Local Data Sources
- **SecurePreferences**: Encrypted storage for tokens
- **SettingsDataStore**: User preferences storage
- **RoomDatabase**: Local database for offline data (minimal)
  - CourierEntity
  - OrderCacheEntity (if needed)

### 3.4 Network Layer

**Purpose**: Handle HTTP communication

**Components**:

#### 3.4.1 API Client
- **RetrofitClient**: Retrofit instance configuration
  - Base URL configuration
  - Timeout settings
  - SSL pinning (optional)

#### 3.4.2 Interceptors
- **AuthInterceptor**: Adds auth token to requests
- **ErrorInterceptor**: Handles HTTP errors globally
- **LoggingInterceptor**: Logs requests/responses (debug only)

#### 3.4.3 Error Handling
- **ApiError**: Standardized error model
- **NetworkResult**: Sealed class for network responses
  - Success
  - Error
  - Loading

### 3.5 Dependency Injection

**Purpose**: Manage object creation and dependencies

**Framework**: Hilt (recommended) or Koin

**Modules**:
- **AppModule**: Application-level dependencies
- **NetworkModule**: Retrofit, OkHttp instances
- **DatabaseModule**: Room database instance
- **RepositoryModule**: Repository implementations
- **UseCaseModule**: Use case instances

## 4. Data Models

### 4.1 Domain Models

```kotlin
// Courier domain model
data class Courier(
    val id: String,
    val username: String,
    val email: String,
    val phone: String,
    val dateOfBirth: String?
)

// Order domain model
data class Order(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val deliveryAddress: String,
    val customerPhone: String,
    val productDescription: String,
    val comments: String?,
    val status: OrderStatus,
    val assignedAt: Long,
    val statusHistory: List<StatusChange>,
    val photoUrl: String?
)

// Order status enum
enum class OrderStatus {
    ASSIGNED,           // Назначен
    PICKED_UP,          // Забрал заказ
    NEAR_CUSTOMER,      // Возле дома клиента
    DELIVERED,          // Передал заказ
    RETURNED_TO_BASE;   // Вернулся на предприятие

    fun getNext(): OrderStatus?
    fun getDisplayName(): String
    fun canTransitionTo(target: OrderStatus): Boolean
}

// Status change history
data class StatusChange(
    val status: OrderStatus,
    val timestamp: Long,
    val location: String? = null
)

// Delivery statistics
data class DeliveryStatistics(
    val totalDeliveries: Int,
    val averageDeliveryTime: Long,  // in minutes
    val successRate: Double,
    val periodStart: Long,
    val periodEnd: Long
)

// Profile settings
data class ProfileSettings(
    val dateOfBirth: String?,
    val phone: String,
    val email: String
)
```

### 4.2 DTO Models (Data Transfer Objects)

```kotlin
// API request/response models
data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val refreshToken: String,
    val expiresIn: Long,
    val courier: CourierDto
)

data class CourierDto(
    val id: String,
    val username: String,
    val email: String,
    val phone: String,
    val dateOfBirth: String?
)

data class OrderDto(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val deliveryAddress: String,
    val customerPhone: String,
    val productDescription: String,
    val comments: String?,
    val status: String,
    val assignedAt: Long,
    val statusHistory: List<StatusChangeDto>,
    val photoUrl: String?
)

data class StatusChangeDto(
    val status: String,
    val timestamp: Long
)

data class UpdateStatusRequest(
    val status: String,
    val timestamp: Long
)

data class ProfileUpdateRequest(
    val email: String?,
    val phone: String?,
    val dateOfBirth: String?
)
```

### 4.3 Database Entities (if needed)

```kotlin
@Entity(tableName = "courier")
data class CourierEntity(
    @PrimaryKey val id: String,
    val username: String,
    val email: String,
    val phone: String,
    val dateOfBirth: String?
)
```

## 5. API Design

### 5.1 Base Configuration
- **Protocol**: HTTPS only
- **Base URL**: `https://api.courier-app.com` (placeholder)
- **Data Format**: JSON
- **Authentication**: Bearer Token
- **Charset**: UTF-8

### 5.2 Authentication Endpoints

#### POST /api/auth/login
**Purpose**: Authenticate courier and receive access token

**Request**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response** (200 OK):
```json
{
  "token": "string",
  "refreshToken": "string",
  "expiresIn": 86400,
  "courier": {
    "id": "string",
    "username": "string",
    "email": "string",
    "phone": "string",
    "dateOfBirth": "string"
  }
}
```

**Error** (401 Unauthorized):
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Неверный логин или пароль"
}
```

#### POST /api/auth/logout
**Purpose**: End current session

**Request**: No body, requires auth token

**Response** (200 OK):
```json
{
  "success": true
}
```

#### POST /api/auth/refresh
**Purpose**: Refresh access token

**Request**:
```json
{
  "refreshToken": "string"
}
```

**Response** (200 OK):
```json
{
  "token": "string",
  "expiresIn": 86400
}
```

### 5.3 Profile Endpoints

#### GET /api/courier/profile
**Purpose**: Get courier profile information

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "string"
}
```

#### PUT /api/courier/profile
**Purpose**: Update courier profile settings

**Headers**: `Authorization: Bearer {token}`

**Request**:
```json
{
  "email": "string",
  "phone": "string",
  "dateOfBirth": "string"
}
```

**Response** (200 OK):
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "string"
}
```

### 5.4 Order Endpoints

#### GET /api/courier/orders/active
**Purpose**: Get list of active orders for courier

**Headers**: `Authorization: Bearer {token}`

**Response** (200 OK):
```json
{
  "orders": [
    {
      "id": "string",
      "orderNumber": "string",
      "customerName": "string",
      "deliveryAddress": "string",
      "customerPhone": "string",
      "productDescription": "string",
      "comments": "string",
      "status": "ASSIGNED",
      "assignedAt": 1699000000000,
      "statusHistory": [
        {
          "status": "ASSIGNED",
          "timestamp": 1699000000000
        }
      ],
      "photoUrl": null
    }
  ]
}
```

#### GET /api/courier/orders/history
**Purpose**: Get completed orders for time period

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `startTime`: Unix timestamp (default: 24h ago)
- `endTime`: Unix timestamp (default: now)

**Response** (200 OK):
```json
{
  "orders": [
    {
      "id": "string",
      "orderNumber": "string",
      "customerName": "string",
      "deliveryAddress": "string",
      "status": "RETURNED_TO_BASE",
      "assignedAt": 1699000000000,
      "completedAt": 1699003600000,
      "photoUrl": "string"
    }
  ]
}
```

#### GET /api/courier/orders/{id}
**Purpose**: Get detailed order information

**Headers**: `Authorization: Bearer {token}`

**Path Parameters**: `id` - Order ID

**Response** (200 OK):
```json
{
  "id": "string",
  "orderNumber": "string",
  "customerName": "string",
  "deliveryAddress": "string",
  "customerPhone": "string",
  "productDescription": "string",
  "comments": "string",
  "status": "NEAR_CUSTOMER",
  "assignedAt": 1699000000000,
  "statusHistory": [
    {
      "status": "ASSIGNED",
      "timestamp": 1699000000000
    },
    {
      "status": "PICKED_UP",
      "timestamp": 1699001000000
    },
    {
      "status": "NEAR_CUSTOMER",
      "timestamp": 1699002000000
    }
  ],
  "photoUrl": null
}
```

#### PUT /api/courier/orders/{id}/status
**Purpose**: Update order status

**Headers**: `Authorization: Bearer {token}`

**Path Parameters**: `id` - Order ID

**Request**:
```json
{
  "status": "PICKED_UP",
  "timestamp": 1699001000000
}
```

**Response** (200 OK):
```json
{
  "id": "string",
  "status": "PICKED_UP",
  "timestamp": 1699001000000,
  "message": "Статус успешно обновлён"
}
```

**Error** (400 Bad Request):
```json
{
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Невозможно перейти к указанному статусу"
}
```

### 5.5 Photo Upload Endpoint

#### POST /api/courier/orders/{id}/photo
**Purpose**: Upload delivery proof photo

**Headers**:
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Path Parameters**: `id` - Order ID

**Request**: Multipart form with `photo` file field

**Response** (200 OK):
```json
{
  "photoUrl": "string",
  "message": "Фото успешно загружено"
}
```

**Error** (413 Payload Too Large):
```json
{
  "error": "FILE_TOO_LARGE",
  "message": "Размер файла превышает допустимый лимит"
}
```

### 5.6 Statistics Endpoint

#### GET /api/courier/statistics
**Purpose**: Get courier delivery statistics

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `startTime`: Unix timestamp (default: 24h ago)
- `endTime`: Unix timestamp (default: now)

**Response** (200 OK):
```json
{
  "totalDeliveries": 15,
  "averageDeliveryTime": 45,
  "successRate": 98.5,
  "periodStart": 1699000000000,
  "periodEnd": 1699086400000
}
```

## 6. Security Architecture

### 6.1 Authentication Flow
1. User enters credentials
2. App sends login request (password hashed client-side - optional)
3. Server validates and returns JWT token
4. Token stored in EncryptedSharedPreferences
5. Token included in all subsequent requests
6. Token refreshed before expiration
7. Logout clears stored token

### 6.2 Data Security
- **In Transit**: All API calls use HTTPS/TLS 1.2+
- **At Rest**:
  - Tokens stored in EncryptedSharedPreferences
  - Sensitive data encrypted
  - No passwords stored locally
- **Logging**: No sensitive data in logs (production)
- **ProGuard**: Code obfuscation for release builds

### 6.3 Permissions
- **INTERNET**: Required for API calls
- **CAMERA**: Required for delivery photos
- **READ_EXTERNAL_STORAGE**: For selecting photos (optional)
- **WRITE_EXTERNAL_STORAGE**: For saving photos (Android < 10)

## 7. Component Interactions

### 7.1 Login Flow
```
User → LoginFragment → LoginViewModel → LoginUseCase
     → AuthRepository → AuthApi → Server

Server → AuthApi → AuthRepository → LoginUseCase
      → LoginViewModel → LoginFragment → Navigate to Main
```

### 7.2 Order Status Update Flow
```
User → OrderDetailsFragment → OrderDetailsViewModel
    → UpdateOrderStatusUseCase → OrderRepository → OrderApi

OrderApi → Server
Server → OrderApi → OrderRepository → UpdateOrderStatusUseCase
       → OrderDetailsViewModel → OrderDetailsFragment → UI Update
```

### 7.3 Photo Upload Flow
```
User → CameraView → OrderDetailsFragment → OrderDetailsViewModel
    → UploadPhotoUseCase → PhotoRepository
    → Compress → Upload to PhotoApi

PhotoApi → Server
Server → PhotoApi → PhotoRepository → UploadPhotoUseCase
       → OrderDetailsViewModel → OrderDetailsFragment → Success Message
```

## 8. Technology Stack

### 8.1 Core Android
- **Language**: Kotlin 2.0.21
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 36
- **Build**: Gradle 8.13.0 with Kotlin DSL

### 8.2 Architecture Components
- **Lifecycle**: ViewModel, LiveData/StateFlow
- **Navigation**: Navigation Component
- **Dependency Injection**: Hilt or Koin

### 8.3 Network
- **HTTP Client**: Retrofit 2.9+
- **HTTP**: OkHttp 4.12+
- **JSON**: Moshi or Gson
- **Image Loading**: Coil or Glide

### 8.4 Local Storage
- **Database**: Room 2.6+
- **Preferences**: DataStore or EncryptedSharedPreferences

### 8.5 Camera
- **Camera API**: CameraX 1.3+

### 8.6 UI
- **Material Design**: Material Components 1.13+
- **RecyclerView**: AndroidX RecyclerView
- **ConstraintLayout**: 2.2+
- **ViewBinding**: Enabled

### 8.7 Testing
- **Unit Tests**: JUnit 4, MockK
- **UI Tests**: Espresso 3.7+
- **Coroutines Test**: kotlinx-coroutines-test

### 8.8 Utilities
- **Async**: Kotlin Coroutines + Flow
- **Date/Time**: Java Time API (desugaring for API < 26)
- **Logging**: Timber (optional)

## 9. Architectural Decisions

### 9.1 Why MVVM?
- Standard Android architecture pattern
- Excellent support from Jetpack libraries
- Clear separation of UI and business logic
- Easy to test
- Widely adopted in industry

### 9.2 Why Clean Architecture?
- Better testability through dependency inversion
- Framework independence in domain layer
- Clear boundaries between layers
- Easier to maintain and extend
- Educational value for учебный проект

### 9.3 Why Hilt for DI?
- Official Android recommendation
- Compile-time safety
- Great integration with Jetpack
- Good documentation
- Standard in modern Android

### 9.4 Why Retrofit?
- De facto standard for Android networking
- Type-safe API calls
- Excellent coroutines support
- Large community and plugins
- Easy to mock for testing

### 9.5 Why CameraX?
- Modern camera API
- Handles device compatibility
- Lifecycle-aware
- Easier than Camera2 API
- Good documentation

### 9.6 Single Activity Architecture
- Recommended by Google
- Better navigation with Nav Component
- Cleaner state management
- Easier deep linking
- Modern Android approach

## 10. Package Structure

```
com.example.curier_mobile/
├── di/                          # Dependency injection modules
│   ├── AppModule
│   ├── NetworkModule
│   ├── DatabaseModule
│   └── RepositoryModule
├── data/                        # Data layer
│   ├── remote/                  # Remote data sources
│   │   ├── api/                 # API service interfaces
│   │   ├── dto/                 # Data transfer objects
│   │   └── interceptor/         # OkHttp interceptors
│   ├── local/                   # Local data sources
│   │   ├── database/            # Room database
│   │   └── preferences/         # SharedPreferences/DataStore
│   └── repository/              # Repository implementations
├── domain/                      # Domain layer
│   ├── model/                   # Domain models/entities
│   ├── repository/              # Repository interfaces
│   └── usecase/                 # Use cases
├── presentation/                # Presentation layer
│   ├── login/                   # Login feature
│   │   ├── LoginFragment
│   │   └── LoginViewModel
│   ├── profile/                 # Profile feature
│   │   ├── ProfileFragment
│   │   └── ProfileViewModel
│   ├── orders/                  # Orders feature
│   │   ├── OrdersFragment
│   │   ├── OrderDetailsFragment
│   │   ├── OrdersViewModel
│   │   └── OrderDetailsViewModel
│   ├── history/                 # History feature
│   │   ├── HistoryFragment
│   │   └── HistoryViewModel
│   ├── common/                  # Shared UI components
│   │   ├── views/
│   │   ├── adapters/
│   │   └── utils/
│   └── MainActivity
└── util/                        # Utility classes
    ├── Constants
    ├── DateUtils
    ├── NetworkResult
    └── Extensions
```

## 11. State Management

Using StateFlow and UiState pattern:

```kotlin
data class OrdersUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isEmpty: Boolean = false
)

class OrdersViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    // Methods to update state
}
```

## 12. Error Handling Strategy

```kotlin
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: Int? = null) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()
}
```

All repository methods return `NetworkResult<T>` which ViewModels convert to UiState.

## 13. Navigation Graph

```xml
<navigation>
    <fragment id="login" />
    <fragment id="main_container">
        <fragment id="profile" />
        <fragment id="orders" />
        <fragment id="history" />
    </fragment>
    <fragment id="order_details" />
</navigation>
```

## 14. Future Extensibility

Architecture designed to easily add:
- Offline mode (already has Repository pattern)
- Push notifications (can add NotificationRepository)
- Real-time tracking (can add LocationRepository)
- Multi-language support (already separated strings)
- Dark theme (Material Theming ready)
- Admin features (can add new modules)

## 15. Performance Considerations

- **Lazy Loading**: RecyclerView with pagination (if needed)
- **Image Caching**: Coil/Glide handles caching
- **Background Work**: Coroutines for async operations
- **Memory Management**: ViewBinding prevents memory leaks
- **Network Optimization**: Request deduplication, caching headers
