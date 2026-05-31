"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { adminLogin, adminSignup, LoginPayload, SignupPayload } from "@/services/api";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    organizationName?: string;
    organizationSlug?: string;
    plan?: string;
    organization?: {
        id?: string;
        name?: string;
        slug?: string;
        plan?: string;
    };
}

interface AuthContextValue {
    user: AdminUser | null;
    token: string | null;
    isLoading: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    signup: (payload: SignupPayload) => Promise<void>;
    logout: () => void;
    hasPlan: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeToken = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;

    // Accept either raw JWT or "Bearer <jwt>" and persist raw token only.
    const withoutBearer = trimmed.replace(/^Bearer\s+/i, "").trim();
    if (!withoutBearer || withoutBearer === "undefined" || withoutBearer === "null") return null;
    return withoutBearer;
};

const extractAuthToken = (payload: { token?: string; accessToken?: string }): string | null => {
    return normalizeToken(payload.accessToken) ?? normalizeToken(payload.token);
};

const normalizeAdminUser = (admin?: AdminUser | null): AdminUser | null => {
    if (!admin) return null;
    return {
        ...admin,
        organizationName: admin.organizationName ?? admin.organization?.name,
        organizationSlug: admin.organizationSlug ?? admin.organization?.slug,
        plan: admin.plan ?? admin.organization?.plan,
    };
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return normalizeToken(localStorage.getItem("token"));
    });
    const [user, setUser] = useState<AdminUser | null>(() => {
        if (typeof window === "undefined") return null;
        const storedUser = localStorage.getItem("admin_user");
        if (!storedUser) return null;
        try {
            return normalizeAdminUser(JSON.parse(storedUser));
        } catch {
            return null;
        }
    });
    const isLoading = false;

    const persist = (tok: string, admin?: AdminUser | null) => {
        const normalized = normalizeToken(tok);
        if (!normalized) {
            throw new Error("Authentication token missing in server response.");
        }

        localStorage.setItem("token", normalized);
        setToken(normalized);
        if (admin) {
            const normalizedAdmin = normalizeAdminUser(admin);
            localStorage.setItem("admin_user", JSON.stringify(normalizedAdmin));
            setUser(normalizedAdmin);
        }
    };

    const login = useCallback(async (payload: LoginPayload) => {
        const { data } = await adminLogin(payload);
        const token = extractAuthToken(data);
        if (!token) {
            throw new Error("Login succeeded but no access token was returned.");
        }
        persist(token, data.admin ?? null);
    }, []);

    const signup = useCallback(async (payload: SignupPayload) => {
        const { data } = await adminSignup(payload);
        const token = extractAuthToken(data);
        if (!token) {
            throw new Error("Signup succeeded but no access token was returned.");
        }
        persist(token, data.admin ?? null);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("admin_user");
        setToken(null);
        setUser(null);
    }, []);

    const hasPlan = !!user?.plan;

    return (
        <AuthContext value={{ user, token, isLoading, login, signup, logout, hasPlan }}>
            {children}
        </AuthContext>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
