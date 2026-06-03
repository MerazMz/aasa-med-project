# AsaMed API Documentation - Quotation & Ordering Flow (Step 4)

This document covers the specifications for the Orders & Quotations API endpoints and details the server-side audit calculations.

---

## Server-Side Verification Strategy
To eliminate fraudulent pricing or quantities from the client-side:
1.  **Item Inputs Only**: The client submits only the target `productId`, `orderedQuantity`, and `orderedUnit`. 
2.  **Server Calculation**:
    *   The server queries the product base unit and price from the database.
    *   The server checks compatibility (e.g. you cannot order a weight-based product in liters).
    *   The server calculates the price per ordered unit (`basePrice * conversionFactor`) and converts the requested quantity to the database base unit.
    *   The server performs stock checking against the database `stockQuantity` (in base units) to prevent overselling.
    *   Calculates the subtotal and order grand total.
3.  **Atomicity**: Stock deduction and order registration are performed inside a database transaction (`prisma.$transaction`).
4.  **Stock Refund**: If an order status is updated to `REJECTED`, the stock is atomically returned to the product inventory.

---

## API Reference

### 1. Place a Quotation
Submits a cart of selected chemicals.

*   **URL:** `/api/orders`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <token>` (or HTTP-only cookie)
*   **Request Body (JSON):**
    ```json
    {
      "items": [
        {
          "productId": "cm123...",
          "orderedQuantity": 5,
          "orderedUnit": "KILOGRAM"
        }
      ]
    }
    ```

*   **Responses:**
    *   **201 Created (Success):**
        ```json
        {
          "message": "Order/Quotation placed successfully",
          "order": {
            "id": "cmo456...",
            "userId": "cm123...",
            "totalAmount": 2500,
            "status": "PENDING",
            "createdAt": "2026-06-03T11:00:00.000Z",
            "items": [
              {
                "id": "cmoi789...",
                "productId": "cm123...",
                "orderedQuantity": 5,
                "orderedUnit": "KILOGRAM",
                "convertedQuantity": 5000,
                "pricePerUnit": 500,
                "subtotal": 2500
              }
            ]
          }
        }
        ```
    *   **400 Bad Request (Insufficient Stock / Invalid Units):**
        ```json
        {
          "error": "Insufficient stock for \"Ethanol 99%\": Available 3000 base units, requested 5000 base units"
        }
        ```

---

### 2. Fetch Orders List
Returns a list of quotations.

*   **URL:** `/api/orders`
*   **Method:** `GET`
*   **Authorization**: Bearer Token or Cookie session.
*   **Access Rules**:
    *   **Admin/Seller**: Returns all orders in the system with user details.
    *   **Buyer**: Returns only the orders placed by the current user.

*   **Responses:**
    *   **200 OK (Success):**
        ```json
        {
          "orders": [
            {
              "id": "cmo456...",
              "totalAmount": "2500.00000000",
              "status": "PENDING",
              "createdAt": "2026-06-03T11:00:00.000Z",
              "user": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "role": "BUYER"
              },
              "items": [
                {
                  "id": "cmoi789...",
                  "orderedQuantity": "5.00000000",
                  "orderedUnit": "KILOGRAM",
                  "convertedQuantity": "5000.00000000",
                  "pricePerUnit": "500.00000000",
                  "subtotal": "2500.00000000",
                  "product": {
                    "name": "Ethanol 99%",
                    "sku": "ETH-99-L"
                  }
                }
              ]
            }
          ]
        }
        ```

---

### 3. Update Order Status (Admins & Sellers Only)
Updates the state of a quotation/order.

*   **URL:** `/api/orders/[id]`
*   **Method:** `PATCH`
*   **Request Body (JSON):**
    ```json
    {
      "status": "APPROVED"
    }
    ```
    *Note: `status` must be one of `PENDING`, `APPROVED`, `REJECTED`, or `COMPLETED`.*

*   **Responses:**
    *   **200 OK (Success):**
        ```json
        {
          "message": "Order status updated to APPROVED",
          "order": {
            "id": "cmo456...",
            "status": "APPROVED",
            "totalAmount": "2500.00000000",
            ...
          }
        }
        ```
