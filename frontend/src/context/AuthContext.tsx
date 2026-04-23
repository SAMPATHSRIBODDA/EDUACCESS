import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  memberId?: number;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'college';
  regId: string;
  avatar?: string;
  phone?: string;
  branch?: string;
  course?: string;
  year?: string;
  collegeEmail?: string;
};

const normalizeAvatar = (avatar?: string) => {
  const value = String(avatar || '').trim();
  if (!value || value === 'undefined' || value === 'null') {
    return '';
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image/') ||
    value.startsWith('/')
  ) {
    return value;
  }

  return '';
};

const decodePictureFromGoogleToken = (token?: string) => {
  const rawToken = String(token || '').trim();
  if (!rawToken || !rawToken.includes('.')) {
    return '';
  }

  try {
    const payload = rawToken.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = JSON.parse(atob(padded));
    return normalizeAvatar(String(decoded?.picture || ''));
  } catch {
    return '';
  }
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  checkAuth: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    const storedToken = localStorage.getItem('authToken');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        const gmailAvatar = decodePictureFromGoogleToken(storedToken);
        const normalizedUser = {
          ...parsedUser,
          avatar: gmailAvatar || normalizeAvatar(parsedUser.avatar),
        };
        setUser(normalizedUser);
        setToken(storedToken);

        // Keep local cache aligned with the latest Gmail avatar value.
        localStorage.setItem('authUser', JSON.stringify(normalizedUser));
      } catch (error) {
        console.error('Failed to parse stored auth:', error);
        localStorage.removeItem('authUser');
        localStorage.removeItem('authToken');
      }
    }

    setLoading(false);
  }, []);

  const login = (userData: User, authToken: string) => {
    const gmailAvatar = decodePictureFromGoogleToken(authToken);
    const normalizedUser = {
      ...userData,
      avatar: gmailAvatar || normalizeAvatar(userData.avatar),
    };
    setUser(normalizedUser);
    setToken(authToken);
    localStorage.setItem('authUser', JSON.stringify(normalizedUser));
    localStorage.setItem('authToken', authToken);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser = {
        ...current,
        ...updates,
        avatar: normalizeAvatar(updates.avatar ?? current.avatar),
      };
      localStorage.setItem('authUser', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  };

  const checkAuth = () => {
    const storedUser = localStorage.getItem('authUser');
    const storedToken = localStorage.getItem('authToken');

    if (!storedUser || !storedToken) {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        updateUser,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
