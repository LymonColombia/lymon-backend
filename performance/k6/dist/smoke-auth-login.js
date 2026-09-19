import http from 'k6/http';
import { check } from 'k6';
import { getRequiredEnv } from './lib/env.js';
export const options = {
  scenarios: {
    smoke_login: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};
export default function smokeAuthLogin() {
  const baseUrl = getRequiredEnv('BASE_URL');
  const email = getRequiredEnv('AUTH_EMAIL');
  const password = getRequiredEnv('AUTH_PASSWORD');
  const payload = JSON.stringify({ email, password });
  const response = http.post(`${baseUrl}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(response, {
    'login returns 2xx': (r) => r.status >= 200 && r.status < 300,
    'login returns access token': (r) => {
      try {
        const body = r.json();
        return Boolean(body?.data?.accessToken);
      } catch {
        return false;
      }
    },
  });
}
