import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Stress test - test realistic capacity for 40 concurrent users
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Warm up
    { duration: '3m', target: 20 },   // Ramp to typical load
    { duration: '5m', target: 30 },   // Sustain near-peak
    { duration: '5m', target: 40 },   // Peak capacity (max expected)
    { duration: '3m', target: 50 },   // Stress beyond capacity
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Relaxed for DTU 20
    errors: ['rate<0.1'],                // Stricter error tolerance
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

const TEST_USERS = [
  { email: 'student3@codestack.com', password: 'password' },
  { email: 'student4@codestack.com', password: 'password' },
  { email: 'student5@codestack.com', password: 'password' },
];

function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

export default function () {
  const user = getRandomUser();

  // Login
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(`${API_URL}/auth/login`, loginPayload, loginParams);
  
  const loginSuccess = check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  if (!loginSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  let token;
  try {
    token = JSON.parse(loginRes.body).accessToken;
  } catch {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const authParams = {
    headers: { 'Authorization': `Bearer ${token}` },
  };

  // Dashboard
  const dashRes = http.get(`${API_URL}/home/dashboard`, authParams);
  check(dashRes, {
    'dashboard loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Profile
  const profileRes = http.get(`${API_URL}/profile/me`, authParams);
  check(profileRes, {
    'profile loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
