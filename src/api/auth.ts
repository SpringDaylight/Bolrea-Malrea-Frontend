/**
 * Authentication API
 */
import { get, post } from './http';

export interface KakaoLoginResponse {
  auth_url: string;
}

export interface KakaoCallbackResponse {
  id?: string;
  user_id?: string | null;
  name: string;
  nickname?: string | null;
  email?: string | null;
  avatar_text: string;
  access_token: string;
}

export interface SignupRequest {
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginRequest {
  user_id: string;
  password: string;
}

export interface AuthUserResponse {
  id: string;
  user_id: string;
  name: string;
  nickname: string;
  email: string;
  avatar_text?: string;
  created_at: string;
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
 * Local signup
 */
export function signup(data: SignupRequest): Promise<AuthUserResponse> {
  return post<AuthUserResponse>('/api/auth/signup', data);
}

/**
 * Local login
 */
export function login(data: LoginRequest): Promise<AuthUserResponse> {
  return post<AuthUserResponse>('/api/auth/login', data);
}

/**
 * Logout
 */
export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/api/auth/logout');
}
