const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://jayabima.ceyloncloud.online';
const LOGIN_URL = `${BASE_URL}/loginServlet`;
//const DASHBOARD_URL = `${BASE_URL}/index.jsp`; // Original guess
const DASHBOARD_URL = `${BASE_URL}/employee_reg.jsp`; // Guessing employee page or similar, or I can parse index.jsp

async function scrape() {
    try {
        console.log('Logging in...');
        const params = new URLSearchParams();
        params.append('un', 'krishantha');
        params.append('pw', 'xmn15n23');

        const loginRes = await axios.post(LOGIN_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            maxRedirects: 0,
            validateStatus: status => status >= 200 && status < 400
        });

        const cookie = loginRes.headers['set-cookie'];
        console.log('Login Response:', loginRes.data);
        console.log('Cookies:', cookie);

        if (String(loginRes.data).trim() === '1') {
            console.log('Login successful. Fetching dashboard...');
            const dashboardRes = await axios.get(`${BASE_URL}/index.jsp`, {
                headers: { Cookie: cookie }
            });
            //console.log('Dashboard content:', dashboardRes.data.substring(0, 500));

            // Look for employee links
            // Regular expression to find links
            const linkRegex = /href="([^"]+)"/g;
            let match;
            const links = new Set();
            while ((match = linkRegex.exec(dashboardRes.data)) !== null) {
                links.add(match[1]);
            }
            console.log('Found links:', Array.from(links));

            // Try to find employee related link
            // Common names: employee.jsp, employees.jsp, user.jsp, registration.jsp
        } else {
            console.log('Login failed with response:', loginRes.data);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

scrape();
