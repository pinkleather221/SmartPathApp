I will implement the **AI Tutor Assistant** feature, which provides 24/7 homework help with contextual explanations. This will be a conversational interface where students can ask questions and receive guidance.

### **Backend Implementation**
1.  **Update `backend/models.py`**:
    -   Add `ChatMessage` (role, content) and `ChatRequest` (message, history, subject context) models to structure the API data.
2.  **Update `backend/llm_service.py`**:
    -   Add a `chat_with_tutor` method that constructs a conversation prompt for Gemini, maintaining the persona of a helpful Kenyan tutor.
3.  **Update `backend/main.py`**:
    -   Create a `POST /api/v1/chat/send` endpoint that handles the chat request and returns the AI's response.

### **Frontend Implementation**
1.  **Update `frontend/src/lib/api.ts`**:
    -   Add `chatApi` to handle communication with the new chat endpoint.
2.  **Create `frontend/src/pages/AiTutor.tsx`**:
    -   Build a full-page chat interface with:
        -   Message history view (User vs. AI bubbles).
        -   Input area for typing questions.
        -   Markdown and LaTeX support (for math formulas).
        -   Subject selection context (optional).
3.  **Update Navigation**:
    -   Add "AI Tutor" to the sidebar in `DashboardLayout.tsx`.
    -   Register the route `/ai-tutor` in `App.tsx`.
