# Requirements Specification

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Approved

## 1. Functional Requirements

### 1.1 High Priority (Must Have)

#### FR-1.1.1: User Authentication
- **ID**: FR-1.1.1
- **Priority**: Critical
- **Description**: The system must provide secure login functionality for couriers
- **Details**:
  - Login form with username/password fields
  - Simple token-based authentication
  - Session management
  - Logout functionality
- **Acceptance Criteria**:
  - Courier can log in with valid credentials
  - Invalid credentials show appropriate error message
  - Session persists until logout or token expiration
  - Secure password handling (no plain text storage)

#### FR-1.1.2: Order Status Management
- **ID**: FR-1.1.2
- **Priority**: Critical
- **Description**: Couriers must be able to update order status through defined workflow
- **Details**:
  - Status workflow: "Забрал заказ" → "Возле дома клиента" → "Передал заказ" → "Вернулся на предприятие"
  - Each status change must be timestamped
  - Status updates sent to server immediately
  - UI shows current status clearly
- **Acceptance Criteria**:
  - Courier can change status in defined sequence
  - Cannot skip status steps
  - Each status change is saved to server
  - Administrator can monitor status changes in real-time

#### FR-1.1.3: Active Orders Display
- **ID**: FR-1.1.3
- **Priority**: Critical
- **Description**: Display list of active orders assigned to the courier
- **Details**:
  - Show all orders with status other than "Вернулся на предприятие"
  - Display order number, customer name, delivery address
  - Tap to view full order details
  - Auto-refresh order list
- **Acceptance Criteria**:
  - All active orders are visible
  - Orders update when new ones are assigned
  - Completed orders move to history automatically

#### FR-1.1.4: Order Details View
- **ID**: FR-1.1.4
- **Priority**: Critical
- **Description**: Display complete order information
- **Details**:
  - Order number
  - Customer name (имя получателя)
  - Delivery address (адрес получателя)
  - Customer phone number (контактный телефон)
  - Product description (описание товара)
  - Comments (комментарии)
  - Current status
- **Acceptance Criteria**:
  - All order fields are clearly displayed
  - Phone number is clickable/copyable
  - Information is readable and well-formatted

#### FR-1.1.5: Profile Management
- **ID**: FR-1.1.5
- **Priority**: High
- **Description**: Courier profile with personal settings
- **Details**:
  - View and edit profile information
  - Settings include: date of birth, phone number, email
  - Settings sync across devices
  - Settings persist after app reinstall
- **Acceptance Criteria**:
  - Courier can view their profile
  - Can update settings which sync to server
  - Settings available after login on different device
  - Settings restored after app reinstall

#### FR-1.1.6: Order History
- **ID**: FR-1.1.6
- **Priority**: High
- **Description**: Display completed orders
- **Details**:
  - Show orders completed in last 1 day by default
  - Display order summary information
  - Show completion timestamp
  - Include delivery statistics
- **Acceptance Criteria**:
  - History shows last 24 hours of completed orders
  - Each order shows basic info and completion time
  - Statistics display correctly

### 1.2 Medium Priority (Should Have)

#### FR-1.2.1: Route Navigation Integration
- **ID**: FR-1.2.1
- **Priority**: Medium
- **Description**: Enable route planning to delivery address
- **Details**:
  - "Проложить маршрут" button in order details
  - Opens Yandex Maps with destination address
  - Works with Yandex Maps app or web version
- **Acceptance Criteria**:
  - Button opens Yandex Maps correctly
  - Correct address is passed to maps
  - Handles case when Yandex Maps is not installed

#### FR-1.2.2: Delivery Proof Photo
- **ID**: FR-1.2.2
- **Priority**: Medium
- **Description**: Allow courier to photograph delivery proof
- **Details**:
  - Camera integration when marking order as delivered
  - Photo attached to order
  - Photo uploaded to server
  - Optional but recommended feature
- **Acceptance Criteria**:
  - Can take photo using device camera
  - Photo is attached to order
  - Photo uploads successfully
  - Can view photo after upload

#### FR-1.2.3: Delivery Statistics
- **ID**: FR-1.2.3
- **Priority**: Medium
- **Description**: Show courier delivery statistics in history tab
- **Details**:
  - Total deliveries count (for displayed period)
  - Average delivery time
  - Success rate
  - Display for current day
- **Acceptance Criteria**:
  - Statistics calculate correctly
  - Display updates when new orders complete
  - Visual presentation is clear

### 1.3 Low Priority (Nice to Have)

#### FR-1.3.1: Support Contact Information
- **ID**: FR-1.3.1
- **Priority**: Low
- **Description**: Display support contact for problem resolution
- **Details**:
  - Support phone number in profile/settings
  - Help section with common issues
- **Acceptance Criteria**:
  - Support contact is easily accessible
  - Contact information is correct

## 2. Non-Functional Requirements

### 2.1 Performance
- **NFR-2.1.1**: App launch time should not exceed 3 seconds on mid-range devices
- **NFR-2.1.2**: Order list should load within 2 seconds on 4G connection
- **NFR-2.1.3**: Status update should complete within 1 second
- **NFR-2.1.4**: Photo upload should show progress indicator for files > 1MB

### 2.2 Security
- **NFR-2.2.1**: All API communications must use HTTPS
- **NFR-2.2.2**: Authentication tokens must be stored securely (Android Keystore)
- **NFR-2.2.3**: Passwords must be hashed before transmission
- **NFR-2.2.4**: Session tokens must expire after 24 hours of inactivity
- **NFR-2.2.5**: No sensitive data stored in plain text

### 2.3 Usability
- **NFR-2.3.1**: Interface must be in Russian language only
- **NFR-2.3.2**: UI must follow Material Design guidelines
- **NFR-2.3.3**: All interactive elements must have minimum 48dp touch target
- **NFR-2.3.4**: App must work in portrait orientation (landscape optional)
- **NFR-2.3.5**: Error messages must be clear and actionable

### 2.4 Reliability
- **NFR-2.4.1**: App must handle network disconnections gracefully
- **NFR-2.4.2**: Failed status updates must show error and retry option
- **NFR-2.4.3**: App should not crash on invalid server responses
- **NFR-2.4.4**: Must handle image capture failures appropriately

### 2.5 Compatibility
- **NFR-2.5.1**: Must support Android 7.0 (API 24) and above
- **NFR-2.5.2**: Must work on devices with screen sizes from 4.7" to 6.5"
- **NFR-2.5.3**: Must support both light and dark system themes
- **NFR-2.5.4**: Camera feature must work with standard Android camera API

### 2.6 Maintainability
- **NFR-2.6.1**: Code must follow Kotlin official style guide
- **NFR-2.6.2**: All public APIs must be documented
- **NFR-2.6.3**: Architecture must support easy feature additions
- **NFR-2.6.4**: Dependencies must be up-to-date and actively maintained

## 3. Technical Constraints

### 3.1 Platform
- Android mobile application only
- Minimum SDK: API 24 (Android 7.0)
- Target SDK: API 36
- Development language: Kotlin
- Build system: Gradle with Kotlin DSL

### 3.2 Backend/API
- RESTful API to be specified
- JSON data format
- Token-based authentication
- No existing backend (specification to be created)

### 3.3 Third-party Services
- Yandex Maps integration for navigation
- No push notification services required
- No real-time location tracking

### 3.4 Data Storage
- No offline mode required
- No local caching of orders required
- User preferences stored locally and synced to server

## 4. Business Rules

### 4.1 Order Status Workflow
- BR-4.1.1: Status changes must follow strict sequence:
  1. New order (assigned by admin)
  2. "Забрал заказ" (picked up)
  3. "Возле дома клиента" (near customer)
  4. "Передал заказ" (delivered)
  5. "Вернулся на предприятие" (returned to base)
- BR-4.1.2: Cannot skip status steps
- BR-4.1.3: Cannot revert to previous status
- BR-4.1.4: Once "Вернулся на предприятие" is set, order moves to history

### 4.2 User Access
- BR-4.2.1: Only authenticated couriers can access the app
- BR-4.2.2: Courier can only see orders assigned to them
- BR-4.2.3: Cannot modify orders assigned to other couriers
- BR-4.2.4: Registration is handled externally (not in courier app)

### 4.3 Order Assignment
- BR-4.3.1: Orders are assigned by administrator through admin app
- BR-4.3.2: Courier receives orders automatically when assigned
- BR-4.3.3: Courier cannot decline or cancel orders through app

### 4.4 History and Statistics
- BR-4.4.1: History shows orders completed in last 24 hours by default
- BR-4.4.2: Only completed orders appear in history
- BR-4.4.3: Statistics calculated based on displayed history period

## 5. User Stories

### Epic 1: Authentication
**US-1.1**: As a courier, I want to log in to the app so that I can access my assigned orders
- Given I have valid credentials
- When I enter my username and password
- Then I should be logged in and see the main screen

### Epic 2: Order Management
**US-2.1**: As a courier, I want to see my active orders so that I know what deliveries I need to make
- Given I am logged in
- When I open the Orders tab
- Then I should see all orders assigned to me that are not yet completed

**US-2.2**: As a courier, I want to view order details so that I know where to deliver and what to deliver
- Given I have active orders
- When I tap on an order
- Then I should see complete order information including address, customer name, phone, and product description

**US-2.3**: As a courier, I want to update order status so that administrators know my progress
- Given I am viewing an order
- When I update the status to the next step
- Then the status should be saved and visible to administrators

**US-2.4**: As a courier, I want to navigate to delivery address so that I can find the customer easily
- Given I am viewing order details
- When I tap "Проложить маршрут"
- Then Yandex Maps should open with the delivery address

**US-2.5**: As a courier, I want to photograph delivery proof so that I have confirmation of delivery
- Given I am marking order as delivered
- When I take a photo
- Then the photo should be attached to the order

### Epic 3: Profile and Settings
**US-3.1**: As a courier, I want to manage my profile settings so that my information is up to date
- Given I am logged in
- When I update my profile settings
- Then the changes should be saved and synced across devices

### Epic 4: History and Statistics
**US-4.1**: As a courier, I want to view my delivery history so that I can track my completed work
- Given I have completed deliveries
- When I open the History tab
- Then I should see orders I completed in the last 24 hours

**US-4.2**: As a courier, I want to see my delivery statistics so that I can track my performance
- Given I have completed deliveries
- When I view the History tab
- Then I should see statistics like total deliveries and average time

## 6. API Requirements (To be implemented by backend)

### 6.1 Authentication Endpoints
- POST `/api/auth/login` - Authenticate courier
- POST `/api/auth/logout` - End session
- POST `/api/auth/refresh` - Refresh auth token

### 6.2 Profile Endpoints
- GET `/api/courier/profile` - Get courier profile
- PUT `/api/courier/profile` - Update profile settings

### 6.3 Order Endpoints
- GET `/api/courier/orders/active` - Get active orders
- GET `/api/courier/orders/history` - Get completed orders
- GET `/api/courier/orders/{id}` - Get specific order details
- PUT `/api/courier/orders/{id}/status` - Update order status
- POST `/api/courier/orders/{id}/photo` - Upload delivery proof photo

### 6.4 Statistics Endpoints
- GET `/api/courier/statistics` - Get courier statistics for period

## 7. Acceptance Criteria

### 7.1 System Level
- [ ] Courier can successfully log in and log out
- [ ] All active orders are displayed correctly
- [ ] Order status can be updated following the workflow
- [ ] Order details display all required information
- [ ] History shows completed orders from last 24 hours
- [ ] Profile settings sync across devices
- [ ] Navigation to Yandex Maps works correctly
- [ ] Delivery photos can be captured and uploaded

### 7.2 Quality Level
- [ ] App does not crash under normal usage
- [ ] All API calls handle errors gracefully
- [ ] UI is responsive and follows Material Design
- [ ] All text is in Russian
- [ ] App works on Android 7.0+
- [ ] Performance meets defined metrics

### 7.3 Security Level
- [ ] All communications use HTTPS
- [ ] Authentication tokens are stored securely
- [ ] No sensitive data in logs
- [ ] Session management works correctly
