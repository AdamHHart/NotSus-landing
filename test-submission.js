// test-submission.js
require('dotenv').config();
const axios = require('axios');

async function testSubmission() {
    try {
        // 1. Register a test user
        console.log('1. Registering test user...');
        const registerResponse = await axios.post('http://localhost:3000/auth/register', {
            email: `test${Date.now()}@example.com`,
            password: 'testpass123'
        });
        
        const authData = registerResponse.data;
        if (!authData.success) {
            throw new Error('Registration failed: ' + JSON.stringify(authData));
        }
        console.log('✅ User registered successfully');

        // 2. Submit test feedback
        console.log('\n2. Submitting test feedback...');
        const feedbackResponse = await axios.post(
            'http://localhost:3000/api/feedback',
            {
                email: authData.user.email,
                concerns: ['screen-time', 'safety', 'other'],
                otherDescription: 'Test submission ' + new Date().toISOString()
            },
            {
                headers: {
                    'Authorization': `Bearer ${authData.token}`
                }
            }
        );

        const feedbackData = feedbackResponse.data;
        if (!feedbackData.success) {
            throw new Error('Feedback submission failed: ' + JSON.stringify(feedbackData));
        }
        console.log('✅ Feedback submitted successfully');
        console.log('Feedback ID:', feedbackData.id);

    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
    }
}

testSubmission();