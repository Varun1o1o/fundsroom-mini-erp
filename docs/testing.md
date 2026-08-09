# System Verification & QA Testing Documentation

This document describes the manual testing script and functional checks to execute for verifying system compliance.

---

## 🔬 Testing Strategy Overview

The application relies on manual testing validation of operations and role boundaries. Standard sandbox user credentials are set up dynamically in seed state for validation testing.

---

## 🔒 1. Authentication & Role-Based Access (RBAC)

Verify that JWT sessions operate securely and routes/buttons are protected based on employee roles.

### Seed Validation User Accounts

| Access Role | Username Credentials | Password Key | Enabled Modules / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Password@123` | CRM editing, Stock management, Analytics dashboard, Challan confirmation/cancellations. |
| **Sales** | `sales@example.com` | `Password@123` | CRM client registration, interaction notes logging, draft Challans generation, Challan cancellation. |
| **Warehouse** | `warehouse@example.com` | `Password@123` | Stock catalog creation, physical stock adjustments, Challan dispatch/confirm. |
| **Accounts** | `accounts@example.com` | `Password@123` | Read-only details audits. Access to Dashboard and customer listing only. |

### Verification Verification Steps:
1. Try to open the homepage browser address (`http://localhost:5173/`). You should be forced to redirect to the log in panel (`/login`).
2. Log in as `accounts@example.com` and navigate to the **Warehouse Stock** page. Notice that the **Adjust Stock** button is missing or disabled (UI-layer validation safeguards).
3. Try to issue a manual stock adjustment API request via Postman using the Accounts token. Look for an `HTTP 403 Forbidden` response with:
   ```json
   { "message": "Permission denied: Insufficient privileges" }
   ```

---

## 🤝 2. CRM Followups & Input Validation

Verify that CRM accounts creation, search capabilities, and interaction followups operate as expected.

### Test Scenarios:
1. **Duplicate Account Lockout**:
   * Navigate to **CRM Customers**, click **Add Customer**.
   * Input the mobile number/email of an existing customer (e.g., `9898989898` / `retail.a@example.com`).
   * **Result**: UI should alert a collision, and the API should return `HTTP 409 Conflict`:
     ```json
     { "message": "Customer with this email or mobile number already exists" }
     ```
2. **CRM Log History**:
   * Open logs detail pane for `Wholesale Corp B`.
   * Register a new followup, writing a note of at least 5 characters.
   * **Result**: Real-time render update on Note catalog; database records creator UUID.

---

## 📦 3. Stock Level Auditing & Over-Allocation Safety

Validate transactional inventory adjustments and stock deduction controls.

### Test Scenarios:
1. **Negative Inventory Prevention**:
   * Seed inventory details for `Salt 1kg` (Available: 30).
   * Go to **Warehouse Stock > Adjust Stock**.
   * Specify **Stock OUT**, input magnitude `35`.
   * **Result**: UI alerts value constraint block, and the API rejects the request:
     ```json
     { "message": "Insufficient stock. Cannot adjust by -35. Current stock is 30" }
     ```
2. **Sales Dispatch Transaction Check**:
   * Create a Sales Challan draft for `Salt 1kg` with quantity `25`.
   * Confirm the Challan (status changes to `Confirmed`).
   * **Result**: `Salt 1kg` available catalog count immediately drops to **5**. A movement ledger row of category `OUT` is generated.
   * Cancel the Challan.
   * **Result**: `Salt 1kg` stock returns to **30**. A movement ledger row of category `IN` is generated.
3. **Blocked Confirmation Over-allocation**:
   * Create a draft Challan containing `Salt 1kg` with count `10`.
   * Set another Challan draft containing `Salt 1kg` with count `25` (total requested = 35, available = 30).
   * Confirm the first Challan (successfully deducts 10, leaving 20).
   * Try to confirm the second Challan.
   * **Result**: System blocks transition and shoots an out-of-stock warning block indicating only 20 are available.
