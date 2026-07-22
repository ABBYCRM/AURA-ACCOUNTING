# AURA Accounting

Full-stack W-2, 1099, and small-business accounting platform with **QuickBooks Online API** integration.

## Stack
- **Backend:** Node.js 20 + Express + TypeScript + better-sqlite3
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + React Router + Zustand + Recharts
- **DB:** SQLite (file-based, zero-config, persistent on Render disk)
- **Auth:** JWT + bcrypt (own auth) + OAuth 2.0 (QuickBooks)
- **PDFs:** `pdfkit` (W-2, 1099-NEC formatted for filing preview)
- **Deploy:** Single Render web service serving API + static frontend

## Features
- Employees, contractors, payroll runs, W-2 prep, 1099-NEC/MISC prep
- Chart of accounts, invoices, expenses, payments
- Dashboard with revenue / expense / profit charts
- QuickBooks Online OAuth 2.0 connection + sync (invoices, customers, accounts)
- PDF generation of W-2 and 1099 forms
- Multi-user team support with role-based access

## Local Dev
```bash
npm run install:all
cp backend/.env.example backend/.env
# fill QBO_CLIENT_ID, QBO_CLIENT_SECRET for OAuth
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:5173
```

## Deploy to Render
Service is pre-wired in `render.yaml`. Push to `main` and use the Render
manual deploy API call (`POST /v1/services/{id}/deploys`).

## QuickBooks Setup
1. Create an app at https://developer.intuit.com/
2. Get Client ID + Client Secret
3. Add redirect URI: `<APP_URL>/api/qbo/callback`
4. Set env vars on Render: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`
