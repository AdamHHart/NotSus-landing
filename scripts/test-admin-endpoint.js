// File: scripts/test-admin-endpoint.js

require('dotenv').config();
const fetch = require('node-fetch');

async function testAdminEndpoint() {
    try {
        // First get the JWT token
        console.log('Attempting to login...');
        const loginResponse = await fetch('https://www.notsus.net/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'adamhayhart@gmail.com',
                password: 'adampass23062017'
            })
        });

        const loginData = await loginResponse.json();
        if (!loginData.token) {
            throw new Error('Login failed: ' + JSON.stringify(loginData));
        }

        console.log('Login successful, got token');

        // Now try to fetch the feedback data
        console.log('\nFetching feedback data...');
        const feedbackResponse = await fetch('https://www.notsus.net/api/admin/feedback', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        const feedbackData = await feedbackResponse.json();
        console.log('\nFeedback API Response:');
        console.log(JSON.stringify(feedbackData, null, 2));

    } catch (error) {
        console.error('Error testing admin endpoint:', error);
    }
}

testAdminEndpoint();