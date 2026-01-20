To implement email notifications and password reset functionality, we need to build the infrastructure from scratch, as it is currently missing.

### **1. Backend Implementation**
1.  **Add Dependencies**: Install `fastapi-mail` for handling email operations.
2.  **Update Configuration**:
    -   Modify `backend/config.py` to include SMTP settings (Host, Port, User, Password).
3.  **Update Database Schema**:
    -   Modify `backend/supabase_db.py` to add `reset_token` and `reset_token_expires` columns to the `users` table.
4.  **Create Email Service**:
    -   Create `backend/email_service.py` to handle sending:
        -   Welcome emails (on registration).
        -   Password reset emails (with a secure link).
5.  **Update Auth Logic**:
    -   Update `backend/auth.py` to generate secure, time-limited reset tokens.
6.  **Create API Endpoints**:
    -   Add `POST /auth/forgot-password`: Generates a token and sends the email.
    -   Add `POST /auth/reset-password`: Verifies the token and updates the password.
    -   Update `POST /auth/register` to trigger the welcome email.

### **2. Frontend Integration**
1.  **Update API Client**:
    -   Add `authApi.forgotPassword` and `authApi.resetPassword` methods to `frontend/src/lib/api.ts`.
2.  **Enhance Pages**:
    -   Update `ForgotPassword.tsx` to call the new API and show success/error messages.
    -   Create `ResetPassword.tsx` (new page) to handle the token from the email link and allow setting a new password.

### **3. Verification**
-   Test the full flow: Register -> Receive Welcome Email -> Request Reset -> Receive Reset Link -> Change Password -> Login with new password.
