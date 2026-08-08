# Fundsroom Mini ERP + CRM Operations Portal

A polished, production-quality small enterprise resource planning (ERP) and customer relationship management (CRM) portal built with **Node/Express/TypeScript (Backend)**, **Prisma ORM & MySQL (Database)**, and **React & Vite (Frontend)**. This application follows clean, layered architecture, strict schema validation, and role-based access control rules.

---

## 🚀 Key Features

*   **Secure Authentication**: Session-based JWT token generation with role credentials verification.
*   **Role-Based Access Control (RBAC)**: Custom routing locks based on roles:
    *   `Admin`: Full permissions across CRM, billing, stock controls, and audits.
    *   `Sales`: Registration of CRM accounts, managing leads, logging call interaction details, and setting up sales challans.
    *   `Warehouse`: Regulating physical inventory, logging stock corrections, and confirming dispatch items.
    *   `Accounts`: Read-only access to sales challan registries and customer details for compliance audits.
*   **CRM Interaction Logging**: Chronological history tracking of contact follow-up calls, custom lead categories, and scheduling alerts.
*   **Warehouse Stock Alerts**: Real-time identification of low-stock products at/below customizable threshold levels.
*   **Atomic Stock Deductions**: Confirmed sales challans automatically decrement available inventory and record double-entry audit movements in a database transaction (`$transaction`).
*   **Inventory Reversals**: Cancelling a confirmed sales challan voids the transaction and automatically restores the inventory items to the warehouse.
*   **Sequential Invoice Generators**: Automatical serial challan key generator format: `CH-YYYY-XXXX` (using safe database sequence lookup).

---

## 🛠 Tech Stack

*   **Backend**: Node.js, Express, TypeScript, JWT, Zod, Helmet, CORS
*   **Frontend**: React (Vite), React Router v6, Lucide Icons, Vanilla CSS Design System
*   **Database**: MySQL, Prisma ORM (Client, Migrations, Seeders)

---

## 📊 Database Schema Details

```mermaid
erDiagram
    User ||--o{ SalesChallan : "creates"
    User ||--o{ CustomerFollowUp : "logs"
    User ||--o{ StockMovement : "records"
    Customer ||--o{ SalesChallan : "has"
    Customer ||--o{ CustomerFollowUp : "logs"
    Product ||--o{ StockMovement : "audits"
    Product ||--o{ SalesChallanItem : "includes"
    SalesChallan ||--o{ SalesChallanItem : "contains"

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        Role role
        datetime createdAt
    }
    
    Customer {
        string id PK
        string customerName
        string mobileNumber UK
        string email UK
        string businessName
        string gstNumber
        CustomerType customerType
        string address
        CustomerStatus status
        datetime followUpDate
        string notes
        datetime createdAt
    }

    CustomerFollowUp {
        string id PK
        string customerId FK
        string note
        datetime followUpDate
        string createdBy FK
        datetime createdAt
    }

    Product {
        string id PK
        string productName
        string sku UK
        string category
        decimal unitPrice
        int currentStock
        int minimumStockAlertQuantity
        string warehouseLocation
        datetime createdAt
    }

    StockMovement {
        string id PK
        string productId FK
        int quantityChanged
        MovementType movementType
        string reason
        string createdBy FK
        datetime createdAt
    }

    SalesChallan {
        string id PK
        string challanNumber UK
        string customerId FK
        int totalQuantity
        decimal totalAmount
        ChallanStatus status
        string createdBy FK
        datetime createdAt
    }

    SalesChallanItem {
        string id PK
        string challanId FK
        string productId FK
        string productNameSnapshot
        string skuSnapshot
        decimal unitPriceSnapshot
        int quantity
        decimal subtotal
    }
```

---

## ⚙️ Local Installation & Setup

Ensure you have **Node.js** (v18+) and **MySQL** server configured and running locally.

### 1. Database Configurations
Create a local MySQL database named `mini_erp`.

### 2. Backend Configs
1. Go to the active `/backend` directory:
   ```bash
   cd backend
   ```
2. Setup environment variables (`.env`):
   ```env
   DATABASE_URL="mysql://root:Varun@123@localhost:3306/mini_erp"
   JWT_SECRET="supersecretkeyerp"
   PORT=5000
   FRONTEND_URL="http://localhost:5173"
   NODE_ENV="development"
   ```
3. Install references:
   ```bash
   npm install
   ```
4. Push database schema to MySQL (using Prisma CLI) and generate client:
   ```bash
   npx prisma db push
   ```
5. Seed initial mock database elements (Users, products list, customers):
   ```bash
   npx prisma db seed
   ```
6. Compiles typescript and starts production API:
   ```bash
   npm run build
   npm start
   ```

### 3. Frontend Configs
1. Open a new terminal in `/frontend` folder:
   ```bash
   cd frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Start the bundler development server:
   ```bash
   npm run dev
   ```
4. Access the web portal in your browser: `http://localhost:5173`.

---

## 🔒 Test Credentials (Seeded Records)

| Email | Password | Role | System Context |
| :--- | :--- | :--- | :--- |
| **admin@example.com** | `Password@123` | **Admin** | Full system configurations, stock log audits |
| **sales@example.com** | `Password@123` | **Sales** | Register leads, add CRM history, create drafts |
| **warehouse@example.com** | `Password@123` | **Warehouse** | Perform physical inventory adjustments, mark dispatches |
| **accounts@example.com** | `Password@123` | **Accounts** | View sales invoices, download transaction ledgers |

---

## ⚡ API Endpoints Matrix

### Auth Flow
*   `POST /api/auth/login` - Verify user details, returns JWT token.
*   `GET /api/auth/me` - Validates bearer headers and returns active session properties.

### CRM Accounts Pipeline
*   `GET /api/customers` - Returns client profiles. Filters: `type`, `status`, `search`.
*   `GET /api/customers/:id` - Detailed logs and orders history for single customer.
*   `POST /api/customers` - Register client. *Sales/Admin gated*.
*   `PUT /api/customers/:id` - Update profile configurations. *Sales/Admin gated*.
*   `POST /api/customers/:id/followups` - Log calls, reschedule follow-up dates. *Sales/Admin gated*.

### Warehouse Inventory Module
*   `GET /api/products` - Live stock monitoring. Filters: `lowStock`, `category`, `search`.
*   `GET /api/products/:id` - Dynamic logs specific to selected items.
*   `POST /api/products` - Register Catalog item. *Admin/Warehouse/Sales*.
*   `PUT /api/products/:id` - Edit SKU particulars. *Admin/Warehouse/Sales*.
*   `POST /api/products/:id/adjust` - Manual volume increment/decrement. *Warehouse/Admin gated*.
*   `GET /api/products/movements/log` - Live double-entry warehouse audit logs. All roles.

### Sales Challans Billing
*   `GET /api/challans` - Returns invoices list. Filters: `status`, `customerId`.
*   `GET /api/challans/:id` - Renders invoice items, snapshots, creator and buyer info.
*   `POST /api/challans` - Create invoice (Draft / Confirmed). Sets matching product price snapshots. *Sales/Admin gated*.
*   `PUT /api/challans/:id` - Modify invoice details (Only valid in `Draft` state). *Sales/Admin gated*.
*   `POST /api/challans/:id/confirm` - Atomically deduct stock levels, transition status. *Sales/Warehouse/Admin gated*.
*   `POST /api/challans/:id/cancel` - Voids invoice. If already confirmed, restores stock counts. *Sales/Admin gated*.

### Operational Analytics
*   `GET /api/analytics/dashboard` - Exposes chart metrics and audit summaries. All roles.
