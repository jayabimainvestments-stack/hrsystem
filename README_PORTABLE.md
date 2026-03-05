# HR System Portable Drive Instructions

This drive contains the entire HR Management System, including the source code, database backups, and uploads. Follow these steps to set up and run the system on a new computer.

## 1. Prerequisites (on the New Computer)
Before starting, ensure the following are installed:
- **PostgreSQL 18** (with username `postgres` and password `123456`)
- **Node.js** (v18 or higher)

## 2. Moving to a New Computer
1. Connect this portable drive to the new computer.
2. Open the drive folder.
3. **Double-click `RESTORE_SYSTEM.bat`**. This will:
   - Create the `hr_db` database if it doesn't exist.
   - Restore all table structures and data from the latest backup.
   
## 3. Running the System
Once the restore is complete, you can run the system as usual:
1. Double-click **`launch_system.bat`** (located in the root folder).
2. The backend and frontend servers will start automatically.

## 4. Backing Up Before Moving Again
If you make changes on the new computer and want to move back to this PC (or another one):
1. Double-click **`BACKUP_SYSTEM.bat`** (located in the root folder).
2. This will update the `DATABASE_BACKUP\hr_db_full_backup.sql` file with your latest data.
3. You can then safely unplug the drive.

---
**Note:** Ensure that the PostgreSQL installation path on the new computer is `C:\Program Files\PostgreSQL\18\bin\`. If it's different, you may need to edit the `.bat` files to point to the correct location.
