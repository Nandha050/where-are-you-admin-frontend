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
        const isAuthError = status === 401 && typeof window !== "undefined";

        if (isAuthError) {
            localStorage.removeItem("token");
            localStorage.removeItem("admin_user");

            // Avoid redirect loop on auth pages.
            const onAuthPage =
                window.location.pathname.startsWith("/login") ||
                window.location.pathname.startsWith("/signup");

            if (!onAuthPage) {
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
    organizationSlug: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    admin?: {
        id: string;
        name: string;
        email: string;
        organizationName?: string;
        organization?: {
            id?: string;
            name?: string;
            slug?: string;
            plan?: string;
        };
    };
}

export type PlanCode = 'MONTHLY_1' | 'QUARTERLY_3' | 'SEMIANNUAL_6' | 'ANNUAL_12' | 'TRIAL_7D';

export type ActivatePlanPayload =
    | { planCode: 'TRIAL_7D' }
    | { planCode: Exclude<PlanCode, 'TRIAL_7D'>; busCount: number };

export type RazorpayPlanPayload =
    | { planCode: 'TRIAL_7D' }
    | { planCode: Exclude<PlanCode, 'TRIAL_7D'>; busCount: number };

export interface RazorpayOrderPayload {
    planCode: Exclude<PlanCode, 'TRIAL_7D'>;
    busCount: number;
}

export interface RazorpayOrderResponse {
    order: {
        orderId: string;
        amount: number;
        currency: string;
    };
    keyId: string;
}

export interface RazorpayVerifyPayload {
    orderId: string;
    paymentId: string;
    signature: string;
}

export interface PlanCapacityResponse {
    remainingBusSlots?: number;
    currentBusCount?: number;
    busLimit?: number;
}

export interface PlanSummaryActivePlan {
    planName?: string;
    busLimit?: number;
    startsAt?: string;
    endsAt?: string;
    status?: string;
}

export interface PlanSummaryResponse {
    activePlans?: PlanSummaryActivePlan[];
}

export interface PaymentHistoryItem {
    planName?: string;
    busCount?: number;
    amount?: number;
    status?: "paid" | "failed" | "created" | string;
    createdAt?: string;
    paidAt?: string;
    failureReason?: string;
}

export interface PaymentHistoryResponse {
    history?: PaymentHistoryItem[];
}

export interface MemberLoginPayload {
    role: 'user' | 'driver';
    memberId: string;
    password: string;
    organizationSlug: string;
}

export const adminLogin = (data: LoginPayload) =>
    api.post<AuthResponse>("/api/auth/admin/login", data);

export const adminSignup = (data: SignupPayload) =>
    api.post<AuthResponse>("/api/auth/admin/signup", data);

export const memberLogin = (data: MemberLoginPayload) =>
    api.post<AuthResponse>("/api/auth/member/login", data);

export const activatePlan = (data: ActivatePlanPayload) =>
    api.post("/api/admin/plans/activate", data);

export const createRazorpayOrder = (data: RazorpayOrderPayload) =>
    api.post<RazorpayOrderResponse>("/api/admin/plans/razorpay/order", data);

export const verifyRazorpayPayment = (data: RazorpayVerifyPayload) =>
    api.post("/api/admin/plans/razorpay/verify", data);

export const getPlanCapacity = () =>
    api.get<PlanCapacityResponse | { data?: PlanCapacityResponse }>("/api/admin/plans/capacity");

export const getPlanHistory = () =>
    api.get<PaymentHistoryResponse | { history?: PaymentHistoryItem[] } | { data?: PaymentHistoryResponse }>("/api/admin/plans/history");

export const getPlanStatus = (orderId: string) =>
    api.get("/api/admin/plans/razorpay/status", {
        params: { orderId },
    });

export const getPlans = () =>
    api.get("/api/admin/plans");

export const getCurrentPlan = () =>
    api.get("/api/admin/plans/current");

export const getPlanSummary = () =>
    api.get("/api/admin/plans/summary");

// ─── Routes ────────────────────────────────────────────────────────────────

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RoutePayload {
    name: string;
    startName?: string;
    endName?: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    description?: string;
    isActive?: boolean;
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

export interface RouteDetailStop {
    id?: string;
    name: string;
    lat: number;
    lng: number;
    order: number;
}

export interface RouteDetailResponse {
    routeId: string;
    polyline: string;
    stops: RouteDetailStop[];
    startName?: string;
    endName?: string;
}

export interface Route {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    startName?: string;
    endName?: string;
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
export interface RouteOption {
    id: string;
    name: string;
    label: string;
    startName?: string;
    endName?: string;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
}

export const getRouteOptions = (q?: string) =>
    api.get<{ routes: RouteOption[] } | { data: RouteOption[] } | RouteOption[]>("/api/admin/routes/options", {
        params: q ? { q } : undefined,
    });

const ROUTE_DETAIL_ENDPOINTS = [
    "/api/admin/routes",
    "/routes",
    "/api/routes",
];

export const getRouteById = async (routeId: string) => {
    let lastError: unknown;

    for (const basePath of ROUTE_DETAIL_ENDPOINTS) {
        try {
            return await api.get<
                RouteDetailResponse |
                { route: RouteDetailResponse } |
                { data: RouteDetailResponse } |
                { data: { route: RouteDetailResponse } }
            >(`${basePath}/${routeId}`);
        } catch (err: unknown) {
            lastError = err;
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status !== 404) {
                throw err;
            }
        }
    }

    throw lastError ?? new Error("Route detail endpoint not found");
};
export const createRoute = (data: RoutePayload) =>
    api.post<Route | { route: Route } | { data: Route }>("/api/admin/routes", data);
export const updateRoute = (routeId: string, data: Partial<RoutePayload>) =>
    api.put<Route | { route: Route } | { data: Route }>(`/api/admin/routes/${routeId}`, data);
export const deleteRoute = (id: string) =>
    api.delete(`/api/admin/routes/${id}`);
export const createStop = (routeId: string, data: { name: string; latitude: number; longitude: number; sequenceOrder?: number; radiusMeters?: number }) =>
    api.post<{ stop: Stop }>(`/api/admin/routes/${routeId}/stops`, data);

export const getStops = (routeId: string) =>
    api.get<{ stops: Stop[] } | { data: Stop[] }>(`/api/admin/routes/${routeId}/stops`);

export interface UpdateStopPayload {
    name?: string;
    latitude?: number;
    longitude?: number;
    sequenceOrder?: number;
    radiusMeters?: number;
}

export const updateStop = (stopId: string, data: UpdateStopPayload) =>
    api.put<{ stop: Stop } | Stop>(`/api/admin/stops/${stopId}`, data);

export const deleteStop = (stopId: string) =>
    api.delete(`/api/admin/stops/${stopId}`);

// ─── Buses ─────────────────────────────────────────────────────────────────

export type TripStatus =
    | "PENDING"
    | "STARTED"
    | "RUNNING"
    | "STOPPED"
    | "COMPLETED"
    | "CANCELLED";

export interface Bus {
    _id?: string;
    id?: string;
    numberPlate: string;
    routeName?: string;
    routeId?: string;
    driverId?: string;
    fleetStatus?: string;
    tripStatus?: TripStatus;
    // Deprecated: use fleetStatus instead. Kept temporarily for backward compatibility.
    status?: "active" | "inactive";
    currentLat?: number;
    currentLng?: number;
    speed?: number;
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
    routeId?: string;
    routeName?: string;
}

export interface BusResponse {
    _id: string;
    numberPlate: string;
    routeName?: string;
    routeId?: string;
    driverId?: string;
    fleetStatus?: string;
    tripStatus?: TripStatus;
    // Deprecated: use fleetStatus instead. Kept temporarily for backward compatibility.
    status: "active" | "inactive";
    currentLat?: number;
    currentLng?: number;
    speed?: number;
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

// ─── Trips ─────────────────────────────────────────────────────────────────

export interface TripLocation {
    lat: number;
    lng: number;
}

export interface Trip {
    _id?: string;
    id?: string;
    driverId: string;
    busId: string;
    routeId: string;
    status: TripStatus;
    startedAt?: string;
    endedAt?: string;
    createdAt?: string;
    currentLocation?: TripLocation;
}

export interface StartTripPayload {
    driverId: string;
    busId: string;
    routeId: string;
    status: "STARTED";
    startedAt: string;
}

export interface StopTripPayload {
    tripId?: string;
    driverId?: string;
    status: "COMPLETED";
    endedAt: string;
}

export const getActiveTrip = () =>
    api.get<{ trip: Trip | null }>("/api/trip/active");

export const startTrip = (data: StartTripPayload) =>
    api.post<{ trip: Trip }>("/api/trip/start", data);

export const stopTrip = (data: StopTripPayload) =>
    api.post<{ trip: Trip }>("/api/trip/stop", data);

// ─── Drivers ───────────────────────────────────────────────────────────────

export interface Driver {
    _id?: string;
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    memberId?: string;
    assignedBusId?: string;
    assignedBusNumber?: string;
    createdAt?: string;
}

export interface CreateDriverPayload {
    name: string;
    memberId: string;
    password: string;
    email?: string;
    phone?: string;
}

export interface UpdateDriverPayload {
    name?: string;
    memberId?: string;
    password?: string;
    email?: string;
    phone?: string;
}

export const getDrivers = (q?: string) =>
    api.get<{ drivers: Driver[] } | { data: Driver[] }>("/api/driver/admin/all", {
        params: q ? { q } : undefined,
    });

export const createDriver = (data: CreateDriverPayload) =>
    api.post<{ driver: Driver } | Driver>("/api/auth/admin/drivers", data);

export const updateDriver = (driverId: string, data: UpdateDriverPayload) =>
    api.put<{ driver: Driver } | Driver>(`/api/driver/admin/${driverId}`, data);

export const deleteDriver = (driverId: string) =>
    api.delete(`/api/driver/admin/${driverId}`);

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
    _id?: string;
    id?: string;
    name: string;
    memberId?: string;
    routeId?: string;
    routeName?: string;
    email?: string;
    phone?: string;
    role?: string;
    createdAt?: string;
}

export interface CreateUserPayload {
    name: string;
    memberId: string;
    routeId?: string;
    email?: string;
    phone?: string;
    password: string;
}

export interface UpdateUserPayload {
    name?: string;
    memberId?: string;
    routeId?: string | null;
    email?: string;
    phone?: string;
    password?: string;
}

export const getUsers = (q?: string) =>
    api.get<{ users: User[] } | { data: User[] }>("/api/admin/users", {
        params: q ? { q } : undefined,
    });

export const createUser = (data: CreateUserPayload) =>
    api.post<{ user: User } | User>("/api/auth/admin/users", data);

export const updateUser = (userId: string, data: UpdateUserPayload) =>
    api.put<{ user: User } | User>(`/api/admin/users/${userId}`, data);

export const deleteUser = (userId: string) =>
    api.delete(`/api/admin/users/${userId}`);

export default api;
