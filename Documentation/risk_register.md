# Risk Register

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Active

## Legend
- **Probability**: Low (10-30%) / Medium (40-60%) / High (70-90%)
- **Impact**: Low / Medium / High / Critical
- **Severity**: Low / Medium / High / Critical (Probability × Impact)
- **Status**: Identified / Monitored / Mitigated / Resolved

## Risk Assessment Matrix

| Risk ID | Category | Risk Description | Probability | Impact | Severity | Mitigation Strategy | Owner | Status |
|---------|----------|------------------|-------------|--------|----------|---------------------|-------|--------|
| R-001 | Backend | No backend API exists yet | High | Critical | Critical | Create detailed API specification; Provide mock API; Suggest backend technologies | Dev Team | Identified |
| R-002 | Dependencies | security-crypto library in alpha | Medium | Medium | Medium | Test thoroughly; Monitor for stable release; Have fallback to older SharedPreferences | Dev Team | Monitored |
| R-003 | Technical | Complex Clean Architecture for first-time developers | Medium | Medium | Medium | Detailed documentation; Code examples; Iterative development | Dev Team | Mitigated |
| R-004 | Network | Poor network connectivity in real usage | High | Medium | High | Graceful error handling; Retry mechanisms; User feedback | Dev Team | Mitigated |
| R-005 | Camera | CameraX compatibility issues on older devices | Medium | High | High | Extensive device testing; Fallback to Camera2; Handle permissions properly | Dev Team | Monitored |
| R-006 | Authentication | Token security vulnerabilities | Low | Critical | High | Use EncryptedSharedPreferences; HTTPS only; Token expiration | Dev Team | Mitigated |
| R-007 | Storage | Photos filling device storage | Medium | Medium | Medium | Image compression; Warn user; Upload immediately; Delete after upload | Dev Team | Mitigated |
| R-008 | Performance | Slow app performance on low-end devices | Medium | High | High | Performance testing; Optimize images; Lazy loading; Profiling | Dev Team | Monitored |
| R-009 | Learning Curve | Steep learning curve for new technologies | High | Medium | High | Documentation; Examples; Step-by-step tutorials; Code comments | Dev Team | Mitigated |
| R-010 | Scope Creep | Additional features requested mid-development | Medium | High | High | Clear requirements; Change management process; Defer to v2 | PM | Mitigated |
| R-011 | Testing | Insufficient testing coverage | Medium | High | High | Unit tests >70%; Integration tests; Manual QA; Test plan | QA Team | Planned |
| R-012 | Timeline | Development taking longer than estimated | Medium | Medium | Medium | Buffer time in estimates; Prioritize MVP; Cut non-critical features | PM | Monitored |
| R-013 | Device Fragmentation | App not working on some Android versions/devices | High | High | High | Test on multiple devices; Use AndroidX; Handle API differences | Dev Team | Mitigated |
| R-014 | Yandex Maps | Yandex Maps not installed on device | High | Low | Medium | Detect installation; Fallback to web version; Clear user messaging | Dev Team | Mitigated |
| R-015 | Data Loss | User data lost during sync failures | Low | Critical | High | Local persistence; Retry logic; Conflict resolution; User feedback | Dev Team | Mitigated |

## Detailed Risk Analysis

### R-001: No Backend API Exists Yet
**Category:** Backend
**Probability:** High (90%)
**Impact:** Critical
**Severity:** Critical

**Description:**
The backend API does not exist. This is a critical blocker as the app cannot function without API endpoints.

**Potential Consequences:**
- Cannot test real API integration
- May discover API design flaws late
- Integration issues during backend development
- Delayed testing and QA

**Mitigation Strategy:**
1. **Create Detailed API Specification:**
   - Document all endpoints in architecture_design.md (Done)
   - Include request/response examples
   - Specify error codes and messages
   - Define authentication flow

2. **Mock API for Development:**
   - Use MockWebServer for tests
   - Create JSON mock responses
   - Simulate network delays
   - Test error scenarios

3. **Backend Development Support:**
   - Provide API spec to backend team
   - Recommend Node.js/Express or Spring Boot
   - Suggest database schema
   - Define data models

4. **Parallel Development:**
   - Develop UI with mock data
   - Implement business logic independently
   - Integration when backend ready

**Owner:** Development Team
**Status:** Identified - Mitigation in progress via documentation

---

### R-002: security-crypto Library in Alpha
**Category:** Dependencies
**Probability:** Medium (50%)
**Impact:** Medium
**Severity:** Medium

**Description:**
The androidx.security:security-crypto library is in alpha stage, which may have bugs or API changes.

**Potential Consequences:**
- API breaking changes in updates
- Potential security vulnerabilities
- Crashes on certain devices
- Need to rewrite code if library changes

**Mitigation Strategy:**
1. **Extensive Testing:**
   - Test on multiple devices
   - Test encryption/decryption cycles
   - Test app reinstall scenarios
   - Monitor for crashes

2. **Monitor for Stable Release:**
   - Check for updates regularly
   - Read changelogs carefully
   - Plan migration to stable when available

3. **Fallback Plan:**
   - Document alternative: older Android Keystore API
   - Keep implementation encapsulated
   - Easy to swap implementations

4. **Limit Dependency:**
   - Only use for token storage
   - Keep usage minimal and isolated
   - Don't rely on advanced features

**Owner:** Development Team
**Status:** Monitored - Using with caution

---

### R-003: Complex Clean Architecture
**Category:** Technical
**Probability:** Medium (60%)
**Impact:** Medium
**Severity:** Medium

**Description:**
Clean Architecture with MVVM may be complex for developers new to the pattern, leading to slower development and potential anti-patterns.

**Potential Consequences:**
- Slower initial development
- Confusion about layer boundaries
- Improper dependency injection usage
- Difficulty understanding code flow

**Mitigation Strategy:**
1. **Comprehensive Documentation:**
   - Detailed architecture documentation (Done)
   - Package structure explained
   - Data flow diagrams
   - Layer responsibility definitions

2. **Code Examples:**
   - Create template classes
   - Document common patterns
   - Provide use case examples
   - Comment code extensively

3. **Iterative Learning:**
   - Start simple, add complexity gradually
   - Focus on one feature at a time
   - Refactor as understanding grows
   - Code reviews for learning

4. **Educational Value:**
   - This is учебный проект - learning is the goal
   - Document learnings in iterations.md
   - Explain architectural decisions
   - Reference best practices

**Owner:** Development Team
**Status:** Mitigated via documentation

---

### R-004: Poor Network Connectivity
**Category:** Network
**Probability:** High (80%)
**Impact:** Medium
**Severity:** High

**Description:**
Couriers work in areas with poor mobile connectivity, leading to failed API calls and poor user experience.

**Potential Consequences:**
- Failed status updates
- Frustrated users
- Data loss
- Poor app ratings

**Mitigation Strategy:**
1. **Graceful Error Handling:**
   - Catch all network errors
   - Display clear error messages in Russian
   - Explain what went wrong
   - Suggest user actions

2. **Retry Mechanisms:**
   - Automatic retry with exponential backoff
   - Manual retry button
   - Queue failed requests
   - Retry when connectivity restored

3. **User Feedback:**
   - Loading indicators
   - Success/error messages
   - Network status indicator
   - Offline mode indicator

4. **Timeout Configuration:**
   - Reasonable timeouts (30s)
   - Cancel long-running requests
   - Don't block UI

5. **Testing:**
   - Test with airplane mode
   - Test with slow network
   - Test timeout scenarios
   - Test connection loss mid-request

**Owner:** Development Team
**Status:** Mitigated in architecture design

---

### R-005: CameraX Compatibility Issues
**Category:** Camera
**Probability:** Medium (50%)
**Impact:** High
**Severity:** High

**Description:**
CameraX may have compatibility issues on older or less common Android devices, preventing photo capture.

**Potential Consequences:**
- Cannot take delivery photos on some devices
- App crashes when opening camera
- Poor user experience
- Feature unusable for some couriers

**Mitigation Strategy:**
1. **Extensive Device Testing:**
   - Test on Android 7.0 - 14
   - Test on different manufacturers
   - Test on low-end devices
   - Test different screen sizes

2. **Permissions Handling:**
   - Request permissions properly
   - Handle permission denial
   - Explain why permission needed
   - Graceful degradation

3. **Error Handling:**
   - Catch camera initialization errors
   - Display meaningful error messages
   - Offer troubleshooting steps
   - Allow skipping photo (optional feature)

4. **Fallback Options:**
   - Make photo optional (as per requirements)
   - Consider Camera2 API fallback
   - Or gallery photo selection
   - Document device-specific issues

5. **CameraX Best Practices:**
   - Use lifecycle-aware components
   - Proper cleanup
   - Handle rotation
   - Memory management

**Owner:** Development Team
**Status:** Monitored - Will address in Iteration 14

---

### R-006: Token Security Vulnerabilities
**Category:** Authentication
**Probability:** Low (20%)
**Impact:** Critical
**Severity:** High

**Description:**
Improper token storage or transmission could lead to security breaches and unauthorized access.

**Potential Consequences:**
- Stolen authentication tokens
- Unauthorized access to courier accounts
- Data breaches
- Privacy violations
- Reputation damage

**Mitigation Strategy:**
1. **Encrypted Storage:**
   - Use EncryptedSharedPreferences
   - Android Keystore for keys
   - No tokens in plain text
   - Secure deletion on logout

2. **HTTPS Only:**
   - Enforce HTTPS for all API calls
   - Network security configuration
   - Certificate pinning (optional)
   - No HTTP fallback

3. **Token Management:**
   - Short token expiration (24h)
   - Refresh token mechanism
   - Automatic logout on expiration
   - Revoke on logout

4. **Code Security:**
   - ProGuard/R8 obfuscation
   - No secrets in code
   - No logging of tokens
   - Security code review

5. **Testing:**
   - Security audit in Iteration 20
   - Penetration testing (optional)
   - Review security best practices
   - Check OWASP guidelines

**Owner:** Development Team
**Status:** Mitigated in architecture

---

### R-007: Photos Filling Device Storage
**Category:** Storage
**Probability:** Medium (50%)
**Impact:** Medium
**Severity:** Medium

**Description:**
Delivery photos accumulating on device could fill storage, causing app or device issues.

**Potential Consequences:**
- Device storage full
- App cannot save new photos
- Poor device performance
- User frustration

**Mitigation Strategy:**
1. **Image Compression:**
   - Compress before storage (Compressor library)
   - Reduce resolution appropriately
   - Optimize JPEG quality
   - Target <500KB per photo

2. **Immediate Upload:**
   - Upload photo immediately after capture
   - Don't keep local copy long
   - Delete after successful upload
   - Retry upload if failed

3. **Storage Management:**
   - Check available storage before capture
   - Warn user if storage low
   - Clear old photos periodically
   - Implement photo cache limits

4. **User Control:**
   - Settings for photo quality
   - Manual cache clearing option
   - Display storage usage
   - Photo preview before upload

**Owner:** Development Team
**Status:** Mitigated in design (Iteration 14)

---

### R-008: Slow App Performance
**Category:** Performance
**Probability:** Medium (50%)
**Impact:** High
**Severity:** High

**Description:**
App may perform poorly on low-end devices or with large datasets, degrading user experience.

**Potential Consequences:**
- Slow UI responsiveness
- Janky scrolling
- Long loading times
- ANR (Application Not Responding)
- Battery drain
- Negative reviews

**Mitigation Strategy:**
1. **Performance Testing:**
   - Profile app regularly
   - Test on low-end devices
   - Monitor memory usage
   - Check battery impact
   - Measure startup time

2. **Optimization Techniques:**
   - RecyclerView for lists
   - Image loading optimization (Coil)
   - Lazy loading
   - Database query optimization
   - Coroutines for background work

3. **Performance Goals (NFRs):**
   - App launch <3 seconds
   - List load <2 seconds
   - Smooth scrolling (60 FPS)
   - No memory leaks

4. **Monitoring Tools:**
   - Android Profiler
   - LeakCanary for memory leaks
   - Systrace for rendering
   - StrictMode in debug

5. **Iteration 19:**
   - Dedicated performance optimization iteration
   - Profile and fix issues
   - Meet all performance NFRs

**Owner:** Development Team
**Status:** Monitored - Performance iteration planned

---

### R-009: Steep Learning Curve
**Category:** Learning
**Probability:** High (70%)
**Impact:** Medium
**Severity:** High

**Description:**
Multiple new technologies (Hilt, Coroutines, MVVM, Clean Architecture) may overwhelm developers, slowing progress.

**Potential Consequences:**
- Slower development than planned
- Code quality issues
- Anti-patterns
- Technical debt
- Frustration

**Mitigation Strategy:**
1. **Comprehensive Documentation:**
   - Detailed architecture docs (Done)
   - Code examples for each layer
   - Explain design decisions
   - Reference materials

2. **Incremental Learning:**
   - One concept at a time
   - Start simple, add complexity
   - Refactor as understanding grows
   - Celebrate small wins

3. **Code Quality:**
   - Extensive code comments (in Russian)
   - README for each module
   - Document "why" not just "what"
   - Link to official docs

4. **Educational Resources:**
   - Official Android documentation
   - Kotlin coroutines guide
   - Hilt documentation
   - MVVM tutorials

5. **This is учебный проект:**
   - **Learning is the primary goal**
   - Take time to understand
   - Experiment and iterate
   - Document learnings
   - Quality over speed

**Owner:** Development Team
**Status:** Mitigated - Documentation approach

---

### R-010: Scope Creep
**Category:** Project Management
**Probability:** Medium (50%)
**Impact:** High
**Severity:** High

**Description:**
Additional features may be requested during development, expanding scope and delaying completion.

**Potential Consequences:**
- Project timeline延长
- Budget overrun (if applicable)
- Team burnout
- Core features delayed
- Quality degradation

**Mitigation Strategy:**
1. **Clear Requirements:**
   - Detailed requirements doc (Done)
   - Signed off by stakeholder
   - Clear scope boundaries
   - In-scope vs out-of-scope defined

2. **Change Management Process:**
   - All changes documented in change_log.md
   - Impact assessment required
   - Approval process
   - Update project plan

3. **Prioritization:**
   - Must-have vs nice-to-have
   - MVP first approach
   - Defer enhancements to v2
   - Focus on critical features

4. **Communication:**
   - Regular stakeholder updates
   - Manage expectations
   - Explain trade-offs
   - Discuss timeline impact

5. **Version Planning:**
   - Plan v1.0 (MVP)
   - Defer features to v1.1, v2.0
   - Roadmap for future
   - Iterative releases

**Owner:** Project Manager / Development Team
**Status:** Mitigated - Clear requirements established

---

### R-011: Insufficient Testing Coverage
**Category:** Testing
**Probability:** Medium (50%)
**Impact:** High
**Severity:** High

**Description:**
Without adequate testing, bugs may reach production, causing failures and poor user experience.

**Potential Consequences:**
- Bugs in production
- App crashes
- Data loss
- Poor reviews
- Costly fixes

**Mitigation Strategy:**
1. **Test Plan:**
   - Comprehensive test plan (To be created)
   - Unit, integration, UI tests
   - Test cases for all features
   - Edge case coverage

2. **Coverage Goals:**
   - >70% code coverage for business logic
   - All critical flows tested
   - All error scenarios tested
   - Regression test suite

3. **Testing Iterations:**
   - Iteration 16: Unit tests
   - Iteration 17: UI tests
   - Iteration 18: Error handling
   - Iteration 21: Final QA

4. **Testing Tools:**
   - JUnit, MockK for unit tests
   - Espresso for UI tests
   - MockWebServer for API tests
   - Real device testing

5. **Continuous Testing:**
   - Test each iteration
   - Test before merge
   - Regression testing
   - Manual QA

**Owner:** QA Team / Development Team
**Status:** Planned - Test plan to be created

---

### R-012: Timeline Overrun
**Category:** Project Management
**Probability:** Medium (50%)
**Impact:** Medium
**Severity:** Medium

**Description:**
Development may take longer than the 6-8 week estimate, especially for learning new technologies.

**Potential Consequences:**
- Missed deadlines
- Stakeholder dissatisfaction
- Budget issues (if applicable)
- Team stress

**Mitigation Strategy:**
1. **Buffer Time:**
   - Estimates include learning time
   - 6-8 week range (not fixed)
   - Account for unknowns
   - Realistic estimations

2. **Prioritization:**
   - MVP first
   - Critical features before enhancements
   - Can cut camera/maps if needed
   - Deliver core value early

3. **Iteration Planning:**
   - 21 detailed iterations
   - Clear deliverables
   - Track progress weekly
   - Adjust as needed

4. **Risk Mitigation:**
   - Start with hardest parts first
   - Identify blockers early
   - Flexible timeline
   - Communicate proactively

5. **Учебный проект Note:**
   - Learning is more important than speed
   - Quality over deadlines
   - This is for education
   - No hard business deadline

**Owner:** Project Manager
**Status:** Monitored - Flexible timeline

---

### R-013: Device Fragmentation
**Category:** Compatibility
**Probability:** High (80%)
**Impact:** High
**Severity:** High

**Description:**
Android fragmentation across versions, manufacturers, and devices may cause compatibility issues.

**Potential Consequences:**
- App doesn't work on some devices
- Crashes on specific Android versions
- UI layout issues
- Feature unavailability

**Mitigation Strategy:**
1. **Use AndroidX:**
   - Backward compatibility libraries
   - Support older API levels
   - Consistent behavior

2. **API Level Handling:**
   - Min SDK 24 (Android 7.0)
   - Conditional code for newer APIs
   - Desugar for Java 8+ APIs
   - Test on min and max SDK

3. **Extensive Testing:**
   - Test on Android 7-14
   - Different manufacturers
   - Various screen sizes
   - Different locales

4. **Safe APIs:**
   - Avoid experimental APIs
   - Use stable libraries
   - Check API availability
   - Fallback mechanisms

5. **Layout Flexibility:**
   - ConstraintLayout for flexibility
   - Test different screen sizes
   - Portrait and landscape
   - Handle notches/cutouts

**Owner:** Development Team
**Status:** Mitigated - AndroidX + testing plan

---

### R-014: Yandex Maps Not Installed
**Category:** Integration
**Probability:** High (70%)
**Impact:** Low
**Severity:** Medium

**Description:**
Users may not have Yandex Maps app installed, preventing native map navigation.

**Potential Consequences:**
- "Проложить маршрут" button doesn't work
- Poor user experience
- Users cannot navigate

**Mitigation Strategy:**
1. **Detection:**
   - Check if Yandex Maps installed
   - Use PackageManager
   - Detect before opening

2. **Fallback:**
   - Open Yandex Maps web version
   - Works in browser
   - No installation needed
   - Slightly worse UX but functional

3. **User Messaging:**
   - Clear message if not installed
   - Suggest installing Yandex Maps
   - Explain fallback option
   - Provide choice

4. **Alternative:**
   - Google Maps as second fallback
   - Most devices have it
   - Similar functionality

**Owner:** Development Team
**Status:** Mitigated - Fallback planned (Iteration 15)

---

### R-015: Data Loss During Sync Failures
**Category:** Data
**Probability:** Low (30%)
**Impact:** Critical
**Severity:** High

**Description:**
Profile data or order status updates could be lost if sync fails and local data is overwritten.

**Potential Consequences:**
- Lost user settings
- Missing status updates
- Courier work not recorded
- Data integrity issues

**Mitigation Strategy:**
1. **Local Persistence:**
   - Save all data locally first
   - Persist to DataStore/Room
   - Don't rely only on server
   - Keep local copy

2. **Sync Logic:**
   - Optimistic UI updates
   - Queue failed syncs
   - Retry with backoff
   - Don't overwrite on failure

3. **Conflict Resolution:**
   - Timestamp-based resolution
   - Server wins for profile
   - Local wins for status updates
   - Alert user on conflicts

4. **User Feedback:**
   - Show sync status
   - Warn if not synced
   - Manual retry option
   - Clear success/failure indicators

5. **Testing:**
   - Test offline scenarios
   - Test sync failures
   - Test conflict cases
   - Ensure no data loss

**Owner:** Development Team
**Status:** Mitigated - Design includes persistence

---

## Risk Monitoring Plan

### Weekly Risk Review
- Review all "Monitored" risks
- Update probability/impact if changed
- Add new risks as discovered
- Update mitigation progress

### Iteration Risk Checkpoints
- Before each iteration, review relevant risks
- After iteration, update risk status
- Document issues in problem_journal.md
- Adjust mitigation if needed

### Risk Escalation
If a risk becomes Critical severity:
1. Immediate team notification
2. Emergency mitigation planning
3. Stakeholder communication
4. Update project timeline if needed

## Risk Summary by Category

| Category | Total Risks | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| Backend | 1 | 1 | 0 | 0 | 0 |
| Technical | 2 | 0 | 1 | 1 | 0 |
| Dependencies | 1 | 0 | 0 | 1 | 0 |
| Network | 1 | 0 | 1 | 0 | 0 |
| Camera | 1 | 0 | 1 | 0 | 0 |
| Security | 1 | 0 | 1 | 0 | 0 |
| Storage | 1 | 0 | 0 | 1 | 0 |
| Performance | 1 | 0 | 1 | 0 | 0 |
| Learning | 1 | 0 | 1 | 0 | 0 |
| PM | 2 | 0 | 2 | 0 | 0 |
| Testing | 1 | 0 | 1 | 0 | 0 |
| Compatibility | 1 | 0 | 1 | 0 | 0 |
| Integration | 1 | 0 | 0 | 1 | 0 |
| Data | 1 | 0 | 1 | 0 | 0 |
| **Total** | **15** | **1** | **10** | **4** | **0** |

## Next Steps

1. Review this register at project kickoff
2. Update weekly during development
3. Add new risks as discovered
4. Track mitigation progress in iterations.md
5. Mark risks as Resolved when fully mitigated
