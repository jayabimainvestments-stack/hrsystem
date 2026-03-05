const db = require('../config/db');

// @desc    Get organization details
// @route   GET /api/organization
// @access  Private
const getOrganizationDetails = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM organization_details LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Organization details not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update organization details
// @route   PUT /api/organization
// @access  Private (Admin/HR)
const updateOrganizationDetails = async (req, res) => {
    const { name, tax_id, reg_no, epf_no, etf_no, address, phone, email, website, logo_url } = req.body;
    try {
        // Since we only have one record, we update the first one
        const result = await db.query(
            `UPDATE organization_details 
             SET name = COALESCE($1, name), 
                 tax_id = COALESCE($2, tax_id), 
                 reg_no = COALESCE($3, reg_no), 
                 epf_no = COALESCE($4, epf_no), 
                 etf_no = COALESCE($5, etf_no), 
                 address = COALESCE($6, address), 
                 phone = COALESCE($7, phone), 
                 email = COALESCE($8, email), 
                 website = COALESCE($9, website), 
                 logo_url = COALESCE($10, logo_url),
                 updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [name, tax_id, reg_no, epf_no, etf_no, address, phone, email, website, logo_url]
        );

        if (result.rows.length === 0) {
            // If somehow the table is empty, insert the first record
            const insertResult = await db.query(
                `INSERT INTO organization_details (name, tax_id, reg_no, epf_no, etf_no, address, phone, email, website, logo_url) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [name, tax_id, reg_no, epf_no, etf_no, address, phone, email, website, logo_url]
            );
            return res.status(201).json(insertResult.rows[0]);
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOrganizationDetails,
    updateOrganizationDetails
};
