# Project Plan

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Approved

## 1. Project Overview

**Project Name**: Courier Mobile Application (curier_mobile)

**Purpose**: Develop a SaaS courier delivery application for Android that enables couriers working for private entrepreneurs to manage their delivery tasks, update order statuses, and track their delivery history.

**Scope**:
- Android mobile application for couriers only (admin application is out of scope)
- Three main sections: Profile, Active Orders, and History
- Authentication and profile management
- Order status tracking with predefined workflow
- Integration with Yandex Maps for navigation
- Delivery proof photo capture
- API specification for backend implementation

**Success Criteria**:
- Functional courier application meeting all critical requirements
- Smooth order status workflow
- Clean, intuitive Russian language interface
- Complete API specification for backend team
- Working prototype deployable on Android 7.0+

## 2. Project Scope

### In Scope:
✓ Courier mobile application for Android
✓ User authentication (login/logout)
✓ Profile management with server sync
✓ Active orders list and details display
✓ Order status workflow management
✓ Order history with statistics
✓ Yandex Maps navigation integration
✓ Delivery proof photo capture
✓ API endpoint specification
✓ Material Design UI in Russian

### Out of Scope:
✗ Administrator application
✗ Backend implementation (only API specification)
✗ Payment processing
✗ Real-time GPS tracking
✗ Push notifications
✗ Offline mode
✗ iOS version
✗ Multi-language support

## 3. Project Timeline

**Total Estimated Duration**: 6-8 weeks

**Key Milestones**:
- Week 1: Documentation and Architecture (Completed during this phase)
- Week 2-3: Core Infrastructure and Authentication
- Week 3-4: Order Management Features
- Week 5: History and Statistics
- Week 6: Photo Capture and Maps Integration
- Week 7: Testing and Refinement
- Week 8: Final QA and Deployment Preparation

## 4. Milestones and Deliverables

### Milestone 1: Project Foundation (Week 1)
**Target Date**: End of Week 1
**Status**: In Progress
**Deliverables**:
- ✓ Requirements Specification document
- ✓ Project Plan document
- ⏳ Architecture Design document
- ⏳ Dependencies Analysis document
- ⏳ Risk Register document
- ⏳ Test Plan document

### Milestone 2: Core Architecture Setup (Week 2)
**Target Date**: End of Week 2
**Status**: Pending
**Deliverables**:
- Project structure with MVVM architecture
- Dependency injection setup (Hilt/Koin)
- Network layer with Retrofit
- Local storage setup (Room database for preferences)
- Base UI components and navigation
- API client structure

### Milestone 3: Authentication Module (Week 2-3)
**Target Date**: End of Week 3
**Status**: Pending
**Deliverables**:
- Login screen UI
- Authentication logic
- Token management
- Secure storage implementation
- Session handling
- Profile data model
- Auth API endpoints specification

### Milestone 4: Profile Management (Week 3)
**Target Date**: End of Week 3
**Status**: Pending
**Deliverables**:
- Profile screen UI
- Profile settings form
- Profile data sync with server
- Settings persistence
- Profile API endpoints specification

### Milestone 5: Orders Module - Core (Week 3-4)
**Target Date**: End of Week 4
**Status**: Pending
**Deliverables**:
- Orders tab with list view
- Order model and data layer
- Active orders API integration
- Order details screen
- Order details display with all fields
- Orders API endpoints specification

### Milestone 6: Order Status Management (Week 4)
**Target Date**: End of Week 4
**Status**: Pending
**Deliverables**:
- Status update UI component
- Status workflow validation logic
- Status update API integration
- Real-time status synchronization
- Status update confirmation feedback

### Milestone 7: History and Statistics (Week 5)
**Target Date**: End of Week 5
**Status**: Pending
**Deliverables**:
- History tab UI
- Completed orders list
- Statistics calculation logic
- Statistics display component
- History API integration
- Date filtering for 24-hour period

### Milestone 8: Enhanced Features (Week 6)
**Target Date**: End of Week 6
**Status**: Pending
**Deliverables**:
- Camera integration
- Photo capture UI
- Photo upload functionality
- Yandex Maps navigation integration
- "Проложить маршрут" button functionality
- Photo API endpoint specification

### Milestone 9: Testing and Quality Assurance (Week 7)
**Target Date**: End of Week 7
**Status**: Pending
**Deliverables**:
- Unit tests for business logic
- UI tests for critical flows
- Integration tests for API layer
- Bug fixes
- Performance optimization
- Security audit

### Milestone 10: Final Delivery (Week 8)
**Target Date**: End of Week 8
**Status**: Pending
**Deliverables**:
- Final bug fixes
- Documentation update
- API specification document
- APK build for testing
- Deployment guide
- User manual (if required)

## 5. Detailed Iterations

### Iteration 1: Documentation Phase
**Duration**: 3-4 days
**Priority**: Critical
**Tasks**:
1. ✓ Create requirements specification
   - Functional requirements
   - Non-functional requirements
   - User stories
   - API requirements
2. ✓ Create project plan with milestones
3. Create architecture design document
4. Analyze and document dependencies
5. Create risk register
6. Create test plan
7. Update discussion summary

**Time Estimate**: 16-24 hours
**Dependencies**: None
**Definition of Done**:
- All documentation files complete
- Architecture approved
- Dependencies identified and justified
- Risks documented with mitigation plans
- Test strategy defined

### Iteration 2: Project Structure Setup
**Duration**: 2-3 days
**Priority**: Critical
**Tasks**:
1. Set up MVVM architecture packages
2. Configure dependency injection (Hilt recommended)
3. Set up Navigation Component
4. Create base Activity and Fragment classes
5. Configure build variants (debug/release)
6. Set up ProGuard rules
7. Configure network security

**Time Estimate**: 12-16 hours
**Dependencies**: Iteration 1
**Definition of Done**:
- Project compiles successfully
- Architecture layers clearly separated
- DI framework working
- Navigation infrastructure ready
- No build warnings

### Iteration 3: Network Layer
**Duration**: 2-3 days
**Priority**: Critical
**Tasks**:
1. Add Retrofit and OkHttp dependencies
2. Create API service interfaces
3. Implement network interceptors
4. Set up error handling
5. Create DTO (Data Transfer Objects) models
6. Implement repository pattern
7. Create mock API responses for development

**Time Estimate**: 14-18 hours
**Dependencies**: Iteration 2
**Definition of Done**:
- Network calls can be made
- Errors handled gracefully
- Mock data available for testing
- Repository pattern implemented

### Iteration 4: Local Storage
**Duration**: 2 days
**Priority**: High
**Tasks**:
1. Add Room database dependency
2. Create database entities for cached data
3. Set up SharedPreferences/DataStore for settings
4. Implement secure storage for tokens (EncryptedSharedPreferences)
5. Create DAOs (Data Access Objects)
6. Implement database migrations strategy

**Time Estimate**: 10-12 hours
**Dependencies**: Iteration 2
**Definition of Done**:
- Database setup complete
- Tokens stored securely
- Settings persistence working
- Data models tested

### Iteration 5: Authentication UI
**Duration**: 2-3 days
**Priority**: Critical
**Tasks**:
1. Design login screen layout
2. Implement login form with validation
3. Create ViewModel for login logic
4. Add loading states
5. Implement error handling UI
6. Add Russian language strings
7. Style according to Material Design

**Time Estimate**: 12-16 hours
**Dependencies**: Iteration 2, 3
**Definition of Done**:
- Login screen displays correctly
- Form validation works
- Loading and error states visible
- All text in Russian
- Follows Material Design

### Iteration 6: Authentication Logic
**Duration**: 2-3 days
**Priority**: Critical
**Tasks**:
1. Implement login API call
2. Token storage and retrieval
3. Session management
4. Auto-login on app start
5. Logout functionality
6. Token refresh mechanism
7. Handle authentication errors

**Time Estimate**: 12-16 hours
**Dependencies**: Iteration 3, 4, 5
**Definition of Done**:
- User can log in with credentials
- Token stored securely
- Session persists across app restarts
- Logout clears session
- Expired tokens handled

### Iteration 7: Profile UI and Logic
**Duration**: 3 days
**Priority**: High
**Tasks**:
1. Create profile screen layout
2. Profile tab navigation
3. Display user information
4. Create settings form (DOB, phone, email)
5. Implement form validation
6. Add edit/save functionality
7. Sync with server API
8. Handle sync errors

**Time Estimate**: 14-18 hours
**Dependencies**: Iteration 6
**Definition of Done**:
- Profile displays user data
- Settings can be edited
- Changes sync to server
- Validation prevents invalid data
- Sync errors handled gracefully

### Iteration 8: Orders Data Layer
**Duration**: 3 days
**Priority**: Critical
**Tasks**:
1. Create Order data models
2. Design order status enum
3. Implement Orders API service
4. Create Orders repository
5. Add status workflow validation
6. Implement order caching logic
7. Create order state management

**Time Estimate**: 14-18 hours
**Dependencies**: Iteration 3, 4
**Definition of Done**:
- Order models complete
- API service defined
- Repository pattern working
- Status workflow validates correctly
- Data flows properly

### Iteration 9: Orders List UI
**Duration**: 3-4 days
**Priority**: Critical
**Tasks**:
1. Create Orders tab layout
2. Design order list item layout
3. Implement RecyclerView adapter
4. Create ViewModel for orders
5. Implement pull-to-refresh
6. Add empty state handling
7. Add loading state
8. Handle API errors
9. Filter active vs completed orders

**Time Estimate**: 16-20 hours
**Dependencies**: Iteration 8
**Definition of Done**:
- Orders list displays correctly
- Can refresh orders
- Empty and loading states work
- Active orders filtered properly
- Error states handled

### Iteration 10: Order Details UI
**Duration**: 2-3 days
**Priority**: Critical
**Tasks**:
1. Create order details screen layout
2. Display all order fields
   - Order number
   - Customer name
   - Delivery address
   - Phone number
   - Product description
   - Comments
   - Current status
3. Make phone number clickable/copyable
4. Add navigation from list to details
5. Style for readability

**Time Estimate**: 12-16 hours
**Dependencies**: Iteration 9
**Definition of Done**:
- All order info displayed
- Navigation works smoothly
- Phone number interactive
- Layout is clean and readable
- Follows design guidelines

### Iteration 11: Status Update Feature
**Duration**: 3-4 days
**Priority**: Critical
**Tasks**:
1. Create status update UI component
2. Show current status prominently
3. Display next available status
4. Implement status update button
5. Add confirmation dialogs
6. Implement status update API call
7. Handle update success/failure
8. Refresh order data after update
9. Validate status workflow
10. Add timestamp display

**Time Estimate**: 16-20 hours
**Dependencies**: Iteration 10
**Definition of Done**:
- Status can be updated
- Workflow enforced (no skipping)
- Updates saved to server
- UI reflects changes immediately
- Errors handled appropriately

### Iteration 12: History Tab
**Duration**: 3 days
**Priority**: High
**Tasks**:
1. Create History tab layout
2. Implement history list UI
3. Create history ViewModel
4. Fetch completed orders (24h)
5. Display order summary in list
6. Show completion timestamps
7. Add date filtering logic
8. Handle empty history state

**Time Estimate**: 14-18 hours
**Dependencies**: Iteration 8, 9
**Definition of Done**:
- History displays last 24h orders
- Completed orders only
- Timestamps visible
- Empty state handled
- Data loads correctly

### Iteration 13: Statistics Feature
**Duration**: 2-3 days
**Priority**: Medium
**Tasks**:
1. Create statistics UI component
2. Calculate total deliveries
3. Calculate average delivery time
4. Calculate success rate
5. Display statistics in History tab
6. Add visual charts/graphs (optional)
7. Update stats when new orders complete
8. Handle edge cases (no data)

**Time Estimate**: 12-16 hours
**Dependencies**: Iteration 12
**Definition of Done**:
- Statistics calculate correctly
- Display is clear and informative
- Updates automatically
- Handles zero deliveries
- Visually appealing

### Iteration 14: Camera Integration
**Duration**: 3-4 days
**Priority**: Medium
**Tasks**:
1. Add camera permissions
2. Implement camera capture using CameraX
3. Create photo capture UI
4. Add photo preview
5. Implement photo compression
6. Create photo upload logic
7. Show upload progress
8. Handle upload errors
9. Store photo reference with order
10. Allow photo viewing after upload

**Time Estimate**: 16-20 hours
**Dependencies**: Iteration 11
**Definition of Done**:
- Camera opens correctly
- Photo captured successfully
- Photo compressed appropriately
- Upload works with progress
- Photo linked to order
- Can view uploaded photo

### Iteration 15: Yandex Maps Integration
**Duration**: 2 days
**Priority**: Medium
**Tasks**:
1. Add Yandex Maps intent handling
2. Create "Проложить маршрут" button
3. Format address for Maps
4. Implement intent to open Yandex Maps
5. Handle Maps app not installed case
6. Fallback to web version
7. Test with various addresses

**Time Estimate**: 10-12 hours
**Dependencies**: Iteration 10
**Definition of Done**:
- Button opens Yandex Maps
- Correct address passed
- Handles app not installed
- Web fallback works
- Tested with real addresses

### Iteration 16: Unit Testing
**Duration**: 4-5 days
**Priority**: High
**Tasks**:
1. Write tests for ViewModels
2. Write tests for repositories
3. Write tests for status workflow
4. Write tests for data validation
5. Write tests for business logic
6. Mock API responses for tests
7. Achieve >70% code coverage for logic layer

**Time Estimate**: 20-24 hours
**Dependencies**: All feature iterations
**Definition of Done**:
- All critical logic tested
- Tests pass consistently
- Code coverage >70%
- Mock data comprehensive
- CI/CD ready

### Iteration 17: UI Testing
**Duration**: 3-4 days
**Priority**: Medium
**Tasks**:
1. Write Espresso tests for login flow
2. Write tests for order list
3. Write tests for status updates
4. Write tests for navigation
5. Write tests for form validation
6. Test error scenarios
7. Test happy paths

**Time Estimate**: 16-20 hours
**Dependencies**: All UI iterations
**Definition of Done**:
- Critical user flows tested
- Tests run on emulator
- Tests pass reliably
- Cover main use cases
- Automated where possible

### Iteration 18: Error Handling and Edge Cases
**Duration**: 3 days
**Priority**: High
**Tasks**:
1. Review all error scenarios
2. Implement retry mechanisms
3. Add timeout handling
4. Improve error messages
5. Handle network failures
6. Handle invalid data responses
7. Add offline state detection
8. Test all error paths

**Time Estimate**: 14-18 hours
**Dependencies**: All feature iterations
**Definition of Done**:
- All errors handled gracefully
- Error messages are clear
- Retry options available
- App doesn't crash on errors
- User informed appropriately

### Iteration 19: Performance Optimization
**Duration**: 2-3 days
**Priority**: Medium
**Tasks**:
1. Profile app performance
2. Optimize image loading
3. Optimize database queries
4. Reduce memory usage
5. Optimize RecyclerView scrolling
6. Reduce app size
7. Optimize network calls
8. Add caching where appropriate

**Time Estimate**: 12-16 hours
**Dependencies**: All feature iterations
**Definition of Done**:
- App launch <3 seconds
- List scrolling smooth
- No memory leaks
- Network efficient
- Meets performance NFRs

### Iteration 20: Security Audit
**Duration**: 2 days
**Priority**: High
**Tasks**:
1. Review token storage security
2. Ensure HTTPS enforcement
3. Check for data leaks in logs
4. Validate input sanitization
5. Review password handling
6. Check permissions usage
7. Review ProGuard configuration
8. Scan for vulnerabilities

**Time Estimate**: 10-12 hours
**Dependencies**: All iterations
**Definition of Done**:
- No security vulnerabilities
- Tokens stored securely
- HTTPS enforced
- No sensitive logs
- Permissions justified

### Iteration 21: Final Polish and QA
**Duration**: 3-4 days
**Priority**: High
**Tasks**:
1. Full app testing on real devices
2. Test on different screen sizes
3. Test on Android 7.0 - 14
4. Fix all critical bugs
5. UI/UX improvements
6. Ensure all Russian text correct
7. Final code review
8. Update documentation
9. Prepare release notes

**Time Estimate**: 16-20 hours
**Dependencies**: All previous iterations
**Definition of Done**:
- No critical bugs
- Works on all target devices
- UI polished
- Documentation complete
- Ready for deployment

## 6. Resource Allocation

**Development Team**:
- Android Developer (Primary): Full-time
- Backend Developer: Part-time (for API specification consultation)
- QA Tester: Part-time (weeks 7-8)

**Tools and Resources**:
- Android Studio (latest stable)
- Git for version control
- Postman for API testing
- Firebase Test Lab or similar for device testing
- Figma or similar for UI mockups (if needed)

## 7. Dependencies

### Internal Dependencies:
- Documentation completion before development
- Architecture design before coding
- Network layer before API integration
- Authentication before other features
- Core features before enhancements

### External Dependencies:
- Backend API implementation (based on our specification)
- Yandex Maps availability
- Android SDK and tools
- Third-party libraries availability

### Critical Path:
Documentation → Architecture Setup → Authentication → Orders Core → Status Management → Testing

## 8. Success Criteria

### Technical Success:
- [ ] All critical requirements (FR-1.1.x) implemented
- [ ] App runs on Android 7.0+
- [ ] No critical bugs
- [ ] Performance meets NFRs
- [ ] Security requirements met
- [ ] Code quality standards met
- [ ] Test coverage >70% for business logic

### Functional Success:
- [ ] Courier can log in successfully
- [ ] All active orders display correctly
- [ ] Status workflow works as designed
- [ ] History shows completed orders
- [ ] Statistics calculate accurately
- [ ] Photos can be captured and uploaded
- [ ] Yandex Maps integration works
- [ ] Profile sync works across devices

### Quality Success:
- [ ] UI follows Material Design
- [ ] All text in Russian
- [ ] Responsive and smooth UX
- [ ] Clear error messages
- [ ] Handles edge cases
- [ ] No memory leaks
- [ ] Battery efficient

### Business Success:
- [ ] API specification complete for backend team
- [ ] Educational value delivered (учебный проект)
- [ ] Can be demonstrated to stakeholders
- [ ] Foundation for future enhancements
- [ ] Documentation sufficient for maintenance

## 9. Risk Mitigation References

Refer to `risk_register.md` for detailed risk analysis and mitigation strategies.

## 10. Change Management

Any changes to this plan must:
1. Be documented in `change_log.md`
2. Update this document
3. Update affected iterations
4. Assess impact on timeline and dependencies
5. Get stakeholder approval if scope changes

## 11. Communication Plan

**Progress Updates**:
- Document progress in `iterations.md` after each iteration
- Update `discussion_summary.md` with key decisions
- Log problems in `problem_journal.md`
- Record user feedback in `feedback_journal.md`

**Checkpoints**:
- End of each milestone
- After each major iteration
- Weekly progress summary
- When blockers encountered

## 12. Notes

- This is an educational project (учебный проект), so focus on learning and best practices
- Backend API will be implemented separately based on our specification
- Timeline estimates are flexible and may adjust based on actual progress
- Priority is on core functionality first, then enhancements
- Code quality and architecture are important for learning value
