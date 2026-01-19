To address your concerns about admin security and production storage:

### **1. Admin Security & Credentials**
-   **Security**: The `/api/v1/resources` write endpoints are already protected by `require_user_type("admin")`. This relies on the JWT token containing the correct user role.
-   **Credentials**: I will add a **Database Seeding Script** (`backend/seed_admin.py`) that creates a default Super Admin user securely. This ensures you have immediate, secure access without manual database hacking.
-   **Role Verification**: I will add a strict check in the frontend to redirect non-admin users away from the `/admin/resources` page, in addition to the backend enforcement.

### **2. Production Storage Strategy**
-   **Current (Dev)**: Local filesystem (`./uploads`) served via FastAPI `StaticFiles`.
-   **Production (Plan)**: Storing user uploads on the app server's disk is **not** scalable or persistent across deployments (e.g., Vercel/Heroku).
-   **Solution**: I will implement a **Supabase Storage** adapter.
    -   Files will be uploaded directly to a Supabase Storage bucket (`resource-files`).
    -   The backend will store the permanent public URL.
    -   This is cloud-native, scalable, and works perfectly for production.

### **Revised Implementation Plan**

#### **Phase 1: Secure Admin Access**
1.  **Seed Script**: Create `backend/seed_admin.py` to generate an admin user (`admin@smartpath.app` / secure password).
2.  **Frontend Protection**: Add a `RequireAdmin` wrapper component to secure the route client-side.

#### **Phase 2: Cloud Storage (Supabase)**
1.  **Storage Service**: Create `backend/storage_service.py` with an abstract interface.
    -   Implement `SupabaseStorageProvider` (preferred for prod).
    -   Keep `LocalStorageProvider` for dev fallback.
2.  **Upload Endpoint**: Implement `POST /api/v1/resources/upload` that delegates to the active storage provider.

#### **Phase 3: Frontend Integration**
1.  **File Upload**: Update `AdminResourceManage.tsx` to upload the file first, get the Supabase URL, then create the resource record.

This approach solves the security question (seeded admin + strict role checks) and the production storage question (offloading to Supabase Storage).
