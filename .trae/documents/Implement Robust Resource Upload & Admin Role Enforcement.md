To improve the resource management system and make it production-ready, I will implement robust file uploading, secure storage integration, and proper admin role enforcement.

### **1. Backend Enhancements**
1.  **File Upload Endpoint**:
    -   Create a dedicated endpoint `POST /api/v1/resources/upload` in `backend/main.py` that handles multipart file uploads.
    -   Use `shutil` or `aiofiles` to save files securely to the configured `UPLOAD_DIR` (local for now, adaptable to S3/Supabase).
    -   Generate and return a public URL for the uploaded file.
    -   Validate file types (PDF, MP4, etc.) and size limits (10MB default).
2.  **Resource Creation Update**:
    -   Update the existing `POST /api/v1/resources` endpoint to accept the file URL returned from the upload step.
    -   Ensure `require_user_type("admin")` is strictly enforced.
3.  **Role Management**:
    -   Add a database migration (SQL) or seed script to ensure an admin user exists or can be created easily.
    -   Verify `auth.py` logic handles the admin role correctly.

### **2. Frontend Improvements**
1.  **Admin Upload UI**:
    -   Update `frontend/src/pages/AdminResourceManage.tsx` to replace the "Content URL" text input with a real file picker.
    -   Implement a two-step process:
        1.  Upload file -> Get URL.
        2.  Submit resource metadata with URL.
    -   Add progress indicators for the upload.
2.  **API Client Update**:
    -   Add `resourcesApi.upload` method to `frontend/src/lib/api.ts` to handle the multipart request.

### **3. Database & Storage**
1.  **Storage**: Ensure the `uploads` directory is served correctly via `StaticFiles` in `main.py` (already present, but verify path).
2.  **Schema**: The `resources` table already has `content_url`, so no schema changes are needed for this, but we will ensure valid data is stored.

### **Verification Plan**
-   **Test Upload**: Upload a sample PDF via the admin page and verify it appears in the `uploads` folder.
-   **Test Access**: Verify the file URL is accessible in the browser.
-   **Test Permissions**: Try to upload as a "student" user and confirm it fails (403 Forbidden).
