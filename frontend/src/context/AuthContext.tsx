import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthUser {
  id:   string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

interface AuthContextType {
  user:         AuthUser | null;
  accessToken:  string | null;
  login:        (tokens: { accessToken: string; refreshToken: string }, user: AuthUser) => void;
  logout:       () => void;
  isLoading:    boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  // Hydrate from localStorage on first load
  useEffect(() => {
    console.log('[AuthContext] Hydrating auth state from localStorage...');
    const storedToken = localStorage.getItem('accessToken');
    const storedUser  = localStorage.getItem('user');
    console.log('[AuthContext] Stored token:', storedToken ? 'EXISTS' : 'NOT FOUND');
    console.log('[AuthContext] Stored user:', storedUser ? 'EXISTS' : 'NOT FOUND');
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      console.log('[AuthContext] Auth state restored');
    }
    setIsLoading(false);
    console.log('[AuthContext] Hydration complete, isLoading:', false);
  }, []);

  const login = (tokens: { accessToken: string; refreshToken: string }, userData: AuthUser) => {
    localStorage.setItem('accessToken',  tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user',         JSON.stringify(userData));
    setAccessToken(tokens.accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
