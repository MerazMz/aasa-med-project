# Admin & Inventory Management API Documentation

This document covers the newly added User Management APIs (restricted to `ADMIN`) and Product Deletion API (accessible by `ADMIN` and the listing `SELLER`).

---

## 1. User Management APIs

All endpoints below require authentication with the `ADMIN` role.

### A. List Users
Retrieve a directory of all registered system users (excluding sensitive details like password hashes).

- **URL**: `/api/admin/users`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <jwt_token>` (or authenticated via `auth-token` HTTP-only cookie)
- **Response `200 OK`**:
  ```json
  {
    "users": [
      {
        "id": "cmpxn4su70007swi4iw5gikl9",
        "name": "Jane Seller",
        "email": "seller@asamed.com",
        "role": "SELLER",
        "createdAt": "2026-06-03T05:32:00.000Z"
      },
      {
        "id": "cmpyn4su70007swi4iw5gikl8",
        "name": "Admin Root",
        "email": "admin@asamed.com",
        "role": "ADMIN",
        "createdAt": "2026-06-03T05:30:00.000Z"
      }
    ]
  }
  ```

---

### B. Create User
Create a new user account with any system role directly.

- **URL**: `/api/admin/users`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_token>` (or authenticated via cookie)
- **Request Body**:
  ```json
  {
    "name": "Simulated Buyer",
    "email": "sim_buyer@asamed.com",
    "password": "securepassword123",
    "role": "BUYER"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "User created successfully",
    "user": {
      "id": "cmpzn4su70007swi4iw5gikl0",
      "name": "Simulated Buyer",
      "email": "sim_buyer@asamed.com",
      "role": "BUYER",
      "createdAt": "2026-06-03T06:05:00.000Z"
    }
  }
  ```

---

### C. Delete User
Remove a user profile. Automatically transactionally cascade deletes all of their associated data (products, orders, and items) to preserve database foreign key integrity. Admins are blocked from deleting their own accounts.

- **URL**: `/api/admin/users/:id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <jwt_token>` (or authenticated via cookie)
- **Response `200 OK`**:
  ```json
  {
    "message": "User and all associated data deleted successfully"
  }
  ```
- **Response `400 Bad Request` (Self-Deletion Protection)**:
  ```json
  {
    "error": "Forbidden: You cannot delete your own admin account"
  }
  ```

---

## 2. Product Deletion API

This endpoint allows an `ADMIN`, or the `SELLER` who listed the product, to remove it from the catalog.

### Delete Product
Removes a product from the database catalog and cascade deletes referencing order items.

- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <jwt_token>` (or authenticated via cookie)
- **Response `200 OK`**:
  ```json
  {
    "message": "Product deleted successfully"
  }
  ```
- **Response `403 Forbidden` (Unauthorized Seller)**:
  ```json
  {
    "error": "Forbidden: You do not have permission to delete this product"
  }
  ```
