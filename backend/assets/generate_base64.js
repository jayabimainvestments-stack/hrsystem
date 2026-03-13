const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'logo.png');
const outputPath = path.join(__dirname, 'logo_base64.js');

try {
    const data = fs.readFileSync(logoPath);
    const base64 = data.toString('base64');
    const content = `const logoBase64 = "data:image/png;base64,${base64}";\nmodule.exports = logoBase64;`;
    fs.writeFileSync(outputPath, content);
    console.log('Successfully generated logo_base64.js');
} catch (err) {
    console.error('Error generating base64 logo:', err.message);
    process.exit(1);
}
