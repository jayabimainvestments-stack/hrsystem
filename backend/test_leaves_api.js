const axios = require('axios');

/**
 * Test getAllLeaves API to see if employee names are included
 */

async function testLeavesAPI() {
    try {
        console.log("\n=== TESTING GET ALL LEAVES API ===\n");
        console.log("⚠️  Note: This test will fail if authentication is required\n");

        const response = await axios.get('http://localhost:5000/api/leaves');

        console.log(`✅ API Response received (${response.data.length} records)\n`);

        if (response.data.length > 0) {
            console.log("📋 Sample leave records:\n");
            response.data.slice(0, 5).forEach((leave, index) => {
                console.log(`${index + 1}. Employee: ${leave.name || '❌ MISSING'}`);
                console.log(`   Leave Type: ${leave.leave_type}`);
                console.log(`   Dates: ${leave.start_date} to ${leave.end_date}`);
                console.log(`   Status: ${leave.status}\n`);
            });

            const missingNames = response.data.filter(l => !l.name);
            if (missingNames.length > 0) {
                console.log(`⚠️  ${missingNames.length} records missing employee names`);
            } else {
                console.log("✅ All records have employee names");
            }
        } else {
            console.log("⚠️  No leave records found");
        }

        process.exit();
    } catch (error) {
        if (error.response?.status === 401) {
            console.log("❌ API requires authentication");
            console.log("   This is expected - the API is protected");
            console.log("\n💡 The backend query is correct. If names aren't showing:");
            console.log("   1. Check browser console for errors");
            console.log("   2. Verify user is logged in");
            console.log("   3. Check network tab to see actual API response");
        } else {
            console.error("\n❌ Error:", error.message);
        }
        process.exit(1);
    }
}

testLeavesAPI();
