export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: "Student" | "Instructor" | "Admin";
  town?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
