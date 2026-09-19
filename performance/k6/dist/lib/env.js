import { fail } from 'k6';
export function getRequiredEnv(name) {
    const value = __ENV[name];
    if (!value || String(value).trim() === '') {
        fail(`Missing required env var: ${name}`);
    }
    return value;
}
export function getEnvNumber(name, defaultValue) {
    const raw = __ENV[name];
    if (!raw || String(raw).trim() === '') {
        return defaultValue;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
        fail(`Env var ${name} must be a valid number`);
    }
    return parsed;
}
export function getOptionalEnv(name) {
    const value = __ENV[name];
    if (!value || String(value).trim() === '') {
        return undefined;
    }
    return String(value).trim();
}
export function buildAuthHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}
