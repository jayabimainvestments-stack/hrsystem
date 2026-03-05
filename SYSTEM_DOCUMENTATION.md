# Enterprise HRMS: System Documentation & SOPs

## 1. System Overview
This HRMS is designed for a financial institution, prioritizing high security, immutable audit trails, and strict compliance with financial regulations.

## 2. Data Ownership & Governance
- **Master Employee Data**: Owned by the HR Department.
- **Dual-Control Approval**: Sensitive modifications (Basic Salary, Designation, Bank Details) require Finance approval via the `/api/governance/pending` queue.
- **Payroll & Liabilities**: Managed by Finance. Disbursements require a "Verified Session" re-authentication.

## 3. Security & Access Control
- **Authentication**: JWT-based with mandatory 2FA structure.
- **Secure Activation**: New employees receive a 24-hour activation link. Account access is blocked until the password is changed via this link.
- **Forced Re-authentication**: High-risk actions like payroll finalization require a fresh re-auth token.

## 4. Key Workflows
### A. Automated Hiring & Activation
1. Candidate status -> `Hired`.
2. Secure 32-byte activation token generated (24h expiry).
3. Employee record created with `force_password_change = TRUE`.
4. Employee must set a permanent password via the activation link before login.

### B. Sensitive Data Update (Dual-Control)
1. HR submits update (e.g., Salary change).
2. Change is intercepted and stored in `pending_changes`.
3. Finance reviews and approves/rejects the change.
4. If approved, the system automatically updates the target table and logs the event in `employment_history`.

### B. Leave & Payroll Integration
- Approved **Unpaid Leaves** automatically reduce the monthly Net Salary.
- Deduction Formula: `(Basic Salary / 30) * Unpaid Days`.
- **LOP (Loss of Pay)** is explicitly listed in the payslip breakdown.

### C. Exit & Clearance
- Resignations require three-tier clearance: **IT**, **Finance**, and **HR**.
- The system prevents closing a resignation (`Completed`) if any clearance is pending.
- Final payroll should be verified against the clearance checklist.

### C. Biometric Attendance
1. Physical device scans fingerprint and matches to `Enrollment ID`.
2. Device pushes data to the Biometric Gateway.
3. System maps ID to employee and auto-logs Clock-In/Out.
4. Attendance reports are updated in real-time.

#### 4.D. Employee Self-Service
Allows employees to view their own profiles, salary structures, and leave balances securely through the `/api/employees/me` gateway.

#### 4.E. Performance & Compliance
- **Performance Management**: Systematic appraisal tracking with skills/behavioral ratings and overall score calculation. Accessible via the Employee Profile.
- **Compliance Tracking**: Centralized log for disciplinary actions and professional training/certifications, including expiry tracking for mandatory compliance.

#### 4.F. Enterprise Reporting & Analytics
- **Bulk Attendance**: HR can ingest large-scale monthly data via CSV. The system performs batch upserts with automated conflict resolution.
- **Management Exports**: Global dashboards (Performance, Compliance) allow one-click CSV exports for offline management meetings and deep-dive analysis.
- **Audit Trails**: All bulk actions and exports are logged in the master audit table for governance tracking.

## 5. Maintenance & Disaster Recovery
- **Database Backups**: Recommended nightly automated backups of the PostgreSQL database.
- **Audit Integrity**: The `audit_logs` table should be archived periodically but never modified.
- **Scaling**: The system uses a stateless API design, allowing for horizontal scaling of the backend.

## 6. Audit & Compliance Reporting
- **Finance Export**: Located at `/api/reports/payroll-finance/:month`.
- **Statutory Report**: Provides real-time view of EPF/ETF liabilities and payment status.
- **Activity Summary**: High-level overview of system usage and critical changes.
