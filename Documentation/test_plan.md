# Test Plan

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Approved

## 1. Test Strategy

### 1.1 Testing Approach
The testing strategy follows a multi-layered approach aligned with Clean Architecture:
- **Unit Testing**: Domain layer (use cases, business logic)
- **Integration Testing**: Data layer (repositories, API integration)
- **UI Testing**: Presentation layer (user flows, UI components)
- **Manual Testing**: End-to-end workflows, edge cases, UX

### 1.2 Test Coverage Goals
- **Unit Tests**: >70% code coverage for business logic
- **Integration Tests**: All API endpoints and repositories
- **UI Tests**: All critical user flows
- **Manual Tests**: Complete feature set on multiple devices

### 1.3 Testing Tools
- **Unit Tests**: JUnit 4, MockK, Truth, Turbine
- **Integration Tests**: MockWebServer, Room testing, Hilt testing
- **UI Tests**: Espresso, AndroidX Test
- **Performance**: Android Profiler, LeakCanary
- **Coverage**: JaCoCo or Android Studio Coverage

### 1.4 Test Execution Schedule
- **Iteration 16**: Unit testing implementation
- **Iteration 17**: UI testing implementation
- **Iteration 18**: Error handling and edge case testing
- **Iteration 21**: Final comprehensive QA

## 2. Testing Levels

### 2.1 Unit Testing

**Scope**: Test individual components in isolation
**Target**: ViewModels, Use Cases, Business Logic, Utilities
**Coverage Goal**: >70%

#### Components to Test:
1. **ViewModels**
   - State management
   - User action handling
   - Data transformation
   - Error handling

2. **Use Cases**
   - Business logic correctness
   - Data validation
   - Edge cases
   - Error scenarios

3. **Repositories (with mocks)**
   - Data transformation (DTO → Domain)
   - Caching logic
   - Error propagation

4. **Utilities**
   - Date/time formatting
   - Input validation
   - Extension functions

#### Test Framework:
```kotlin
class OrdersViewModelTest {
    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    @MockK
    lateinit var getActiveOrdersUseCase: GetActiveOrdersUseCase

    private lateinit var viewModel: OrdersViewModel

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        viewModel = OrdersViewModel(getActiveOrdersUseCase)
    }

    @Test
    fun `when orders loaded successfully, state should contain orders`() = runTest {
        // Test implementation
    }
}
```

### 2.2 Integration Testing

**Scope**: Test interaction between components
**Target**: API integration, Database operations, Repository implementations
**Coverage Goal**: All critical data flows

#### Components to Test:
1. **API Integration**
   - Request formatting
   - Response parsing
   - Error handling
   - Authentication flow

2. **Database Operations**
   - CRUD operations
   - Queries correctness
   - Migrations
   - Data consistency

3. **Repository Integration**
   - Remote + Local data coordination
   - Caching strategy
   - Sync logic
   - Conflict resolution

#### Test Framework:
```kotlin
class AuthRepositoryTest {
    private lateinit var mockWebServer: MockWebServer
    private lateinit var repository: AuthRepositoryImpl

    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        // Setup repository with mock server
    }

    @Test
    fun `login should return success with valid credentials`() = runTest {
        mockWebServer.enqueue(MockResponse()
            .setResponseCode(200)
            .setBody(validLoginResponse))

        val result = repository.login("user", "pass")

        assertThat(result).isInstanceOf(NetworkResult.Success::class.java)
    }
}
```

### 2.3 System Testing

**Scope**: Test complete features end-to-end
**Target**: Complete user workflows
**Coverage Goal**: All major features

#### Test Scenarios:
1. Complete login flow
2. Order viewing and status update
3. Profile update and sync
4. Photo capture and upload
5. Navigation to maps
6. History viewing and statistics

### 2.4 UI Testing

**Scope**: Test user interface and interactions
**Target**: All screens and user flows
**Coverage Goal**: Critical user journeys

#### Components to Test:
1. **Screen Navigation**
   - Tab navigation
   - Screen transitions
   - Back navigation
   - Deep linking (if implemented)

2. **Form Validation**
   - Login form validation
   - Profile edit validation
   - Error message display
   - Field focus management

3. **List Interactions**
   - RecyclerView scrolling
   - Item click handling
   - Empty state display
   - Loading state display

4. **User Actions**
   - Button clicks
   - Text input
   - Camera capture
   - Pull-to-refresh

#### Test Framework:
```kotlin
@RunWith(AndroidJUnit4::class)
class LoginFlowTest {
    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun loginWithValidCredentials_shouldNavigateToOrders() {
        onView(withId(R.id.etUsername))
            .perform(typeText("testuser"))

        onView(withId(R.id.etPassword))
            .perform(typeText("password"))

        onView(withId(R.id.btnLogin))
            .perform(click())

        onView(withId(R.id.ordersFragment))
            .check(matches(isDisplayed()))
    }
}
```

### 2.5 API Testing

**Scope**: Test API contract compliance
**Target**: All API endpoints defined in architecture
**Coverage Goal**: 100% of defined endpoints

#### Endpoints to Test:
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/courier/profile
- PUT /api/courier/profile
- GET /api/courier/orders/active
- GET /api/courier/orders/history
- GET /api/courier/orders/{id}
- PUT /api/courier/orders/{id}/status
- POST /api/courier/orders/{id}/photo
- GET /api/courier/statistics

#### Test Aspects:
- Request format
- Response format
- Status codes
- Error responses
- Authentication
- Data validation

## 3. Test Cases

### Feature: Authentication

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-AUTH-001 | Login with valid credentials | App installed, network available | 1. Enter valid username<br>2. Enter valid password<br>3. Click login | Login successful, navigate to main screen | Critical |
| TC-AUTH-002 | Login with invalid credentials | App installed, network available | 1. Enter invalid username<br>2. Enter password<br>3. Click login | Error message displayed, remain on login screen | High |
| TC-AUTH-003 | Login with empty fields | App at login screen | 1. Leave username empty<br>2. Leave password empty<br>3. Click login | Validation error shown for both fields | High |
| TC-AUTH-004 | Logout | User logged in | 1. Open profile<br>2. Click logout button | User logged out, navigate to login screen | Critical |
| TC-AUTH-005 | Auto-login on app restart | User previously logged in | 1. Close app<br>2. Reopen app | Auto-logged in, navigate to main screen | High |
| TC-AUTH-006 | Token expiration handling | User logged in, token expired | 1. Wait for token expiration<br>2. Perform any action | Navigate to login screen with appropriate message | High |
| TC-AUTH-007 | Login without network | No network connection | 1. Enter credentials<br>2. Click login | Network error message displayed | Medium |

### Feature: Order Management

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-ORD-001 | View active orders list | User logged in, has active orders | 1. Navigate to Orders tab | List of active orders displayed | Critical |
| TC-ORD-002 | View order details | On orders list | 1. Click on an order | Order details screen shown with all fields | Critical |
| TC-ORD-003 | Update order status to next step | Viewing order details | 1. Click status update button | Status updated, UI reflects change | Critical |
| TC-ORD-004 | Cannot skip status steps | Order with status ASSIGNED | 1. Try to update to DELIVERED | Error or option not available | High |
| TC-ORD-005 | View empty orders list | No active orders | 1. Navigate to Orders tab | Empty state message displayed | Medium |
| TC-ORD-006 | Refresh orders list | On orders tab | 1. Pull to refresh | Orders list refreshed from server | High |
| TC-ORD-007 | Order status update without network | Viewing order, no network | 1. Try to update status | Error message, option to retry | High |
| TC-ORD-008 | View order phone number | Viewing order details | 1. Find phone number field | Phone number clickable/copyable | Medium |
| TC-ORD-009 | Navigate to Yandex Maps | Viewing order details | 1. Click "Проложить маршрут" | Yandex Maps opens with address | Medium |
| TC-ORD-010 | Navigate when Maps not installed | Viewing order, Maps not installed | 1. Click "Проложить маршрут" | Web version opens or alternative shown | Low |

### Feature: Profile Management

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PROF-001 | View profile information | User logged in | 1. Navigate to Profile tab | Profile information displayed | High |
| TC-PROF-002 | Edit profile settings | On profile screen | 1. Click edit<br>2. Modify fields<br>3. Save | Changes saved and synced to server | High |
| TC-PROF-003 | Profile validation | Editing profile | 1. Enter invalid email<br>2. Try to save | Validation error shown | Medium |
| TC-PROF-004 | Profile sync across devices | User logged in on device 2 | 1. Change profile on device 1<br>2. Login on device 2 | Updated profile shown on device 2 | High |
| TC-PROF-005 | Profile edit without network | Editing profile, no network | 1. Modify fields<br>2. Try to save | Error message, local save | Medium |

### Feature: Order History

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-HIST-001 | View history list | User has completed orders | 1. Navigate to History tab | List of completed orders (24h) shown | High |
| TC-HIST-002 | View delivery statistics | On history tab, has completed orders | 1. Scroll to statistics section | Statistics displayed correctly | Medium |
| TC-HIST-003 | View empty history | No completed orders in period | 1. Navigate to History tab | Empty state message shown | Medium |
| TC-HIST-004 | History shows correct period | Has orders outside 24h window | 1. View history | Only last 24h orders shown | High |

### Feature: Photo Capture

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-PHOTO-001 | Capture delivery photo | Viewing order, marking delivered | 1. Click take photo<br>2. Capture photo | Photo captured and preview shown | Medium |
| TC-PHOTO-002 | Upload delivery photo | Photo captured | 1. Confirm photo | Photo uploaded to server | Medium |
| TC-PHOTO-003 | Retry failed upload | Photo upload failed | 1. Click retry | Upload attempted again | Low |
| TC-PHOTO-004 | Camera permission denied | No camera permission | 1. Try to take photo | Permission request or explanation shown | Medium |
| TC-PHOTO-005 | Skip photo capture | At photo capture screen | 1. Skip/cancel | Photo optional, can proceed | Low |

### Feature: Error Handling

| Test ID | Description | Preconditions | Steps | Expected Result | Priority |
|---------|-------------|---------------|-------|-----------------|----------|
| TC-ERR-001 | Network timeout | Poor network | 1. Perform API action | Timeout error with retry option | High |
| TC-ERR-002 | Server error 500 | Server returning errors | 1. Perform any action | Clear error message shown | High |
| TC-ERR-003 | Invalid API response | Server returns malformed data | 1. Fetch data | Graceful error handling, no crash | High |
| TC-ERR-004 | App reinstall | App installed with logged in user | 1. Uninstall app<br>2. Reinstall<br>3. Open app | Login screen shown, no crash | Medium |

## 4. Quality Metrics

### 4.1 Code Coverage
- **Target**: >70% for business logic
- **Tool**: JaCoCo or Android Studio coverage
- **Measured**: Lines, branches, methods
- **Exclusions**: UI code, data models, generated code

### 4.2 Test Success Rate
- **Target**: 100% of tests passing before merge
- **Measured**: Pass/fail ratio
- **Threshold**: 0 failing tests allowed in main branch

### 4.3 Defect Density
- **Target**: <5 critical bugs per 1000 lines of code
- **Measured**: Bugs found in testing per KLOC
- **Tracked**: In problem_journal.md

### 4.4 Performance Metrics (from NFRs)
- **App Launch**: <3 seconds
- **List Load**: <2 seconds
- **Status Update**: <1 second
- **Smooth Scrolling**: 60 FPS maintained

### 4.5 Stability Metrics
- **Crash Rate**: <0.1% sessions
- **ANR Rate**: 0 ANRs in testing
- **Memory Leaks**: 0 detected by LeakCanary

## 5. Test Environment

### 5.1 Testing Devices
**Minimum Requirements**:
- Android 7.0 (API 24) device/emulator
- 2GB RAM
- Camera (for photo tests)
- Network connectivity

**Recommended Test Matrix**:
| Device Type | Android Version | Screen Size | Manufacturer |
|-------------|-----------------|-------------|--------------|
| Emulator | 7.0 (API 24) | 5" | Generic |
| Emulator | 14 (API 34) | 6" | Pixel |
| Real Device | 8-10 | Various | Samsung/Xiaomi |
| Real Device | 11+ | Various | Any manufacturer |

### 5.2 Test Data
- **Mock Users**: 5 test courier accounts
- **Mock Orders**: 20 sample orders (various statuses)
- **Mock Images**: Test photos for upload
- **API Mocks**: JSON responses for all endpoints

### 5.3 Network Conditions
- **Good Network**: 4G/WiFi, low latency
- **Poor Network**: 3G, high latency (simulated)
- **No Network**: Airplane mode
- **Intermittent**: Connection drops mid-request

## 6. Test Schedule

### Iteration 16: Unit Testing (4-5 days)
- **Week 4-5** of project
- **Focus**: Business logic testing
- **Deliverables**:
  - ViewModel tests
  - Use case tests
  - Repository tests (with mocks)
  - Utility tests
  - >70% coverage achieved

### Iteration 17: UI Testing (3-4 days)
- **Week 5-6** of project
- **Focus**: User interface testing
- **Deliverables**:
  - Login flow tests
  - Order management flow tests
  - Navigation tests
  - Form validation tests
  - Critical path coverage

### Iteration 18: Error Handling & Edge Cases (3 days)
- **Week 6** of project
- **Focus**: Negative scenarios
- **Deliverables**:
  - Network error tests
  - Validation error tests
  - Permission denial tests
  - Edge case coverage
  - Error message verification

### Iteration 21: Final QA (3-4 days)
- **Week 8** of project
- **Focus**: Comprehensive testing
- **Deliverables**:
  - Full regression testing
  - Real device testing
  - Performance testing
  - Usability testing
  - Final bug fixes

## 7. Test Coverage Goals

### By Feature:
| Feature | Unit Tests | Integration Tests | UI Tests | Manual Tests |
|---------|------------|-------------------|----------|--------------|
| Authentication | 90% | 100% | 100% | Yes |
| Order Management | 80% | 100% | 100% | Yes |
| Profile | 75% | 100% | 80% | Yes |
| History/Statistics | 85% | 100% | 80% | Yes |
| Photo Capture | 70% | 100% | 100% | Yes |
| Maps Integration | N/A | 100% | 100% | Yes |

### By Layer:
| Layer | Coverage Goal | Testing Method |
|-------|---------------|----------------|
| Domain (Use Cases) | 90% | Unit tests |
| Data (Repositories) | 80% | Integration tests |
| Presentation (ViewModels) | 85% | Unit tests |
| UI (Fragments) | 70% | UI tests + Manual |

## 8. Test Execution Process

### 8.1 Continuous Testing
1. **Developer Testing**
   - Run unit tests before commit
   - Fix any failing tests
   - Check coverage delta

2. **Pre-Merge Testing**
   - All tests must pass
   - Coverage maintained or improved
   - Code review includes test review

3. **Integration Testing**
   - Run after each feature completion
   - Test integration points
   - Verify API contracts

4. **Regression Testing**
   - Run full test suite weekly
   - Before each milestone
   - After major changes

### 8.2 Bug Reporting
1. Bug discovered during testing
2. Create entry in problem_journal.md
3. Assign severity (Critical/High/Medium/Low)
4. Assign to developer
5. Fix and verify
6. Update problem_journal.md
7. Add regression test

### 8.3 Test Documentation
- Test results logged in iterations.md
- Failed tests documented in problem_journal.md
- Coverage reports generated and reviewed
- Test metrics tracked weekly

## 9. Acceptance Criteria

### For Each Feature:
- [ ] All critical test cases pass
- [ ] >70% unit test coverage
- [ ] All integration tests pass
- [ ] UI tests for happy path pass
- [ ] Error scenarios handled gracefully
- [ ] Performance meets NFRs
- [ ] No critical or high severity bugs
- [ ] Manual QA completed

### For Project Completion:
- [ ] Overall >70% code coverage
- [ ] All critical features tested
- [ ] 0 critical bugs open
- [ ] <5 high severity bugs open
- [ ] All acceptance criteria in requirements met
- [ ] App tested on min and max SDK
- [ ] App tested on different screen sizes
- [ ] Security testing completed
- [ ] Performance testing completed

## 10. Risk-Based Testing

### High-Risk Areas (Prioritize):
1. **Authentication & Security**
   - Token storage
   - HTTPS communication
   - Session management

2. **Order Status Workflow**
   - Status transition logic
   - Cannot skip steps
   - Status persistence

3. **Network Operations**
   - API failures
   - Timeout handling
   - Retry logic

4. **Data Synchronization**
   - Profile sync
   - Status updates
   - Conflict resolution

### Medium-Risk Areas:
1. **Camera Functionality**
2. **Photo Upload**
3. **Statistics Calculation**
4. **Maps Integration**

### Low-Risk Areas:
1. **UI Layouts**
2. **Static Content**
3. **Help Text**

## 11. Testing Tools Setup

### 11.1 Unit Testing Dependencies
```gradle
testImplementation("junit:junit:4.13.2")
testImplementation("io.mockk:mockk:1.13.12")
testImplementation("com.google.truth:truth:1.4.4")
testImplementation("app.cash.turbine:turbine:1.1.0")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
testImplementation("androidx.arch.core:core-testing:2.2.0")
```

### 11.2 UI Testing Dependencies
```gradle
androidTestImplementation("androidx.test.ext:junit:1.3.0")
androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
androidTestImplementation("androidx.test.espresso:espresso-contrib:3.7.0")
androidTestImplementation("androidx.test:runner:1.6.2")
androidTestImplementation("androidx.test:rules:1.6.1")
androidTestImplementation("com.google.dagger:hilt-android-testing:2.51")
```

### 11.3 Integration Testing
```gradle
testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
androidTestImplementation("androidx.room:room-testing:2.6.1")
```

## 12. Continuous Integration (Optional)

If using CI/CD:
- Run unit tests on every commit
- Run integration tests on PR
- Run full test suite nightly
- Generate coverage reports
- Block merge if tests fail
- Auto-comment PR with coverage

## 13. Test Maintenance

### Regular Activities:
- **Weekly**: Review test failures, update flaky tests
- **Bi-weekly**: Review and update test cases
- **Monthly**: Update test data, review coverage
- **Per Iteration**: Add tests for new features

### Test Code Quality:
- Clear test names
- Arrange-Act-Assert pattern
- One assertion per test (guideline)
- DRY principle for test code
- Comments for complex test scenarios

## 14. Final Notes

- Testing is integrated throughout development, not just at the end
- This is учебный проект - testing is part of learning
- Quality over speed - better to have fewer well-tested features
- Document learnings from testing in iterations.md
- Update this plan as needed based on actual experience
