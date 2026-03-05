# HRMS පද්ධතිය Portable (Pen Drive / Hard Drive) ලෙස භාවිතා කිරීම

ඔබ සතුව ඇති ගැටළුව වන්නේ **එක පරිගණකයක ඇති දත්ත (Data), අනෙක් පරිගණකයේ ඇති දත්ත සමඟ සම්බන්ධ නොවීමයි.**
මෙයට හේතුව ඔබේ දත්ත (Database) අදාල පරිගණකයේ Hard Disk එකේ සෑදීමයි.

මෙය Pen Drive එක තුලම තබාගෙන යාමට (Portable Database) පහත පියවර අනුගමනය කරන්න.

### පියවර 1: PostgreSQL Binaries බාගත කිරීම

1. මෙම වෙබ් අඩවියට යන්න: **https://www.enterprisedb.com/download-postgresql-binaries**
2. එහි ඇති **Windows x86-64** යටතේ ඇති Version 14 හෝ 15 බාගත කරන්න (Zip File එකක්).
3. බාගත කරගත් Zip ගොනුව ඔබේ Project Folder එක (`HR PACEGE`) ඇතුලට Copy කරන්න.

### පියවර 2: දත්ත ගොනු සකසා ගැනීම (පළමු වරට පමණි)

1. `setup_portable_step2.bat` ගොනුව ධාවනය කරන්න.
   - මෙය විසින් Zip ගොනුව ලිහා `pgsql` ෆෝල්ඩරය සාදා දෙනු ඇත.

2. `launch_portable.bat` ගොනුව ධාවනය කරන්න.
   - මෙය ස්වයංක්‍රීයව `backend\pg_data` ෆෝල්ඩරය හඳුනාගෙන Database එක පණගන්වයි.
   - **සැලකිය යුතුයි:** මෙය අලුත් Database එකක් ලෙස පටන් ගනී. පරණ දත්ත Backup එකක් Restore කල යුතුය.

### පියවර 3: පද්ධතිය ධාවනය කිරීම

මින් පසු සැමවිටම:
1. Pen Drive එක සම්බන්ධ කරන්න.
2. **`launch_portable.bat`** ගොනුව පමණක් ධාවනය කරන්න.
   - මෙය PostgreSQL (Database) Pen Drive එකෙන්ම ධාවනය කර, පද්ධතිය On කරයි.
   - වෙනත් පරිගණකයකට ගියද, දත්ත Pen Drive එකේ ඇති බැවින් වෙනස් නොවේ.

---

**වැදගත්:**
- වෙනත් පරිගණක වල දැනටමත් PostgreSQL දමා තිබේ නම්, ගැටළුවක් ඇති විය හැක. එසේ නම් අපට Port එක වෙනස් කල හැක.
