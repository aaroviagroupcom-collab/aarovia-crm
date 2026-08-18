import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole =
  | 'SUPER_ADMIN' | 'ADMIN' | 'SALES_MANAGER' | 'TEAM_LEADER'
  | 'SALES_EXECUTIVE' | 'POST_SALES_EXECUTIVE' | 'ACCOUNTS' | 'MARKETING' | 'CHANNEL_PARTNER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('aarovia_token', token);
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('aarovia_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
    }),
    {
      name: 'aarovia-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SALES_MANAGER: 'Sales Manager',
  TEAM_LEADER: 'Team Leader',
  SALES_EXECUTIVE: 'Sales Executive',
  POST_SALES_EXECUTIVE: 'Post Sales Executive',
  ACCOUNTS: 'Accounts',
  MARKETING: 'Marketing',
  CHANNEL_PARTNER: 'Channel Partner',
};

export const canAccess = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 9, ADMIN: 8, SALES_MANAGER: 7, TEAM_LEADER: 6,
  SALES_EXECUTIVE: 5, POST_SALES_EXECUTIVE: 4, ACCOUNTS: 3, MARKETING: 2, CHANNEL_PARTNER: 1,
};

export const hasMinRole = (userRole: UserRole, minRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
};
