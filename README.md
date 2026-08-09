# Fundsroom Mini ERP & CRM Operations Portal

A polished, production-quality small enterprise resource planning (ERP) and customer relationship management (CRM) portal built with a **Node/Express/TypeScript (Backend)**, **Prisma ORM & MySQL (Database)**, and **React (Frontend)** stack. This client-server application implements strict schema validation, role-based access control (RBAC), atomic transactional stock adjustments, and server-side pagination.

---

## 📖 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Live Demo](#2-live-demo)
3. [Demo Credentials](#3-demo-credentials)
4. [Features](#4-features)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture](#6-system-architecture)
7. [Project Structure](#7-project-structure)
8. [Database Design](#8-database-design)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [REST API Documentation](#10-rest-api-documentation)
11. [API Error Handling](#11-api-error-handling)
12. [Business Logic](#12-business-logic)
13. [Environment Variables](#13-environment-variables)
14. [Local Development Setup](#14-local-development-setup)
15. [Deployment](#15-deployment)
16. [Postman / API Testing](#16-postman--api-testing)
17. [Screenshots](#17-screenshots)
18. [Testing](#18-testing)
19. [Deployment URLs](#19-deployment-urls)
20. [Assumptions](#20-assumptions)
21. [Known Limitations](#21-known-limitations)
22. [Future Improvements](#22-future-improvements)
23. [Case Study Requirement Mapping](#23-case-study-requirement-mapping)

---

## 1. Project Overview

This Mini ERP + CRM Portal solves critical workflow coordination bottlenecks for small distribution and retail enterprises. By unifying customer tracking, inventory catalogs, stock movement auditing, and sales order invoicing into a single application, it eliminates communication gaps between different company roles:

*   **Sales Representatives** track CRM follow-ups, logging interactions, and creating draft sales challans.
*   **Warehouse Operators** verify stock availability, record manual adjustments, and authorize physical item dispatch.
*   **Accountants** view client billing summaries and review transaction pipelines.
*   **Administrators** retain full override control and system audit logs.

---

## 2. Live Demo

*   **Frontend Client URL**: [https://fundsroom-mini-erp.vercel.app](https://fundsroom-mini-erp.vercel.app)
*   **Backend API URL**: [https://fundsroom-mini-erp.onrender.com](https://fundsroom-mini-erp.onrender.com)
*   **GitHub Repository**: [https://github.com/Varun1o1o/fundsroom-mini-erp.git](https://github.com/Varun1o1o/fundsroom-mini-erp.git)

---

## 3. Demo Credentials

The database incorporates pre-seeded test accounts representing each major business role:

| Access Role | Email address | Password | System Context / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Password@123` | Complete system configuration access. |
| **Sales** | `sales@example.com` | `Password@123` | Log CRM follow-ups, create draft/confirmed Challans. |
| **Warehouse** | `warehouse@example.com` | `Password@123` | Perform inventory adjustments, confirm dispatch. |
| **Accounts** | `accounts@example.com` | `Password@123` | Read-only details audits. Access to Dashboard and customer listing only. |

---

## 4. Features

### Authentication & Authorization
*   **JWT Sessions**: Signed JSON Web Tokens generated on login, stored locally inside `localStorage` (`erp_token`), and validated during routing.
*   **Role-Based Access Control (RBAC)**: Gated routes locking access panels on both the client SPA layout and backend API handlers.

### Customer CRM
*   **Profile Management**: Save and edit customer directories, mobile data, GST fields, address blocks, type classifications (Retail, Wholesale, Distributor), and pipeline status (Lead, Active, Inactive).
*   **CRM Logs Feed**: Chronological interaction registry for tracking contact follow-ups, next meeting reminders, and follow-up alerts.
*   **Server-Side Pagination**: Clean data-grids displaying active items with custom server pagination query controls.

### Product & Inventory
*   **Stock Tracking**: Detailed product descriptions, unique SKUs, product pricing fields, location coordinates, and stock quantity levels.
*   **Low Stock Alerts**: Interactive indicators signaling when active volumes hit or fall below warning thresholds.
*   **Double-Entry Audit Movement**: Every transaction (automatic sale dispatch or manual restock correction) is registered as an immutable record of movement IN or OUT.

### Sales Challans
*   **Multi-Item Bills**: Group multiple products database snapshots into single custom sales challans.
*   **Sequential Invoice Registry**: Automatical unique formatting format: `CH-YYYY-<Index>` (calculated safely from current-year sequence).
*   **Order Workflows**: Track orders through different lifecycles: `Draft`, `Confirmed` (Dispatch locks stock levels), or `Cancelled` (Restores reserve parts back to inventory).

---

## 5. Technology Stack

| Architecture Layer | Technology Selection | Implementation Details |
| :--- | :--- | :--- |
| **Frontend Frame** | React (Vite) | Single Page App, custom responsive Vanilla CSS design system. |
| **Backend Engine** | Node.js / Express | Built in TypeScript, using strict controller-routing segregation. |
| **Interface Languages** | TypeScript / JavaScript | TS compile checks on backend, JS JSX modules on client. |
| **Prisma ORM** | Prisma Client (v5.10.2+) | Auto-generated database typings & seeding. |
| **Database Server** | MySQL | Relational data persistence with foreign key constraints. |
| **Auth/Cryptography** | JWT & BcryptJS | Bearer header verification, bcrypt hashes for password security. |
| **API Architecture** | REST | Standard HTTP responses (`GET`, `POST`, `PUT`, `DELETE`). |
| **Hosting (Server)** | Render Web Service | Runs backend Node server via `npm start`. |
| **Hosting (Client)** | Vercel | Serves compiled static SPA builds (`/dist`). |
| **Hosting (Database)**| Aiven MySQL | Serverless transactional MySQL cloud server node. |

---

## 6. System Architecture

The portal separates layout assembly, logic coordination, and data query concerns:

```mermaid
flowchart TD
    User([Business Employee]) -->|Browser UI| Frontend[React Client - Vercel]
    
    subgraph Frontend Client
        RouteGate{Role Gate Check} -->|Authenticated & Allowed| Page[Dashboard / CRM / Stock / Billing]
        apiClient[api.js Client Calls] -->|Bearer JWT Header| GET_POST[REST Requests]
    end

    GET_POST -->|Public Internet| Render[Express / TS Backend - Render]

    subgraph Express Backend
        AuthMiddleware[jwt authenticate] -->|Decrypt Client claims| RBACMiddleware[authorize allowedRoles]
        RBACMiddleware -->|Sanitize inputs via Zod| Controllers[API Controllers]
    end

    Controllers -->|Prisma Client| DB[(MySQL DB - Aiven Cloud)]
```

---

## 7. Project Structure

```text
fundsroom/
├── backend/                  # REST API Server Code
│   ├── prisma/               # Schema configuration and database seed scripts
│   │   ├── schema.prisma     # Active Prisma schema for MySQL
│   │   └── seed.ts           # Sandbox user accounts, inventory seeds
│   ├── src/
│   │   ├── controllers/      # API logic handlers
│   │   ├── middleware/       # JWT session auth and privilege decorators
│   │   ├── routes/           # REST endpoints mapping
│   │   ├── prisma.ts         # Singleton Prisma client instance
│   │   ├── app.ts            # Express setup and global CORS/Helmet bindings
│   │   └── server.ts         # Port listener bootstrapper
│   ├── package.json          # Node scripts and declarations
│   └── tsconfig.json         # TS compile configurations
├── frontend/                 # React UI Client
│   ├── src/
│   │   ├── components/       # Common widgets (NavBar, Modals, Forms)
│   │   ├── context/          # Auth context and JWT session caching
│   │   ├── pages/            # Page layouts (Dashboard, Customers, Inventory, Challans)
│   │   ├── services/         # API HTTP fetch functions (api.js)
│   │   ├── App.jsx           # Routing configuration
│   │   └── index.css         # Dynamic modern CSS design system tokens
│   ├── package.json          # Vite scripts and dependencies
│   └── vite.config.js        # Vite compiler rules
└── README.md                 # Primary system manual
```

---

## 8. Database Design

Refer to [c:\Users\varun\Downloads\fundsroom\docs\database.md](file:///c:/Users/varun/Downloads/fundsroom/docs/database.md) for database model descriptions and properties.

```mermaid
erDiagram
    USER ||--o{ SALES_CHALLAN : "logs createdBy"
    USER ||--o{ STOCK_MOVEMENT : "logs createdBy"
    USER ||--o{ CUSTOMER_FOLLOW_UP : "logs createdBy"
    CUSTOMER ||--o{ SALES_CHALLAN : "has customerId"
    CUSTOMER ||--o{ CUSTOMER_FOLLOW_UP : "receives customerId"
    PRODUCT ||--o{ STOCK_MOVEMENT : "audited via productId"
    PRODUCT ||--o{ SALES_CHALLAN_ITEM : "included via productId"
    SALES_CHALLAN ||--o{ SALES_CHALLAN_ITEM : "contains challanId"
```

---

## 9. Authentication & Authorization

Protected endpoints check user status and matching privileges. If a user attempt falls outside of their role mappings, their request is blocked.

### Privilege Mapping matrix

| Role Group | View Pages | CRM Editing | Stock Adjust (Manual) | Edit Catalog | Generate Challans | Dispatch Stock | Cancel Challan |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sales** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Warehouse**| ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Accounts** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 10. REST API Documentation

Refer to [c:\Users\varun\Downloads\fundsroom\docs\api.md](file:///c:/Users/varun/Downloads/fundsroom/docs/api.md) for detailed payloads and success response schemas.

| HTTP Method | Route Endpoint | Authentication | Allowed Roles | Description Details |
| :--- | :--- | :---: | :--- | :--- |
| **POST** | `/api/auth/login` | No | All | Verify email/password, returns JWT. |
| **GET** | `/api/auth/me` | Yes | All | Decrypt session JWT claims, returns user info. |
| **GET** | `/api/customers` | Yes | All | List clients directory (Supports paging, queries). |
| **POST** | `/api/customers` | Yes | Admin / Sales | Register a new client account. |
| **POST** | `/api/customers/:id/followups` | Yes | Admin / Sales | Register contact notes and next reminder dates. |
| **GET** | `/api/products` | Yes | All | Fetch warehouse inventory stock list. |
| **POST** | `/api/products/:id/adjust` | Yes | Admin / Warehouse | Manual IN/OUT stock adjustments. |
| **GET** | `/api/products/movements/log`| Yes | All | Fetch global double-entry stock audit ledger logs. |
| **GET** | `/api/challans` | Yes | All | List sales challans records. |
| **POST** | `/api/challans` | Yes | Admin / Sales | Create order invoices (Draft/Confirmed status). |
| **POST** | `/api/challans/:id/confirm` | Yes | Admin/Sales/Warehouse | Dispatches stock, transitions status to Confirmed. |
| **POST** | `/api/challans/:id/cancel` | Yes | Admin / Sales | Voids billing document, restores stock if confirmed. |
| **GET** | `/api/analytics/dashboard`| Yes | All | Expose aggregate KPIs and activity log charts. |

---

## 11. API Error Handling

The Express server utilizes standardized HTTP status codes to reflect transaction outcomes:

*   **`400 Bad Request`**: Request payload invalid. Generated when Zod schemas parser catches input format errors (e.g. mobile shorter than 10 digits).
*   **`401 Unauthorized`**: Bearer token is missing, expired, or signature is mismatched.
*   **`403 Forbidden`**: Authentication succeeded, but matching user role privileges are insufficient.
*   **`404 Not Found`**: Target customer, invoice, or catalogue product UUID does not exist.
*   **`409 Conflict`**: Operation breaks business logic rules:
    *   Creating duplicate customer accounts (same email or mobile).
    *   Confirming or editing sales invoices that are already cancel-locked.
    *   Requested item quantities are higher than active warehouse stocks:
        ```json
        { "message": "Insufficient stock for product 'Tea Powder 1kg'. Available: 3, requested for confirmation: 10" }
        ```
*   **`500 Internal Server error`**: Unexpected database connection dropouts or system crashes.

---

## 12. Business Logic

### Stock Deductions on Confirm
Confirming a Sales Challan triggers an atomic dispatch. The server processes this block within a database **transaction (`$transaction`)**:

```mermaid
flowchart TD
    StartConfirm([Confirm invoice request clicked]) --> CheckDraft{Status is Draft?}
    CheckDraft -->|No| RejectAlreadyDone[Reject: Return 409 Conflict]
    CheckDraft -->|Yes| QueryStocks[Query available stock for every line item]
    
    QueryStocks --> CheckAvailability{All items: Available >= Requested?}
    CheckAvailability -->|No| RejectOutOfStock[Reject: Return 409 Conflict & list failed items]
    
    CheckAvailability -->|Yes| LaunchTx[Initialize database transactional loop]
    LaunchTx --> LoopItems[For each item...]
    LoopItems --> DecrementStock[Decrement currentStock on Product table]
    DecrementStock --> LogMovement[Log immutable OUT StockMovement record]
    LogMovement --> MarkConfirmed[Set SalesChallan status to Confirmed]
    MarkConfirmed --> CommitTx([Commit transactional state values to Database])
```

### Stock Restorations on Cancel
If a client decides to void a confirmed invoice, the system allows cancellation. The system:
- Iterates over all snapshot items contained in the invoice.
- Increments `currentStock` values on the product table.
- Logs an offset `IN` ledger entry marked: `Sales Challan Cancellation (CH-XXXX) - Restored Stock`.
- Converts status to `Cancelled`.

---

## 13. Environment Variables

Create `.env` configs (ignored in git staging folders) utilizing these keys:

### Backend `.env`
```env
DATABASE_URL="mysql://avnadmin:AVNS_XXX@mysql-domain-name.aivencloud.com:28650/defaultdb?ssl-mode=REQUIRED"
JWT_SECRET="supersecretkeyerp"
PORT=5000
FRONTEND_URL="https://fundsroom-mini-erp.vercel.app"
NODE_ENV="production"
```

### Frontend Environment Variables (Vercel Setting Panel)
```env
VITE_API_URL="https://fundsroom-mini-erp.onrender.com"
```

---

## 14. Local Development Setup

### System Prerequisites
Ensure you have **Node.js** (v18.0+) and **MySQL Server** installed locally.

### 1. Database Setup
Register a local database instance named `mini_erp`:
```sql
CREATE DATABASE mini_erp;
```

### 2. Configure Backend Engine
1. Navigate to `/backend` directory:
   ```bash
   cd backend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Establish a local `.env` file:
   ```env
   DATABASE_URL="mysql://root:PasswordHere@localhost:3306/mini_erp"
   JWT_SECRET="supersecretkeyerp"
   PORT=5000
   FRONTEND_URL="http://localhost:5173"
   NODE_ENV="development"
   ```
4. Push database tables and generate Prisma models:
   ```bash
   npx prisma db push
   ```
5. Seed initial mock database elements:
   ```bash
   npx prisma db seed
   ```
6. Start developmental server:
   ```bash
   npm run dev
   ```

### 3. Configure Frontend Client
1. Open a new console window in `/frontend` folder:
   ```bash
   cd frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Run the compiler development server:
   ```bash
   npm run dev
   ```
4. Access the web portal in your browser: `http://localhost:5173`

---

## 15. Deployment

Refer to [c:\Users\varun\Downloads\fundsroom\docs\deployment.md](file:///c:/Users/varun/Downloads/fundsroom/docs/deployment.md) for production build configurations and step-by-step setup guides.

---

## 16. Postman / API Testing

A complete Postman template JSON is available at:
👉 **[c:\Users\varun\Downloads\fundsroom\docs\postman\mini-erp-crm.postman_collection.json](file:///c:/Users/varun/Downloads/fundsroom/docs/postman/mini-erp-crm.postman_collection.json)**

It includes requests with environment variable interpolation for:
*   Auth Login & Session validation
*   Customers Registry & Log addition
*   Products catalog list, adjustment, and Stock Audit ledger
*   Challan Generation, Confirmation, and Cancellation.

Import the JSON file into your Postman application, specify `baseUrl` variable to point to your live site server, and start issuing requests.

---

## 17. Screenshots

Screenshots showing operational views are located in `/docs/screenshots/` (once generated). Here are the primary routes to record:

1.  **Authentication Portal** (`/login`): Clean logins form with error fields and background branding layout.
2.  **Dashboard Layout** (`/`): Analytical summary, showing total values, active clients, alerts, and recent activities.
3.  **CRM Customers list** (`/customers`): Responsive search, active status badges, type selectors, and pagination controls.
4.  **Warehouse catalog** (`/inventory`): Item details cards, low stock triggers, **Adjust Stock** modal, and **Audit Ledger** history lists.
5.  **Sales Invoice pipeline** (`/challans`): Create new multi-item invoice draft form, confirmation dispatch triggers, and cancellation restoration indicators.

---

## 18. Testing

Refer to [c:\Users\varun\Downloads\fundsroom\docs\testing.md](file:///c:/Users/varun/Downloads/fundsroom/docs/testing.md) for manual QA scripts and edge case verification scenarios.

---

## 19. Deployment URLs

### Production Environments:
*   **Web Portal frontend**: [https://fundsroom-mini-erp.vercel.app](https://fundsroom-mini-erp.vercel.app)
*   **API backend Service**: [https://fundsroom-mini-erp.onrender.com](https://fundsroom-mini-erp.onrender.com)
*   **Aiven MySQL Database**: `mysql://avnadmin:<password>@mysql-1acbf1f5-fundsroom-mini-erp.l.aivencloud.com:28650/defaultdb?ssl-mode=REQUIRED`

---

## 20. Assumptions
1.  **User Provisioning**: Admins manage user additions directly via backend systems or schema seed command execution (no user sign-up page exists in the MVP).
2.  **Taxing**: Item rates are snapped into invoice snapshots immediately during challan entry creation, sheltering outstanding orders from future pricing updates.
3.  **Strict Stocks**: Backorders are disabled. Physical dispatch requires stock levels higher than item requests.

---

## 21. Known Limitations
1.  **No Attachment storage**: Product items display text listings (no file upload systems / Amazon S3 integrations are coded).
2.  **No PDF Generator Engine**: Challans display screen rendering panels (PDF rendering must be implemented using external libraries).
3.  **No Automated Unit Tests**: System uses manual QA test cases; no Jest or Cypress suite scripts are preconfigured.

---

## 22. Future Improvements
1.  **PDF/Email Invoicing**: Integrate a PDF creation module.
2.  **Batch Actions**: Implement CSV uploads for bulk product uploads.
3.  **Notifications**: Integrate Slack Webhook or Email alerts triggers to notify the warehouse team when items hit warning thresholds.

---

## 23. Case Study Requirement Mapping

| Case Study Requirement | Implementation | Status |
| :--- | :--- | :---: |
| **Authentication** | Bearer JWT validation on backend guards, Auth context tracking on frontend. | ✅ |
| **Role-Based Gates (RBAC)** | Route gating on frontend router & API level authorization middleware checkers. | ✅ |
| **Customer CRM Registry** | Customer addition, filtering directory, details log tracking, follow-ups. | ✅ |
| **Product Management** | Catalog CRUD operations, SKU indices, Category classifications details listing. | ✅ |
| **Warehouse inventory** | Stock balance indicators, warning thresholds, warehouse location indexing. | ✅ |
| **Stock Adjustments & Log** | Manual adjustment modal, audit movements ledger logs, double-entry logs. | ✅ |
| **Atomic Stock Deductions** | Double-entry stock deductions wrapped inside database transactions (`$transaction`). | ✅ |
| **Sequential Serial ID** | Challan sequential invoice series logic generating formatting: `CH-YYYY-XXXX`. | ✅ |
| **CORS Access Security** | Secured production URL headers utilizing environment configurations. | ✅ |
| **REST APIs Integration** | Express routes structure returning standardized JSON error/success responses. | ✅ |
| **Input Schema Validation** | Client form validations + backend Zod runtime middleware schemas. | ✅ |
| **Server-Side Pagination** | Dynamic listing pagination handling database offsets on DB logs and tables. | ✅ |
