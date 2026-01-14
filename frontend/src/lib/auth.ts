/**
 * Authentication utilities
 */
import { apiClient, authApi } from "./api";

export interface User {
  user_id: number;
  email: string;
  full_name: string;
  user_type: string;
  grade_level?: number;
  curriculum_type: string;
  profile_picture?: string;
}

/**
 * Login user and store token
 */
export async function login(email: string, password: string): Promise<void> {
  const response = await authApi.login({ email, password });
  apiClient.setToken(response.access_token);
}

/**
 * Register new user
 */
export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  user_type: string;
  grade_level?: number;
  curriculum_type: string;
}): Promise<{ user_id: number }> {
  return authApi.register(data);
}

/**
 * Logout user
 */
export function logout(): void {
  apiClient.setToken(null);
  localStorage.removeItem("auth_token");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!apiClient.getToken();
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return authApi.getProfile();
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  return apiClient.getToken();
}

