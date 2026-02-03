import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';
let adminToken;
let createdProductId;

beforeAll(async () => {
    // Login to get token
    const res = await axios.post(`${BASE_URL}/auth/admin/login`, {
        email: 'admin@ssvpl.com',
        password: 'adminpassword123'
    });
    adminToken = res.data.data.token;
});

describe('Product Management', () => {
    test('Create Product with GST', async () => {
        const productData = {
            productName: `Jest Product ${Date.now()}`,
            price: 2000,
            mrp: 2360,
            gstRate: 18,
            stockQuantity: 100,
            category: 'aquaculture'
        };

        const res = await axios.post(`${BASE_URL}/admin/product/create`, productData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        expect(res.status).toBe(201);
        expect(res.data.data.gstAmount).toBe(360); // 18% of 2000
        expect(res.data.data.cgstRate).toBe(9);
        createdProductId = res.data.data._id;
    });

    test('Add Stock to Product', async () => {
        const res = await axios.patch(`${BASE_URL}/admin/product/stock/add/${createdProductId}`, {
            quantityToAdd: 50,
            reason: 'Jest Restock'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        expect(res.status).toBe(200);
        expect(res.data.data.stockQuantity).toBe(150); // 100 + 50
    });

    test('List Products (User View)', async () => {
        // User view checks (No Token needed if public or User Token)
        // Assuming public browsing for this test scope or simple check
        const res = await axios.get(`${BASE_URL}/user/products?limit=5`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.data.products)).toBe(true);
    });
});
