# REST API Endpoints Specification

This document details all implemented endpoints in the **Fundsroom Mini ERP & CRM Application REST API**.

---

## 🖧 API Overview

All API requests must point to the base URL (local: `http://localhost:5000/api`, relative production: `/api`). 

### Headers
Requests to protected endpoints must supply the bearer token headers:
```text
Authorization: Bearer <your-jwt-token-here>
```

---

## 🔑 Authentication Endpoints

### 1. User Login Validation
*   **Method**: `POST`
*   **URL**: `/auth/login`
*   **Authentication**: None
*   **Request Body**:
    ```json
    {
      "email": "admin@example.com",
      "password": "Password@123"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e2ba9321-dfeb-4856-9ac5-8123da4bde29",
        "name": "System Admin",
        "email": "admin@example.com",
        "role": "Admin"
      }
    }
    ```
*   **Error Response (401 Unauthorized)**:
    ```json
    { "message": "Invalid password" }
    ```

### 2. Verify Session
*   **Method**: `GET`
*   **URL**: `/auth/me`
*   **Authentication**: Required (All Roles)
*   **Success Response (200 OK)**:
    ```json
    {
      "user": {
        "id": "e2ba9321-dfeb-4856-9ac5-8123da4bde29",
        "name": "System Admin",
        "email": "admin@example.com",
        "role": "Admin"
      }
    }
    ```

---

## 🤝 CRM Customers Endpoints

### 3. List Customers
*   **Method**: `GET`
*   **URL**: `/customers`
*   **Authentication**: Required (All Roles)
*   **Query Parameters**:
    *   `search` (String, Optional): Matches `customerName`, `email`, `mobileNumber`, `businessName`.
    *   `status` (Enum: `Lead`, `Active`, `Inactive`, Optional).
    *   `type` (Enum: `Retail`, `Wholesale`, `Distributor`, Optional).
    *   `page` (Number, Default `1`).
    *   `limit` (Number, Default `10`).
*   **Success Response (200 OK)**:
    ```json
    {
      "customers": [
        {
          "id": "customer-uuid-1234",
          "customerName": "Retail Customer A",
          "mobileNumber": "9898989898",
          "email": "retail.a@example.com",
          "businessName": "A Stores",
          "customerType": "Retail",
          "status": "Active"
        }
      ],
      "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
    }
    ```

### 4. Create Customer Profile
*   **Method**: `POST`
*   **URL**: `/customers`
*   **Authentication**: Required (**Admin** or **Sales** only)
*   **Request Body**:
    ```json
    {
      "customerName": "Test Customer B",
      "mobileNumber": "9123456780",
      "email": "cust.b@example.com",
      "businessName": "B Enterprises",
      "customerType": "Wholesale",
      "address": "45, Ring Road, Market Yard, Pune",
      "status": "Lead",
      "notes": "Initial inquiry details logged here."
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": "new-customer-uuid",
      "customerName": "Test Customer B",
      "mobileNumber": "9123456780"
    }
    ```

### 5. Create Customer Follow-Up Note
*   **Method**: `POST`
*   **URL**: `/customers/:id/followups`
*   **Authentication**: Required (**Admin** or **Sales** only)
*   **Request Body**:
    ```json
    {
      "note": "Spoke to customer regarding bulk pricing sheet discount.",
      "followUpDate": "2026-08-15T12:00:00.000Z"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "id": "note-uuid-999",
      "customerId": "customer-id",
      "note": "Spoke to customer regarding...",
      "followUpDate": "2026-08-15T12:00:00.000Z",
      "createdBy": "user-uuid"
    }
    ```

---

## 📦 Products & Inventory Endpoints

### 6. List Products catalog
*   **Method**: `GET`
*   **URL**: `/products`
*   **Authentication**: Required (All Roles)
*   **Query Parameters**:
    *   `category` (String, Optional).
    *   `lowStock` (Boolean string `"true"`, Optional): Limits search to products with `currentStock <= minimumStockAlertQuantity`.
    *   `search` (String, Optional).
    *   `page` (Number).
    *   `limit` (Number).
*   **Success Response (200 OK)**:
    ```json
    {
      "products": [
        {
          "id": "prod-uuid",
          "productName": "Sugar 50kg",
          "sku": "PROD-SUGAR-50",
          "category": "Groceries",
          "unitPrice": "2400.00",
          "currentStock": 18,
          "minimumStockAlertQuantity": 20,
          "warehouseLocation": "Shelf C-1"
        }
      ]
    }
    ```

### 7. Adjust Inventory Stock levels (Manual Stock Movement)
*   **Method**: `POST`
*   **URL**: `/products/:id/adjust`
*   **Authentication**: Required (**Admin** or **Warehouse** only)
*   **Request Body**:
    ```json
    {
      "quantityChanged": 50,
      "movementType": "IN",
      "reason": "Restocked via partner distributor consignment"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Stock adjusted successfully",
      "product": { "id": "prod-uuid", "currentStock": 68 },
      "movement": { "id": "movement-uuid", "quantityChanged": 50, "movementType": "IN" }
    }
    ```

### 8. Get Stock Movements Audit Logs
*   **Method**: `GET`
*   **URL**: `/products/movements/log`
*   **Authentication**: Required (All Roles)
*   **Success Response (200 OK)**:
    ```json
    {
      "movements": [
        {
          "id": "movement-uuid",
          "quantityChanged": 50,
          "movementType": "IN",
          "reason": "Restocked via partner distributor consignment",
          "product": { "productName": "Sugar 50kg", "sku": "PROD-SUGAR-50" }
        }
      ]
    }
    ```

---

## 🧾 Sales Challan Endpoints

### 9. Create Sales Challan
*   **Method**: `POST`
*   **URL**: `/challans`
*   **Authentication**: Required (**Admin** or **Sales** only)
*   **Request Body**:
    ```json
    {
      "customerId": "cust-uuid-1234",
      "status": "Draft",
      "items": [
        { "productId": "prod-uuid", "quantity": 10 }
      ]
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "message": "Sales Challan CH-2026-0003 created successfully in Draft state",
      "challan": { "id": "challan-uuid", "challanNumber": "CH-2026-0003", "status": "Draft" }
    }
    ```

### 10. Confirm Sales Challan (Deducts Stock)
*   **Method**: `POST`
*   **URL**: `/challans/:id/confirm`
*   **Authentication**: Required (**Admin**, **Sales**, or **Warehouse** only)
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Challan CH-2026-0003 confirmed successfully. Inventory deducted.",
      "challan": { "id": "challan-uuid", "status": "Confirmed" }
    }
    ```
*   **Status Conflicts (409 Conflict)**:
    *   Occurs if any catalog item has insufficient stock:
        ```json
        { "message": "Insufficient stock for product 'Sugar 50kg'. Available: 8, requested for confirmation: 10" }
        ```
    *   Occurs if challan is already confirmed or cancelled.

### 11. Cancel Sales Challan (Restores Stock if Confirmed)
*   **Method**: `POST`
*   **URL**: `/challans/:id/cancel`
*   **Authentication**: Required (**Admin** or **Sales** only)
*   **Success Response (200 OK)**:
    ```json
    {
      "message": "Challan CH-2026-0003 cancelled successfully. Inventory restored.",
      "challan": { "id": "challan-uuid", "status": "Cancelled" }
    }
    ```

---

## 📊 Operational Analytics Endpoints

### 12. Fetch Dashboard stats
*   **Method**: `GET`
*   **URL**: `/analytics/dashboard`
*   **Authentication**: Required (All Roles)
*   **Success Response (200 OK)**:
    ```json
    {
      "kpi": {
        "totalAmount": 12600.5,
        "totalProducts": 10,
        "activeCustomers": 3,
        "pendingDrafts": 1
      },
      "lowStockProducts": [
        { "id": "prod-uuid", "productName": "Sugar 50kg", "currentStock": 3 }
      ],
      "recentActivity": [
        { "type": "Challan Created", "message": "Draft Challan CH-2026-0003 logged..." }
      ]
    }
    ```
