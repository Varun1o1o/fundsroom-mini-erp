# Production Deployment Documentation

This document describes how to deploy the **Fundsroom Mini ERP & CRM Operations Portal** in a cloud production environment.

---

## 🏗️ Deployment Environment Architecture

*   **Database**: Managed MySQL (e.g. via Aiven, Railway, or TiDB Cloud).
*   **Backend Server**: Node.js/Express service hosted on **Render**.
*   **Frontend Client**: React SPA client hosted on **Vercel**.

---

## 🗄️ 1. Database Setup (Aiven / Railway)

Because Render does not provide a free MySQL database tier, you must create a MySQL cluster on **Aiven.io** or **Railway.app**.

Once created, construct the connection string:
```text
mysql://avnadmin:<password>@mysql-1acbf1f5-fundsroom-mini-erp.l.aivencloud.com:28650/defaultdb?ssl-mode=REQUIRED
```

*   `avnadmin`: Username.
*   `AVNS_Xvu...`: Database password.
*   `mysql-1acbf1...`: Host server.
*   `28650`: Port.
*   `defaultdb`: Active database.

---

## 📦 2. Backend API Service Deployment (Render)

1. Connect your GitHub repository to [Render](https://render.com/).
2. Create a new **Web Service** with the following parameters:
    *   **Name**: `fundsroom-mini-erp-backend`
    *   **Environment**: `Node`
    *   **Root Directory**: `backend` (Points it to the subfolder of the repo)
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
3. Add the following **Environment Variables**:
    *   `DATABASE_URL` = `mysql://avnadmin:<password>@<host>:<port>/<dbname>?ssl-mode=REQUIRED`
    *   `JWT_SECRET` = `supersecretkeyerp` (or any secure secret string)
    *   `PORT` = `5000`
    *   `NODE_ENV` = `production`
    *   `FRONTEND_URL` = `https://fundsroom-mini-erp.vercel.app` (Set after deploying page frontend in Vercel)

---

## 🌱 3. Migration and Seed Database

Run migrations and database seeding using the connection string from your local terminal:

```powershell
# Set database coordinate variables (Windows PowerShell)
$env:DATABASE_URL="mysql://avnadmin:<password>@<host>:<port>/<dbname>?ssl-mode=REQUIRED"

# Perform schema migrations
npx prisma db push

# Run default system seeding (creates roles, products list, and CRM elements)
npx prisma db seed
```
*(On macOS/Linux, prepend the command with `DATABASE_URL="..."` instead).*

---

## 🎨 4. Frontend Client Deployment (Vercel)

1. Connect your repository to [Vercel](https://vercel.com).
2. Configure project parameters inside Vercel setup wizard:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `frontend` (Point Vercel to look inside `/frontend`)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3. In **Environment Variables**, add:
    *   `VITE_API_URL` = `https://fundsroom-mini-erp.onrender.com` (Point this to your deployed Render API service web address URL)
4. Click **Deploy**. Vercel will trigger a building loop and serve the dashboard.
5. In your **Render settings**, verify that `FRONTEND_URL` matches your new live Vercel address to secure CORS calls.
