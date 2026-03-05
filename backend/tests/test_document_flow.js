const db = require('../config/db');

async function testDocumentFlow() {
    console.log('--- TEST: Document Flow ---');

    try {
        // 1. Setup Data
        const empRes = await db.query("SELECT id, user_id FROM employees LIMIT 1");
        if (empRes.rows.length === 0) { console.error('No employee found'); return; }
        const userId = empRes.rows[0].user_id;

        const dummyFile = {
            user_id: userId,
            title: 'Test Document',
            file_path: '/uploads/test.pdf',
            file_type: 'application/pdf',
            category: 'Contract',
            uploaded_by: userId,
            file_size: 1024
        };

        // Clean previous
        await db.query("DELETE FROM documents WHERE user_id = $1 AND title = $2", [userId, dummyFile.title]);

        // 2. Insert Dummy Document (Simulating Upload)
        const insertRes = await db.query(
            `INSERT INTO documents (user_id, title, file_path, file_type, category, uploaded_by, file_size)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [dummyFile.user_id, dummyFile.title, dummyFile.file_path, dummyFile.file_type, dummyFile.category, dummyFile.uploaded_by, dummyFile.file_size]
        );
        const docId = insertRes.rows[0].id;
        console.log(`✅ Document Inserted via SQL (Simulated Upload). ID: ${docId}`);

        // 3. Fetch Documents (Controller Logic)
        const { getDocuments } = require('../controllers/document.controller');

        const reqGet = {
            user: { id: userId, role: 'Employee' },
            query: {}
        };

        const resGet = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 200) throw new Error(`Get failed with ${code}: ${data.message}`);
                    return data;
                }
            })
        };

        // Hack to get the response data out of the mock
        let responseData;
        resGet.status = (code) => ({
            json: (data) => {
                responseData = data;
                return data;
            }
        });

        await getDocuments(reqGet, resGet);

        if (responseData && Array.isArray(responseData)) {
            const found = responseData.find(d => d.id === docId);
            if (found) {
                console.log('✅ Document Found via Controller');
                if (found.title === dummyFile.title) {
                    console.log('✅ Metadata Verified');
                } else {
                    throw new Error('Metadata Mismatch');
                }
            } else {
                throw new Error('Inserted document not returned by controller');
            }
        } else {
            throw new Error('Controller did not return an array');
        }

        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testDocumentFlow();
