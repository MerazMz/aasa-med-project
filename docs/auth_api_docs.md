# AsaMed API Documentation - Authentication (Step 2)

This document provides a reference for the authentication API endpoints implemented in Step 2 of the AsaMed Hackathon Assignment. These endpoints allow you to register users, log in, fetch the active profile, and log out.

You can import these specifications directly into **Postman** to test the API locally or in production.

---

## Base URL
*   Local Development: `http://localhost:3000`
*   Headers: All POST requests require `Content-Type: application/json`

---

## API Reference

### 1. User Registration (Signup)
Creates a new user profile with a specific role (`ADMIN`, `SELLER`, or `BUYER`).

*   **URL:** `/api/auth/register`
*   **Method:** `POST`
*   **Request Body (JSON):**
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "password": "securepassword123",
      "role": "SELLER"
    }
    ```
    *Note: `role` must be one of `ADMIN`, `SELLER`, or `BUYER`.*

*   **Responses:**
    *   **201 Created (Success):**
        ```json
        {
          "message": "Registration successful",
          "user": {
            "id": "cm12345...",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "role": "SELLER",
            "createdAt": "2026-06-03T10:30:00.000Z"
          }
        }
        ```
    *   **400 Bad Request (Validation failed):**
        ```json
        {
          "error": "Validation failed",
          "details": {
            "email": ["Invalid email address"],
            "password": ["Password must be at least 6 characters"]
          }
        }
        ```
    *   **400 Bad Request (Email exists):**
        ```json
        {
          "error": "User with this email already exists"
        }
        ```

---

### 2. User Login
Authenticates a user, sets an HTTP-only session cookie (`auth-token`), and returns a JWT token for standard API consumption.

*   **URL:** `/api/auth/login`
*   **Method:** `POST`
*   **Request Body (JSON):**
    ```json
    {
      "email": "jane@example.com",
      "password": "securepassword123"
    }
    ```

*   **Responses:**
    *   **200 OK (Success):**
        *Sets Cookie:* `auth-token=eyJhbG...; Path=/; HttpOnly; SameSite=Strict`
        ```json
        {
          "message": "Login successful",
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "user": {
            "id": "cm12345...",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "role": "SELLER"
          }
        }
        ```
    *   **401 Unauthorized (Invalid credentials):**
        ```json
        {
          "error": "Invalid email or password"
        }
        ```

---

### 3. Get Current User Profile (Session Check)
Returns profile information for the currently logged-in user. Supports authentication via cookie or Authorization header.

*   **URL:** `/api/auth/me`
*   **Method:** `GET`
*   **Headers (for Postman/API tests):**
    *   `Authorization: Bearer <token_received_from_login>`

*   **Responses:**
    *   **200 OK (Success):**
        ```json
        {
          "user": {
            "id": "cm12345...",
            "name": "Jane Doe",
            "email": "jane@example.com",
            "role": "SELLER",
            "createdAt": "2026-06-03T10:30:00.000Z"
          }
        }
        ```
    *   **401 Unauthorized (Missing or invalid token):**
        ```json
        {
          "error": "Unauthorized: No token provided"
        }
        ```

---

### 4. Logout
Clears the session cookie.

*   **URL:** `/api/auth/logout`
*   **Method:** `POST`

*   **Responses:**
    *   **200 OK (Success):**
        *Clears Cookie:* `auth-token=; Max-Age=0; Path=/`
        ```json
        {
          "message": "Logout successful"
        }
        ```

---

## How to Test in Postman

1.  **Register a User**:
    *   Set method to `POST` and URL to `http://localhost:3000/api/auth/register`.
    *   Select **Body** -> **raw** -> **JSON**.
    *   Enter the registration details and click **Send**.

2.  **Log In**:
    *   Set method to `POST` and URL to `http://localhost:3000/api/auth/login`.
    *   Use the email and password you registered.
    *   Click **Send**. 
    *   Copy the `"token"` value from the response body.

3.  **Get Profile Details**:
    *   Set method to `GET` and URL to `http://localhost:3000/api/auth/me`.
    *   Go to the **Authorization** tab.
    *   Set the Type to **Bearer Token**.
    *   Paste the copied token into the **Token** field and click **Send**.
