/**
 * Authentication API
 */
import { get, post } from './http';

export interface KakaoLoginResponse {
  auth_url: string;
}

export interface KakaoCallbackResponse {
  user_id: string;
  name: string;
  avatar_text: string;
  access_token: string;
}

/**
 * Get Kakao OAuth login URL
 */
export function getKakaoLoginUrl(): Promise<KakaoLoginResponse> {
  return get<KakaoLoginResponse>('/api/auth/kakao/login');
}

/**
 * Handle Kakao OAuth callback
 */
export function handleKakaoCallback(code: string): Promise<KakaoCallbackResponse> {
  return get<KakaoCallbackResponse>('/api/auth/kakao/callback', { code });
}

/**
 * Logout
 */
export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/api/auth/logout');
}