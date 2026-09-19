import http from 'k6/http';
import { check, sleep } from 'k6';
import { buildAuthHeaders, getEnvNumber, getOptionalEnv, getRequiredEnv, } from './lib/env.js';
const thinkTime = getEnvNumber('THINK_TIME', 1);
let cachedToken;
function getRuntimeAuthHeaders(baseUrl) {
    const tokenFromEnv = getOptionalEnv('TOKEN');
    if (tokenFromEnv) {
        return buildAuthHeaders(tokenFromEnv);
    }
    if (cachedToken) {
        return buildAuthHeaders(cachedToken);
    }
    const email = getRequiredEnv('AUTH_EMAIL');
    const password = getRequiredEnv('AUTH_PASSWORD');
    const loginResponse = http.post(`${baseUrl}/auth/login`, JSON.stringify({ email, password }), {
        headers: { 'Content-Type': 'application/json' },
    });
    if (loginResponse.status < 200 || loginResponse.status >= 300) {
        throw new Error(`Auth login failed with status ${loginResponse.status}. Set TOKEN or valid AUTH_EMAIL/AUTH_PASSWORD.`);
    }
    const body = loginResponse.json();
    const token = body?.data?.accessToken;
    if (!token) {
        throw new Error('Auth login succeeded but no accessToken was found in response.data.accessToken.');
    }
    cachedToken = token;
    return buildAuthHeaders(token);
}
export const options = {
    scenarios: {
        properties: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '2m', target: 30 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
    },
};
export default function loadProperties() {
    const baseUrl = getRequiredEnv('BASE_URL');
    const page = getEnvNumber('PAGE', 1);
    const limit = getEnvNumber('LIMIT', 20);
    const response = http.get(`${baseUrl}/properties?page=${page}&limit=${limit}`, {
        headers: getRuntimeAuthHeaders(baseUrl),
    });
    check(response, {
        'properties returns 200': () => response.status === 200,
    });
    sleep(thinkTime);
}
