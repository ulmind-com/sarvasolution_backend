import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

describe('Auth Routes', () => {
    let adminToken;

    test('Admin Login - Success', async () => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/admin/login`, {
                email: 'admin@ssvpl.com',
                password: 'adminpassword123'
            });
            expect(res.status).toBe(200);
            expect(res.data.data.token).toBeDefined();
            adminToken = res.data.data.token;
        } catch (error) {
            console.error('Login Failed:', error.response?.data || error.message);
            throw error;
        }
    });

    test('Admin Login - Invalid Password', async () => {
        try {
            await axios.post(`${BASE_URL}/auth/admin/login`, {
                email: 'admin@ssvpl.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            expect(error.response.status).toBe(400); // Or 401 depending on impl
        }
    });

    test('Get Admin Profile - Protected Route', async () => {
        const res = await axios.get(`${BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        expect(res.status).toBe(200);
        expect(res.data.data.user.email).toBe('admin@ssvpl.com');
    });
});
