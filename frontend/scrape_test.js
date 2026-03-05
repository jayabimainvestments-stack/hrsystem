import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://jayabima.ceyloncloud.online';
const LOGIN_URL = `${BASE_URL}/loginServlet`;

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

        // Extract cookie
        const setCookie = loginRes.headers['set-cookie'];
        let cookie = '';
        if (setCookie) {
            cookie = setCookie.map(c => c.split(';')[0]).join('; ');
        }

        if (String(loginRes.data).trim() === '1') {
            console.log('Login successful.');

            console.log('Fetching collectors.jsp...');
            const res = await axios.get(`${BASE_URL}/collectors.jsp`, {
                headers: { Cookie: cookie }
            });

            const html = res.data;
            // Regex to capture rows in the table body (assuming only one main table or checking id)
            // The table id is "cutbl"

            const tableMatch = html.match(/<table id="cutbl">[\s\S]*?<\/table>/);
            if (!tableMatch) {
                console.log('Table not found');
                return;
            }

            const tableContent = tableMatch[0];
            const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;

            let match;
            const employees = [];

            // Skip header row if possible, or filter later
            let rowCount = 0;
            while ((match = rowRegex.exec(tableContent)) !== null) {
                const rowContent = match[1];

                // Extract cells
                const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
                const cells = [];
                let cellMatch;
                while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                    // Clean up cell content (remove tags)
                    let text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                    // text might have &nbsp;
                    text = text.replace(/&nbsp;/g, ' ');
                    cells.push(text);
                }

                // Columns based on snippet: #, Name, NIC, Status, Actions
                // Example row: 1, D M K M Dissanayake, 801285392V, Active, ...

                if (cells.length >= 3 && cells[0] !== '#') {
                    const emp = {
                        name: cells[1],
                        nic: cells[2],
                        status: cells[3]
                    };
                    if (emp.name && emp.name !== 'Name') { // Filter header if regex caught it
                        employees.push(emp);
                    }
                }
                rowCount++;
            }

            console.log(`Scraped ${employees.length} employees.`);
            fs.writeFileSync('employees.json', JSON.stringify(employees, null, 2));
            console.log('Saved to employees.json');

        } else {
            console.log('Login failed.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

scrape();
