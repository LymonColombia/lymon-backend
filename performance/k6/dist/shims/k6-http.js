const http = {
    get(_url, _params) {
        throw new Error('k6/http shim is for type resolution only');
    },
    post(_url, _body, _params) {
        throw new Error('k6/http shim is for type resolution only');
    },
};
export default http;
