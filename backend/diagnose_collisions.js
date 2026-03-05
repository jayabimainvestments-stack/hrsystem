const fs = require('fs');
const path = require('path');

const srcDir = 'N:/ANTIGRAVITY/HR PACKEGE/HR PACEGE/frontend/src';

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getAllFiles(name, fileList);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            fileList.push(name);
        }
    });
    return fileList;
}

const files = getAllFiles(srcDir);
const componentNames = new Set();

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Simple regex to find component-like names
    const matches = content.matchAll(/(?:const|function|class)\s+([A-Z][A-Za-z0-9]*)\b/g);
    for (const match of matches) {
        componentNames.add(match[1]);
    }
});

console.log("Found components:", Array.from(componentNames).join(', '));

// Common globals that are constructors
const globals = [
    'Image', 'Option', 'Range', 'Selection', 'Comment', 'Attr', 'Text', 'Document', 'Element',
    'Storage', 'Location', 'Navigator', 'Screen', 'Window', 'Node', 'Audio', 'Video', 'File',
    'Blob', 'FormData', 'Event', 'Notification', 'MessageChannel', 'Worker', 'WebSocket',
    'FileReader', 'Request', 'Response', 'Headers', 'History'
];

const collisions = Array.from(componentNames).filter(name => globals.includes(name));

if (collisions.length > 0) {
    console.log("!!! COLLISION DETECTED !!!");
    console.log(collisions);
} else {
    console.log("No common collisions found.");
}
