import http from 'k6/http';
import { check, sleep } from 'k6';
import { buildAuthHeaders, getEnvNumber, getOptionalEnv, getRequiredEnv, } from './lib/env.js';
const thinkTime = getEnvNumber('THINK_TIME', 1);
let cachedToken;
let cachedCreatedBy;
function getRuntimeAuthContext(baseUrl) {
    const tokenFromEnv = getOptionalEnv('TOKEN');
    const createdByFromEnv = getOptionalEnv('CREATED_BY');
    if (tokenFromEnv) {
        if (!createdByFromEnv) {
            throw new Error('CREATED_BY is required when TOKEN is provided for incident reports by creator.');
        }
        return {
            headers: buildAuthHeaders(tokenFromEnv),
            createdBy: createdByFromEnv,
        };
    }
    if (cachedToken && cachedCreatedBy) {
        return {
            headers: buildAuthHeaders(cachedToken),
            createdBy: cachedCreatedBy,
        };
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
    const createdBy = body?.data?.userId;
    if (!token) {
        throw new Error('Auth login succeeded but no accessToken was found in response.data.accessToken.');
    }
    if (!createdBy) {
        throw new Error('Auth login succeeded but no userId was found in response.data.userId.');
    }
    cachedToken = token;
    cachedCreatedBy = createdBy;
    return {
        headers: buildAuthHeaders(token),
        createdBy,
    };
}
export const options = {
    scenarios: {
        incident_reports: {
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
export default function loadIncidentReports() {
    const baseUrl = getRequiredEnv('BASE_URL');
    const page = getEnvNumber('PAGE', 1);
    const limit = getEnvNumber('LIMIT', 20);
    const auth = getRuntimeAuthContext(baseUrl);
    const response = http.get(`${baseUrl}/incident-reports/by-creator/${encodeURIComponent(auth.createdBy)}?page=${page}&limit=${limit}`, {
        headers: auth.headers,
    });
    check(response, {
        'incident reports returns 200': () => response.status === 200,
    });
    sleep(thinkTime);
}
