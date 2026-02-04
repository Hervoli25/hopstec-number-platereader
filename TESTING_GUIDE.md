# HOPSVOIR Testing Guide

## Quick Start

```bash
# Start development server
npm run dev

# Access the app
http://localhost:5000
```

## Test Accounts

Configure in `.env` file:

| Role | Email | Password |
|------|-------|----------|
| Admin | `ADMIN_EMAIL` | `ADMIN_PASSWORD` |
| Manager | `MANAGER_EMAIL` | `MANAGER_PASSWORD` |
| Technician | `TECH_EMAIL` | `TECH_PASSWORD` |

Reset users: `npm run db:reset-users`

---

## Manual Test Cases

### 1. Authentication

#### 1.1 Login Flow
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Verify redirect to dashboard
- [ ] Verify user info displays in header

#### 1.2 Logout Flow
- [ ] Click user menu (top right)
- [ ] Click "Logout"
- [ ] Verify redirect to login page
- [ ] Verify session is cleared (refresh doesn't auto-login)

#### 1.3 Role-Based Access
- [ ] **Technician**: Can access `/`, `/scan/carwash`, `/my-jobs`, `/wash-job/:id`
- [ ] **Manager**: Can access above + `/manager`, `/manager/analytics`, `/manager/audit`
- [ ] **Admin**: Can access all + `/admin/users`

---

### 2. Carwash Workflow

#### 2.1 Create New Wash Job
- [ ] Navigate to `/scan/carwash`
- [ ] Enter license plate (e.g., "AB-123-CD")
- [ ] Select service type
- [ ] Click "Start Wash"
- [ ] Verify job created with status "received"
- [ ] Verify customer URL dialog appears

#### 2.2 Progress Through Stages
- [ ] Open job detail (`/wash-job/:id`)
- [ ] Click "Pre-wash" → Status updates to "prewash"
- [ ] Click "Foam" → Status updates to "foam"
- [ ] Click "Rinse" → Status updates to "rinse"
- [ ] Click "Dry" → Status updates to "dry"
- [ ] Click "Complete" → Status updates to "complete"

#### 2.3 Photo Checkpoints
- [ ] At each stage, verify photo capture option
- [ ] Upload/capture photo
- [ ] Verify photo appears in job history

#### 2.4 My Jobs Dashboard
- [ ] Navigate to `/my-jobs`
- [ ] Verify "In Progress" section shows active jobs
- [ ] Verify "Recently Completed" shows finished jobs
- [ ] Verify "Upcoming Bookings" shows CRM bookings

---

### 3. Customer Tracking

#### 3.1 Customer URL
- [ ] After creating job, note the customer URL
- [ ] Open URL in incognito/private browser
- [ ] Verify job status displays correctly
- [ ] Verify real-time updates work (SSE)

#### 3.2 Share Functionality
- [ ] Open job detail
- [ ] Click share/copy URL button
- [ ] Verify URL copies to clipboard

---

### 4. Manager Features

#### 4.1 Dashboard
- [ ] Navigate to `/manager`
- [ ] Verify today's stats display
- [ ] Verify recent activity list
- [ ] Verify technician performance summary

#### 4.2 Analytics
- [ ] Navigate to `/manager/analytics`
- [ ] Verify charts render correctly
- [ ] Test date range filters
- [ ] Test CSV export (Jobs, Events)
- [ ] Verify downloaded CSV contains correct data

#### 4.3 Audit Log
- [ ] Navigate to `/manager/audit`
- [ ] Verify event history displays
- [ ] Test filtering by technician
- [ ] Test filtering by date range

---

### 5. Admin Features

#### 5.1 User Management
- [ ] Navigate to `/admin/users`
- [ ] Verify user list displays
- [ ] Create new user
- [ ] Edit user role
- [ ] Delete user (non-self)

---

### 6. CRM Integration

#### 6.1 API Endpoint
```bash
curl -X POST http://localhost:5000/api/integrations/create-job \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: YOUR_SECRET" \
  -d '{
    "plateDisplay": "TEST-123",
    "customerName": "Test Customer",
    "serviceCode": "PREMIUM"
  }'
```

- [ ] Verify 200 response with job data
- [ ] Verify job appears in "Upcoming Bookings"
- [ ] Verify customerUrl is returned

#### 6.2 Error Cases
- [ ] Missing secret → 401 Unauthorized
- [ ] Missing plate → 400 Bad Request

---

### 7. PWA Features

#### 7.1 Install Prompt
- [ ] Open app on mobile device/Chrome
- [ ] Verify install prompt appears after 2 seconds
- [ ] Click "Install" → App installs
- [ ] Click "Not now" → Prompt dismissed for 7 days

#### 7.2 Offline Support
- [ ] Install PWA
- [ ] Disable network
- [ ] Verify cached pages load
- [ ] Verify graceful error for API calls

#### 7.3 App Shortcuts
- [ ] Long-press app icon (Android)
- [ ] Verify "Scan Plate" and "My Jobs" shortcuts

---

### 8. Real-Time Updates (SSE)

#### 8.1 Job Status Updates
- [ ] Open job detail in two browser windows
- [ ] Change status in window 1
- [ ] Verify window 2 updates automatically

#### 8.2 Dashboard Updates
- [ ] Open manager dashboard
- [ ] Create new job in another tab
- [ ] Verify dashboard stats update

---

### 9. Edge Cases

#### 9.1 Session Handling
- [ ] Login, wait 24+ hours, verify session expired
- [ ] Multiple tabs with same session work correctly

#### 9.2 Concurrent Updates
- [ ] Two technicians updating same job
- [ ] Verify no data corruption

#### 9.3 Input Validation
- [ ] Empty license plate → Error shown
- [ ] Very long license plate → Handled gracefully
- [ ] Special characters in plate → Handled correctly

---

## API Testing with cURL

### Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "tech@example.com", "password": "password123"}'

# Get current user
curl http://localhost:5000/api/auth/user \
  -b cookies.txt

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

### Wash Jobs
```bash
# Create job
curl -X POST http://localhost:5000/api/wash-jobs \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"plateDisplay": "AB-123-CD"}'

# Get all jobs
curl http://localhost:5000/api/wash-jobs \
  -b cookies.txt

# Get my jobs
curl "http://localhost:5000/api/wash-jobs?my=true" \
  -b cookies.txt

# Update job status
curl -X PATCH http://localhost:5000/api/wash-jobs/JOB_ID/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "prewash"}'
```

---

## Database Commands

```bash
# Push schema changes
npm run db:push

# Clear dummy data
npm run db:clear

# Seed fresh users
npm run db:seed-users

# Reset all users
npm run db:reset-users
```

---

## Common Issues

### Session Not Persisting
- Check `secure` cookie setting in development (should be `false`)
- Verify `SESSION_SECRET` is set in `.env`

### 401 Unauthorized
- Clear browser cookies
- Run `npm run db:reset-users`
- Re-login

### Jobs Not Appearing
- Check browser console for API errors
- Verify database connection (`DATABASE_URL`)
- Check user role permissions

---

## Performance Checklist

- [ ] Page load < 3 seconds
- [ ] SSE connection stable for 30+ minutes
- [ ] Mobile touch targets > 44px
- [ ] Lighthouse PWA score > 90

---

**Made by HOPS-TECH INNOVATION**
