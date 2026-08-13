# Fix: "Can't reach database server at localhost:5432"

This error means **PostgreSQL is not running**. The app cannot login until the database is connected.

---

## Option A — Start local PostgreSQL (if already installed)

1. Press **Win**, type **PowerShell**, right-click → **Run as administrator**

2. Start the service:
   ```powershell
   net start postgresql-x64-18
   ```

3. If that works, create DB and seed (normal terminal):
   ```powershell
   cd E:\fundsroom2\backend
   npm run db:migrate
   npm run db:seed
   ```

4. Refresh http://localhost:5173 and login: `admin@erp.local` / `Pass@123`

---

## Option B — Reinstall PostgreSQL (if start fails)

Your PostgreSQL 18 install appears broken (service exists but files missing).

1. Download installer: https://www.postgresql.org/download/windows/
2. Install PostgreSQL 16 or 18
3. Set password to: `postgres` (matches `backend/.env`)
4. After install, open **Admin PowerShell**:
   ```powershell
   net start postgresql-x64-18
   ```
5. Create database (adjust path if needed):
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE mini_erp_crm;"
   ```
6. Migrate and seed:
   ```powershell
   cd E:\fundsroom2\backend
   npm run db:migrate
   npm run db:seed
   ```

---

## Option C — Free cloud database (Neon, no local install)

1. Go to https://neon.tech and create a free account
2. Create a project → copy the **connection string**
3. Edit `E:\fundsroom2\backend\.env`:
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/mini_erp_crm?sslmode=require
   ```
4. Run:
   ```powershell
   cd E:\fundsroom2\backend
   npm run db:migrate:deploy
   npm run db:seed
   ```
5. Restart backend (`npm run dev`)

---

## Verify database is working

```powershell
# Should return JSON with success: true
Invoke-RestMethod -Uri "http://localhost:5000/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@erp.local","password":"Pass@123"}'
```

If you see `"token"` in the response, login is fixed.
