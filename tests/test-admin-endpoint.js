const fetch = require('node-fetch');

async function testAdminEndpoint() {
    try {
        // First get the JWT token by logging in
        console.log('Attempting to log in...');
        const loginResponse = await fetch('https://notsus.net/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'adamhayhart@gmail.com',
                password: process.argv[2] // Pass password as command line argument
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
        }

        const { token } = await loginResponse.json();
        console.log('Login successful, received token');

        // Now try to fetch submissions using the token
        console.log('\nAttempting to fetch submissions...');
        const submissionsResponse = await fetch('https://notsus.net/admin/submissions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!submissionsResponse.ok) {
            throw new Error(`Submissions fetch failed: ${submissionsResponse.status} ${submissionsResponse.statusText}`);
        }

        const submissions = await submissionsResponse.json();
        console.log('\nSuccessfully retrieved submissions:');
        console.table(submissions);

    } catch (error) {
        console.error('Error testing admin endpoint:', error);
    }
}

if (!process.argv[2]) {
    console.log('Usage: node test-admin-endpoint.js <password>');
    process.exit(1);
}

testAdminEndpoint();