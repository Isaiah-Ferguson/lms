# k6 Load Testing for CodeStack LMS

This directory contains k6 load testing scripts for the CodeStack LMS application.

## Prerequisites

- k6 installed (already done via Homebrew)
- Backend API running (default: `http://localhost:5000`)
- Frontend running (default: `http://localhost:3000`)
- Test user accounts created in the database

## Test Scripts

### 1. Basic Load Test (`basic-load-test.js`)
Simple health check test to verify basic functionality.

**Usage:**
```bash
k6 run load-tests/basic-load-test.js
```

**What it tests:**
- API health endpoint
- Basic response times

**Load pattern:**
- Ramps up to 10 users over 30s
- Maintains 10 users for 1m
- Ramps up to 20 users over 30s
- Maintains 20 users for 1m
- Ramps down over 30s

---

### 2. Authenticated Load Test (`authenticated-load-test.js`)
Comprehensive test simulating real user behavior with authentication.

**Usage:**
```bash
# Default (localhost:5000)
k6 run load-tests/authenticated-load-test.js

# Custom API URL
k6 run --env BASE_URL=http://localhost:5000 load-tests/authenticated-load-test.js
```

**What it tests:**
- User login flow
- Dashboard loading
- Profile retrieval
- Course listing
- Course details
- Grades retrieval

**Load pattern:**
- Ramps up to 5 users over 1m
- Ramps up to 10 users over 2m
- Maintains 10 users for 2m
- Ramps down over 1m

**⚠️ IMPORTANT: Update test users before running!**

Edit the `TEST_USERS` array in the script:
```javascript
const TEST_USERS = [
  { email: 'student1@test.com', password: 'Test123!' },
  { email: 'student2@test.com', password: 'Test123!' },
  { email: 'instructor@test.com', password: 'Test123!' },
];
```

---

### 3. Spike Test (`spike-test.js`)
Tests system behavior under sudden traffic surges.

**Usage:**
```bash
k6 run load-tests/spike-test.js
```

**What it tests:**
- System resilience to sudden load increases
- Recovery after spike

**Load pattern:**
- Baseline: 5 users
- **Spike to 100 users in 10s**
- Maintain spike for 30s
- Return to baseline

---

### 4. Stress Test (`stress-test.js`)
Gradually increases load to find system breaking point.

**Usage:**
```bash
k6 run load-tests/stress-test.js
```

**What it tests:**
- Maximum capacity
- System degradation under extreme load
- Authentication under stress
- Database performance

**Load pattern:**
- Warm up: 10 users (2m)
- Ramp to 50 users (5m)
- Ramp to 100 users (5m)
- Ramp to 150 users (5m)
- **Push to 200 users (5m)**
- Ramp down (2m)

---

## Setting Up Test Users

Before running authenticated tests, create test users in your database:

### Option 1: Via API (if registration is enabled)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student1@test.com",
    "password": "Test123!",
    "name": "Test Student 1"
  }'
```

### Option 2: Via SQL
```sql
-- Insert test users (adjust based on your schema)
INSERT INTO Users (Id, Email, Name, PasswordHash, Role)
VALUES 
  (NEWID(), 'student1@test.com', 'Test Student 1', '<hashed_password>', 'Student'),
  (NEWID(), 'student2@test.com', 'Test Student 2', '<hashed_password>', 'Student'),
  (NEWID(), 'instructor@test.com', 'Test Instructor', '<hashed_password>', 'Instructor');
```

---

## Understanding Results

### Key Metrics

**http_req_duration**: Response time
- `p(95)<500`: 95% of requests should complete under 500ms
- `p(99)<2000`: 99% of requests should complete under 2000ms

**errors**: Error rate
- `rate<0.1`: Less than 10% of requests should fail

**http_reqs**: Total HTTP requests made

**vus**: Virtual users (concurrent users)

### Example Output
```
✓ login status is 200
✓ dashboard status is 200
✓ grades status is 200

checks.........................: 95.00% ✓ 285  ✗ 15
data_received..................: 1.2 MB 20 kB/s
data_sent......................: 456 kB 7.6 kB/s
http_req_duration..............: avg=245ms min=12ms med=198ms max=1.2s p(95)=456ms p(99)=892ms
http_reqs......................: 300    5/s
vus............................: 10     min=0 max=10
```

---

## Advanced Usage

### Run with custom thresholds
```bash
k6 run --threshold http_req_duration=p(95)<300 load-tests/authenticated-load-test.js
```

### Output results to file
```bash
k6 run --out json=results.json load-tests/authenticated-load-test.js
```

### Run with more virtual users
```bash
k6 run --vus 50 --duration 2m load-tests/basic-load-test.js
```

### Cloud testing (requires k6 Cloud account)
```bash
k6 cloud load-tests/authenticated-load-test.js
```

---

## Interpreting Results

### ✅ Good Performance
- p(95) < 500ms for most endpoints
- Error rate < 5%
- No timeouts
- Consistent response times

### ⚠️ Warning Signs
- p(95) > 1000ms
- Error rate 5-10%
- Increasing response times over duration
- Memory/CPU spikes on server

### 🔴 Critical Issues
- p(95) > 2000ms
- Error rate > 10%
- Timeouts
- Server crashes
- Database connection errors

---

## Troubleshooting

### "Connection refused" errors
- Ensure backend is running on correct port
- Check BASE_URL environment variable
- Verify firewall settings

### "401 Unauthorized" errors
- Verify test user credentials
- Check if users exist in database
- Ensure authentication endpoint is correct

### High error rates
- Check server logs for errors
- Monitor database connection pool
- Check memory/CPU usage
- Verify database query performance

### Slow response times
- Check database indexes
- Review N+1 query issues
- Monitor database connection pool
- Check for memory leaks

---

## Best Practices

1. **Start small**: Begin with basic-load-test before running stress tests
2. **Monitor server**: Watch CPU, memory, and database metrics during tests
3. **Isolate tests**: Run tests against a staging environment, not production
4. **Clean data**: Reset test data between runs for consistent results
5. **Gradual increase**: Don't jump straight to stress tests
6. **Document baselines**: Record results to track performance over time

---

## Next Steps

1. Create test users in your database
2. Update TEST_USERS in authenticated-load-test.js
3. Start backend API
4. Run basic-load-test.js to verify setup
5. Run authenticated-load-test.js for comprehensive testing
6. Analyze results and optimize bottlenecks
7. Run spike-test.js and stress-test.js to find limits

---

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
