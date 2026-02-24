import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
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
    driverId: string;
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
    createdAt?: string;
}

export const getDrivers = () =>
    api.get<{ drivers: Driver[] } | { data: Driver[] }>("/api/admin/drivers");

export default api;
