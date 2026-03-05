# HR Management System

A full-stack HR Management System built with React, Node.js, Express, and PostgreSQL.

## Prerequisites
- **Node.js**: [Download here](https://nodejs.org/) (Required)
- **PostgreSQL**: Ensure it is running.

## Database Setup
1. Create a database named `hr_db`.
2. Update `backend/.env` with your database credentials.
3. The tables will be created automatically, or you can run the SQL in `backend/database/schema.sql`.

## Installation & Running

1. **Backend**
   Open a terminal in the `backend` folder:
   ```bash
   npm install
   # Run the seed script to create Admin user
   node seed.js
   # Start the server
   npm start
   ```

2. **Frontend**
   Open a terminal in the `frontend` folder:
   ```bash
   npm install
   npm run dev
   ```

## Default Login
- **Admin**: `admin@example.com` / `123456`
- **Employee**: `employee@example.com` / `123456`

## Features
- **Dashboard**: Overview of employees and leaves.
- **Employee Management**: Add/Edit employees (Admin/HR only).
- **Leave Management**: Apply for leaves, Approve/Reject (Admin/HR).
- **Payroll**: View salary slips.
- **Documents**: Upload/View HR documents.
