"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { adminLogin, adminSignup, LoginPayload, SignupPayload } from "@/services/api";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    organizationName?: string;
}

interface AuthContextValue {
    user: AdminUser | null;
    token: string | null;
    isLoading: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    signup: (payload: SignupPayload) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Hydrate from localStorage on client boot
    useEffect(() => {
        const stored = localStorage.getItem("token");
        const storedUser = localStorage.getItem("admin_user");
        if (stored) setToken(stored);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                // ignore corrupt data
            }
        }
        setIsLoading(false);
    }, []);

    const persist = (tok: string, admin?: AdminUser | null) => {
        localStorage.setItem("token", tok);
        setToken(tok);
        if (admin) {
            localStorage.setItem("admin_user", JSON.stringify(admin));
            setUser(admin);
        }
    };

    const login = useCallback(async (payload: LoginPayload) => {
        const { data } = await adminLogin(payload);
        // Backend returns 'accessToken', frontend stores as 'token'
        const token = (data as any).accessToken || data.token;
        persist(token, data.admin ?? null);
    }, []);

    const signup = useCallback(async (payload: SignupPayload) => {
        const { data } = await adminSignup(payload);
        // Backend returns 'accessToken', frontend stores as 'token'
        const token = (data as any).accessToken || data.token;
        persist(token, data.admin ?? null);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("admin_user");
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext value={{ user, token, isLoading, login, signup, logout }}>
            {children}
        </AuthContext>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
