# AsaMed API Documentation - Products & Unit Conversions (Step 3)

This document covers the specifications for the Products API endpoints and explains the server-side unit storage and conversion strategy.

---

## Storage & Conversion Architecture (Server-Side Enforcement)

To maintain inventory integrity and prevent mathematical scaling errors, **we do not trust any conversions calculated by the client**.

1.  **Smallest Base Unit Storage**: All products are stored in the database in their smallest base dimensions:
    *   **Weight-based products** (e.g., entered in `g` or `kg`) are saved and tracked in **Grams (`GRAM`)**.
    *   **Volume-based products** (e.g., entered in `mL` or `L`) are saved and tracked in **Milliliters (`MILLILITER`)**.
    *   **Count-based products** (e.g., entered in `items`) are saved and tracked in **Items (`ITEM`)**.

2.  **Server-Side Conversions**:
    *   When listing a product via `POST /api/products`, the client submits the raw details: `inputUnit`, `inputQuantity`, and `inputPrice`.
    *   The server determines the base unit of the dimension group and executes the conversions (`convertQuantityToBase` and `convertPriceToBase`) directly on the backend before writing to the database.
    *   This ensures that no tampered or incorrect values from the client are saved.

---

## API Reference

### 1. List a Product (Sellers & Admins Only)
Creates a new chemical/product listing. Conversions are enforced on the server.

*   **URL:** `/api/products`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <token>` (or authenticated via HTTP-only cookie)
*   **Request Body (JSON):**
    ```json
    {
      "name": "Ethanol 99%",
      "sku": "ETH-99-L",
      "description": "High purity lab grade ethanol",
      "inputUnit": "LITER",
      "inputQuantity": 25,
      "inputPrice": 450
    }
    ```
    *Note: `inputUnit` must be one of `GRAM`, `KILOGRAM`, `MILLILITER`, `LITER`, or `ITEM`.*

*   **Server Processing**:
    *   Target unit is detected as volume-based. Base unit sets to `MILLILITER`.
    *   Stock quantity stored: `25 L` * `1000` = `25000 mL`.
    *   Price stored: `₹450` / `1000` = `₹0.45` per mL.

*   **Responses:**
    *   **201 Created (Success):**
        ```json
        {
          "message": "Product listed successfully",
          "product": {
            "id": "cm123...",
            "name": "Ethanol 99%",
            "sku": "ETH-99-L",
            "description": "High purity lab grade ethanol",
            "baseUnit": "MILLILITER",
            "stockQuantity": "25000",
            "basePrice": "0.45",
            "createdAt": "2026-06-03T10:50:00.000Z",
            "updatedAt": "2026-06-03T10:50:00.000Z"
          }
        }
        ```

---

### 2. Fetch/Browse Catalog
Retrieves listed products with support for real-time query searching.

*   **URL:** `/api/products?search=<query>`
*   **Method:** `GET`

*   **Responses:**
    *   **200 OK (Success):**
        ```json
        {
          "products": [
            {
              "id": "cm123...",
              "name": "Ethanol 99%",
              "sku": "ETH-99-L",
              "description": "High purity lab grade ethanol",
              "baseUnit": "MILLILITER",
              "stockQuantity": "25000",
              "basePrice": "0.45",
              "createdAt": "2026-06-03T10:50:00.000Z",
              "updatedAt": "2026-06-03T10:50:00.000Z"
            }
          ]
        }
        ```
