import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    'http_req_duration{endpoint:login}': ['p(95)<800'],
    'http_req_duration{endpoint:courses}': ['p(95)<500'],
    'http_req_duration{endpoint:grades}': ['p(95)<600'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Test user credentials - UPDATE THESE WITH YOUR TEST USERS
const TEST_USERS = [
  { email: 'student3@codestack.com', password: 'password' },
  { email: 'student4@codestack.com', password: 'password' },
  { email: 'student5@Codestack.com', password: 'password' },
];

function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function login(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'login' },
  };

  const res = http.post(`${API_URL}/auth/login`, payload, params);
  
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  try {
    const body = JSON.parse(res.body);
    return body.accessToken;
  } catch {
    errorRate.add(1);
    return null;
  }
}

function getDashboard(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { endpoint: 'dashboard' },
  };

  const res = http.get(`${API_URL}/home/dashboard`, params);
  
  check(res, {
    'dashboard status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res;
}

function getCourseDetail(token, courseId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { endpoint: 'courses' },
  };

  const res = http.get(`${API_URL}/courses/${courseId}`, params);
  
  check(res, {
    'course detail status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res;
}

function getGrades(token, courseId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { endpoint: 'grades' },
  };

  const res = http.get(`${API_URL}/grades/my?courseId=${courseId}`, params);
  
  check(res, {
    'grades status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res;
}

function getProfile(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { endpoint: 'profile' },
  };

  const res = http.get(`${API_URL}/profile/me`, params);
  
  check(res, {
    'profile status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res;
}

export default function () {
  const user = getRandomUser();
  let token;

  // Login flow
  group('Authentication', () => {
    token = login(user.email, user.password);
    sleep(1);
  });

  if (!token) {
    console.log('Login failed, skipping remaining tests');
    return;
  }

  // Dashboard flow
  let dashboardData;
  group('Dashboard', () => {
    const dashRes = getDashboard(token);
    try {
      dashboardData = JSON.parse(dashRes.body);
    } catch (e) {
      // Dashboard parsing failed
    }
    sleep(1);
  });

  // Profile flow
  group('Profile', () => {
    getProfile(token);
    sleep(1);
  });

  // Course browsing flow
  group('Courses', () => {
    // Get first course from dashboard
    if (dashboardData && dashboardData.courses && dashboardData.courses.length > 0) {
      const courseId = dashboardData.courses[0].id;
      
      getCourseDetail(token, courseId);
      sleep(1);

      // Get grades for this course
      getGrades(token, courseId);
      sleep(1);
    }
  });

  sleep(2);
}
