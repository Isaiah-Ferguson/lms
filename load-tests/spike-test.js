import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Spike test - sudden traffic surge
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Baseline
    { duration: '10s', target: 100 }, // Spike to 100 users
    { duration: '30s', target: 100 }, // Stay at spike
    { duration: '10s', target: 5 },   // Return to baseline
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Allow higher latency during spike
    errors: ['rate<0.2'],              // Allow higher error rate during spike
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

export default function () {
  // Simulate various endpoints being hit during spike
  const endpoints = [
    `${BASE_URL}/swagger/index.html`,
    `${BASE_URL}/swagger/v1/swagger.json`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(endpoint);

  check(res, {
    'status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);
}
