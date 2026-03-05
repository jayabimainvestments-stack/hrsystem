# HR System Setup Instructions / පද්ධතිය සැකසීමේ උපදෙස්

This drive contains everything you need to run the HR System on another computer.
වෙනත් පරිගණකයක HR පද්ධතිය ක්‍රියාත්මක කිරීමට අවශ්‍ය සියලුම දේ මෙම තැටියේ (drive) ඇත.

## 1. Requirements / අවශ්‍යතා

- **Node.js**: Install from [nodejs.org](https://nodejs.org/)
- **PostgreSQL 15+**: Install and ensure the password is set to `123456`.
- **Node.js**: [nodejs.org](https://nodejs.org/) වෙතින් ස්ථාපනය කරන්න.
- **PostgreSQL 15+**: ස්ථාපනය කර මුරපදය (password) `123456` ලෙස සකසන්න.

## 2. Restore Database / දත්ත සමුදාය නැවත ලබා ගැනීම (Restore)

1. Open a terminal/command prompt in the project folder.
2. Run the following command to restore the database:
1. ව්‍යාපෘති ෆෝල්ඩරයේ terminal/command prompt එකක් විවෘත කරන්න.
2. දත්ත සමුදාය නැවත ලබා ගැනීමට පහත විධානය (command) ක්‍රියාත්මක කරන්න:

```bash
pgsql\bin\psql.exe -U postgres -c "CREATE DATABASE hr_db;"
pgsql\bin\psql.exe -U postgres -d hr_db -f DATABASE_BACKUP\hr_db_full_backup.sql
```

## 3. Run the System / පද්ධතිය ක්‍රියාත්මක කිරීම

1. Start the Backend:
   ```bash
   cd backend
   npm start
   ```
2. Start the Frontend (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

1. Backend එක ආරම්භ කරන්න:
   ```bash
   cd backend
   npm start
   ```
2. Frontend එක ආරම්භ කරන්න (නව terminal එකක):
   ```bash
   cd frontend
   npm run dev
   ```

---
**Note**: Ensure you unplug the drive safely.
**සටහන**: drive එක ආරක්ෂිතව ඉවත් කිරීමට වගබලා ගන්න.
