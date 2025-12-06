/**
 * API client for SmartPath backend
 * Handles all API communication with authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface ApiResponse<T> {
  data?: T;
  message?: string;
  success?: boolean;
  detail?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    console.log(`[API] Initialized with base URL: ${baseURL}`); // Debug log
    // Load token from localStorage on initialization - try both key names
    this.token = localStorage.getItem("smartpath_access_token") || localStorage.getItem("auth_token");
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("smartpath_access_token", token);
      localStorage.setItem("auth_token", token); // Keep both for compatibility
    } else {
      localStorage.removeItem("smartpath_access_token");
      localStorage.removeItem("auth_token");
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token || localStorage.getItem("smartpath_access_token") || localStorage.getItem("auth_token");
  }

  /**
   * Build full URL
   */
  private buildURL(endpoint: string): string {
    return `${this.baseURL}${endpoint}`;
  }

  /**
   * Get headers with authentication
   */
  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (includeAuth && this.getToken()) {
      headers["Authorization"] = `Bearer ${this.getToken()}`;
    }

    return headers;
  }

  /**
   * Handle API response (made public for uploadFile)
   */
  async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    let data: ApiResponse<T> | T;

    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch (error) {
        console.error("[API] Failed to parse JSON response:", error);
        throw new Error("Invalid JSON response from server");
      }
    } else {
      const text = await response.text();
      console.error(`[API] Non-JSON response (${contentType}):`, text);
      throw new Error(text || "Unknown error");
    }

    if (!response.ok) {
      const error = (data as ApiResponse<T>).detail || (data as ApiResponse<T>).message || `Request failed with status ${response.status}`;
      console.error(`[API] Error response (${response.status}):`, data);
      throw new Error(error);
    }

    // Handle different response structures
    if ((data as ApiResponse<T>).data !== undefined) {
      return (data as ApiResponse<T>).data as T;
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    try {
      let url = this.buildURL(endpoint);

      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        url += `?${searchParams.toString()}`;
      }

      console.log(`[API] GET ${url}`); // Debug log
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: this.getHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return this.handleResponse<T>(response);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error("Request timeout - The server is taking too long to respond");
        }
        throw error;
      }
    } catch (error) {
      console.error(`[API] GET Error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> {
    try {
      const url = this.buildURL(endpoint);
      console.log(`[API] POST ${url}`, data); // Debug log

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: this.getHeaders(includeAuth),
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return this.handleResponse<T>(response);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error("Request timeout - The server is taking too long to respond");
        }
        throw error;
      }
    } catch (error) {
      console.error(`[API] POST Error for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(this.buildURL(endpoint), {
      method: "PUT",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(this.buildURL(endpoint), {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Upload file
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {};
    if (this.getToken()) {
      headers["Authorization"] = `Bearer ${this.getToken()}`;
    }
    // Don't set Content-Type - let browser set it with boundary for FormData

    const response = await fetch(this.buildURL(endpoint), {
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// API endpoints
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    user_type: string;
    grade_level?: number;
    curriculum_type: string;
  }) => apiClient.post<{ user_id: number }>("/auth/register", data, false),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ access_token: string; token_type: string; expires_in: number }>(
      "/auth/login",
      data,
      false
    ),

  getProfile: () => apiClient.get<{
    user_id: number;
    email: string;
    full_name: string;
    user_type: string;
    grade_level?: number;
    curriculum_type: string;
    phone_number?: string;
    school_name?: string;
  }>("/auth/profile"),

  updateProfile: (data: {
    full_name?: string;
    phone_number?: string;
    school_name?: string;
    grade_level?: number;
    curriculum_type?: string;
  }) => apiClient.put<{
    user_id: number;
    email: string;
    full_name: string;
    user_type: string;
    grade_level?: number;
    curriculum_type: string;
    phone_number?: string;
    school_name?: string;
  }>("/auth/profile", data),
};

export const reportsApi = {
  previewOCR: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    const token = apiClient.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/reports/ocr-preview`;
    console.log(`[API] Previewing OCR for file`, { fileName: file.name, fileSize: file.size });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for OCR

    return fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        console.log(`[API] OCR Preview response status: ${response.status}`);
        return apiClient.handleResponse<{
          extracted_text: string;
          grades: Record<string, string>;
          success: boolean;
          message: string;
        }>(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error("OCR timeout - The server is taking too long to process the file");
        }
        console.error(`[API] OCR Preview Error:`, error);
        throw error;
      });
  },

  uploadFile: (file: File, term: string, year: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("term", term);
    formData.append("year", String(year));
    // Backend expects report_date - use current date
    formData.append("report_date", new Date().toISOString());

    const headers: HeadersInit = {};
    const token = apiClient.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/reports/upload`;
    console.log(`[API] Uploading file to ${url}`, { term, year, fileSize: file.size });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for file uploads

    return fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        console.log(`[API] Upload response status: ${response.status}`);
        return apiClient.handleResponse(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error("Upload timeout - The server is taking too long to respond");
        }
        console.error(`[API] Upload Error:`, error);
        throw error;
      });
  },

  uploadJSON: (data: {
    term: string;
    year: number;
    report_date: string;
    grades_json: Record<string, string>;
  }) => apiClient.post("/reports/upload-json", data),

  getHistory: (limit?: number) => apiClient.get("/reports/history", limit ? { limit } : undefined),

  getById: (reportId: number) => {
    // Get report from history and filter by ID
    return apiClient.get("/reports/history").then((reports: unknown[]) => {
      const reportsArray = reports as Array<{ report_id: number }>;
      return reportsArray.find((r) => r.report_id === reportId);
    });
  },

  analyze: (reportId: number) => apiClient.post(`/reports/analyze?report_id=${reportId}`, {}),
  
  delete: (reportId: number) => apiClient.delete(`/reports/${reportId}`),
};

export const performanceApi = {
  getDashboard: () => apiClient.get("/performance/dashboard"),
  getTrends: (subject?: string) =>
    apiClient.get("/performance/trends", subject ? { subject } : undefined),
  getPredictions: () => apiClient.get("/performance/predictions"),
};

export const flashcardsApi = {
  generate: (data: { subject: string; topic: string; count: number; grade_level?: number }) =>
    apiClient.post("/flashcards/generate", data),

  list: (params?: { subject?: string; difficulty?: string; limit?: number }) =>
    apiClient.get("/flashcards/list", params),

  review: (cardId: number, data: { correct: boolean; user_answer?: string }) =>
    apiClient.post(`/flashcards/${cardId}/review`, data),

  evaluate: (cardId: number, data: { user_answer: string }) =>
    apiClient.post(`/flashcards/${cardId}/evaluate`, data),

  delete: (cardId: number) => apiClient.delete(`/flashcards/${cardId}`),
};

export const careerApi = {
  getRecommendations: () => apiClient.get("/career/recommendations"),
  quiz: (data: {
    interests: string[];
    preferred_subjects: string[];
    career_goals?: string;
    work_environment?: string;
  }) => apiClient.post("/career/quiz", data),
  getDetails: (recommendationId: number) =>
    apiClient.get(`/career/${recommendationId}/details`),
};

export const studyPlansApi = {
  generate: (data: {
    subjects: string[];
    available_hours_per_day: number;
    exam_date: string;
    focus_areas?: Record<string, string[]>;
  }) => apiClient.post("/study-plans/generate", data),

  getActive: () => apiClient.get("/study-plans/active"),

  getById: (planId: number) => {
    // Get active plans and filter by ID
    return apiClient.get("/study-plans/active").then((plans: unknown[]) => {
      const plansArray = plans as Array<{ plan_id: number }>;
      return plansArray.find((p) => p.plan_id === planId);
    });
  },

  update: (planId: number, data: { is_active?: boolean; completed_topics?: string[] }) =>
    apiClient.put(`/study-plans/${planId}/update`, data),

  delete: (planId: number) => apiClient.delete(`/study-plans/${planId}`),

  logSession: (planId: number, data: {
    subject: string;
    duration_minutes: number;
    completed: boolean;
    topics_covered?: string[];
  }) => apiClient.post(`/study-plans/${planId}/log-session`, data),
};

export const insightsApi = {
  getFeedback: () => apiClient.get("/insights/feedback"),
  getLearningTips: (limit?: number) =>
    apiClient.get("/insights/learning-tips", limit ? { limit } : undefined),
  getAcademicAnalysis: () => apiClient.get("/insights/academic-analysis"),
  getById: (insightId: number) => {
    // Get insights and filter by ID
    return apiClient.get("/insights/academic-analysis").then((insights: unknown[]) => {
      const insightsArray = insights as Array<{ insight_id: number }>;
      return insightsArray.find((i) => i.insight_id === insightId);
    });
  },
};

export default apiClient;

