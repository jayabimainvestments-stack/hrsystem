const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Safe filename: timestamp-original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

const fileFilter = (req, file, cb) => {
    // Extended types for profile pictures and documents
    const allowedTypes = /pdf|jpg|jpeg|png|webp|gif|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    const extname = allowedTypes.test(ext);
    const mimetype = allowedTypes.test(file.mimetype);

    console.log(`Multer Filter: File=${file.originalname}, Ext=${ext}, MIME=${file.mimetype}, ExtMatch=${extname}, MIMEMatch=${mimetype}`);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error(`Format not supported (${file.mimetype}). Please use JPG, PNG, WEBP, or PDF.`));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

module.exports = upload;
