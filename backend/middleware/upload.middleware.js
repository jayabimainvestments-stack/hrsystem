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
    const allowedExtensions = /pdf|jpg|jpeg|png|webp|gif|doc|docx/;
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = allowedExtensions.test(ext);
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

    console.log(`Multer Filter: File=${file.originalname}, Ext=${ext}, MIME=${file.mimetype}, ExtMatch=${isAllowedExt}, MIMEMatch=${isAllowedMime}`);

    if (isAllowedExt && isAllowedMime) {
        return cb(null, true);
    } else {
        cb(new Error(`Format not supported. Ext: ${ext}, MIME: ${file.mimetype}. Please use JPG, PNG, WEBP, PDF, or Word DOC/DOCX.`));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

module.exports = upload;
