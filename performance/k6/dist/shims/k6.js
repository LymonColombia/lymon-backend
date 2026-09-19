export function check(value, checks) {
    return Object.entries(checks).every(([, predicate]) => predicate(value));
}
export function fail(message) {
    throw new Error(message);
}
export function sleep(_seconds) {
    return undefined;
}
