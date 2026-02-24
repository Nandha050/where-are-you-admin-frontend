import axios from "axios";

// Use env base URL when provided; default to relative so browser origin/proxy rewrites are used
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Globally handle auth failures: clear stale tokens and send user back to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const message: string | undefined = error?.response?.data?.message;
        const isAuthError =
            status === 401 &&
            typeof window !== "undefined" &&
            (message?.toLowerCase().includes("invalid") ||
                message?.toLowerCase().includes("expired") ||
                message?.toLowerCase().includes("unauthorized"));

        if (isAuthError) {
            localStorage.removeItem("token");
            localStorage.removeItem("admin_user");

            // Avoid redirect loop if already on the login page
            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface LoginPayload {
    email: string;
    password: string;
}

export interface SignupPayload {
    name: string;
    organizationName: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    admin?: {
        id: string;
        name: string;
        email: string;
        organizationName?: string;
    };
}

export const adminLogin = (data: LoginPayload) =>
    api.post<AuthResponse>("/api/auth/admin/login", data);

export const adminSignup = (data: SignupPayload) =>
    api.post<AuthResponse>("/auth/admin/signup", data);

// ─── Routes ────────────────────────────────────────────────────────────────

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RoutePayload {
    name: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    description?: string;
}

export interface Stop {
    id: string;
    routeId: string;
    name: string;
    latitude: number;
    longitude: number;
    sequenceOrder: number;
    radiusMeters?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Route {
    _id: string;
    name: string;
    description?: string;
    // Flat fields (used in create payload and may be in response)
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    // Nested fields (some backends return these on GET)
    startLocation?: { lat: number; lng: number };
    endLocation?: { lat: number; lng: number };
    stops?: Stop[];
    createdAt?: string;
}

export const getRoutes = () => api.get<Route[] | { routes: Route[] } | { data: Route[] }>("/api/admin/routes");
export const createRoute = (data: RoutePayload) =>
    api.post<Route | { route: Route } | { data: Route }>("/api/admin/routes", data);
export const deleteRoute = (id: string) =>
    api.delete(`/api/admin/routes/${id}`);
export const createStop = (routeId: string, data: { name: string; latitude: number; longitude: number; sequenceOrder?: number; radiusMeters?: number }) =>
    api.post<{ stop: Stop }>(`/api/admin/routes/${routeId}/stops`, data);

export const getStops = (routeId: string) =>
    api.get<{ stops: Stop[] }>(`/api/admin/routes/${routeId}/stops`);

export const deleteStop = (stopId: string) =>
    api.delete(`/api/admin/stops/${stopId}`);

// ─── Buses ─────────────────────────────────────────────────────────────────

export interface Bus {
    _id?: string;
    id?: string;
    numberPlate: string;
    routeName?: string;
    routeId?: string;
    driverId?: string;
    status?: "active" | "inactive";
    trackingStatus?: string;
    currentLat?: number;
    currentLng?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBusPayload {
    numberPlate: string;
    routeName?: string;
}

export interface UpdateBusDriverPayload {
    memberId: string;
}

export interface UpdateBusRoutePayload {
    routeName: string;
}

export interface BusResponse {
    _id: string;
    numberPlate: string;
    routeName?: string;
    routeId?: string;
    driverId?: string;
    status: "active" | "inactive";
    trackingStatus?: string;
    currentLat?: number;
    currentLng?: number;
    createdAt: string;
    updatedAt: string;
}

export const getBuses = () =>
    api.get<{ buses: Bus[] }>("/api/buses");

export const createBus = (data: CreateBusPayload) =>
    api.post<{ bus: BusResponse }>("/api/buses", data);

export const getBusById = (busId: string) =>
    api.get<{ bus: BusResponse }>(`/api/buses/${busId}`);

export const updateBusDriver = (busId: string, data: UpdateBusDriverPayload) =>
    api.put<{ bus: BusResponse }>(`/api/buses/${busId}/driver`, data);

export const updateBusRoute = (busId: string, data: UpdateBusRoutePayload) =>
    api.put<{ bus: BusResponse }>(`/api/buses/${busId}/route`, data);

export const deleteBus = (busId: string) =>
    api.delete(`/api/buses/${busId}`);

// ─── Drivers ───────────────────────────────────────────────────────────────

export interface Driver {
    _id?: string;
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    memberId?: string;
    assignedBusNumber?: string;
    createdAt?: string;
}

const DRIVER_ENDPOINTS = [
    // Backend primaries (provided)
    "/api/driver/admin/all",
    "/api/auth/admin/drivers",
    // Common alternates / fallbacks
    "/api/drivers",
    "/api/admin/drivers",
    "/api/driver",
    "/api/admin/driver",
    "/api/auth/drivers",
];

// Try multiple possible driver endpoints to handle backend variations
const tryDriverRequest = async <T>(
    method: "get" | "post",
    payload?: unknown
) => {
    let lastError: unknown;
    const baseUrls: (string | undefined)[] = [api.defaults.baseURL || undefined, undefined];

    for (const path of DRIVER_ENDPOINTS) {
        for (const baseURL of baseUrls) {
            try {
                if (method === "get") {
                    return await api.request<T>({ url: path, method: "get", baseURL });
                }
                return await api.request<T>({ url: path, method: "post", data: payload, baseURL });
            } catch (err: unknown) {
                lastError = err;
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status !== 404) throw err;
                // On 404 keep trying other baseURL/paths
            }
        }
    }
    throw lastError ?? new Error("Driver endpoint not found");
};

export const getDrivers = () =>
    tryDriverRequest<{ drivers: Driver[] } | { data: Driver[] }>("get");

export interface CreateDriverPayload {
    name: string;
    memberId: string;
    password: string;
}

export const createDriver = (data: CreateDriverPayload) =>
    tryDriverRequest<{ driver: Driver }>("post", data);

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
    _id?: string;
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    memberId?: string;
    role?: string;
    createdAt?: string;
}

export interface CreateUserPayload {
    name: string;
    memberId: string;
    password: string;
    email?: string;
    phone?: string;
}

const USER_ENDPOINTS = [
    "/api/auth/admin/users",
    "/api/auth/admin/users/",
    "/api/auth/admin/user",
    "/api/admin/users",
    "/api/users",
    "/api/user",
];

const tryUserRequest = async <T>(method: "get" | "post", payload?: unknown) => {
    let lastError: unknown;
    for (const path of USER_ENDPOINTS) {
        try {
            if (method === "get") {
                return await api.request<T>({ url: path, method: "get" });
            }
            return await api.request<T>({ url: path, method: "post", data: payload });
        } catch (err: unknown) {
            lastError = err;
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status !== 404) throw err;
        }
    }
    throw lastError ?? new Error("User endpoint not found");
};

export const getUsers = () =>
    tryUserRequest<{ users: User[] } | { data: User[] }>("get");

export const createUser = (data: CreateUserPayload) =>
    tryUserRequest<{ user: User } | User>("post", data);

export default api;
