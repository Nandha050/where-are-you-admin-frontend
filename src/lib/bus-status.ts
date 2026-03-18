export type FleetStatus = "IN_SERVICE" | "OUT_OF_SERVICE" | "MAINTENANCE"
export type TripStatus =
    | "NOT_SCHEDULED"
    | "TRIP_NOT_STARTED"
    | "ON_TRIP"
    | "COMPLETED"
    | "DELAYED"
    | "CANCELLED"
    | "MAINTENANCE_HOLD"
export type TrackingStatus = "RUNNING" | "IDLE" | "OFFLINE" | "NO_SIGNAL"

export type FleetStatusValue = FleetStatus | "UNKNOWN"
export type TripStatusValue = TripStatus | "UNKNOWN"
export type TrackingStatusValue = TrackingStatus | "UNKNOWN"

export type BusStatusKind = "fleet" | "trip" | "tracking"

export interface BusStatusInput {
    fleetStatus?: string | null
    tripStatus?: string | null
    trackingStatus?: string | null
    // Deprecated fallback field from legacy contract
    status?: string | null
    routeId?: string | null
    routeName?: string | null
    currentLat?: number | null
    currentLng?: number | null
    speed?: number | null
    telemetry?: {
        speed?: number | null
    } | null
}

export interface NormalizedBusStatuses {
    fleetStatus: FleetStatusValue
    tripStatus: TripStatusValue
    trackingStatus: TrackingStatusValue
}

export interface StatusMeta {
    label: string
    badgeClassName: string
    sortOrder: number
}

const FLEET_STATUS_META: Record<FleetStatusValue, StatusMeta> = {
    IN_SERVICE: {
        label: "In Service",
        badgeClassName: "bg-green-100 text-green-800",
        sortOrder: 1,
    },
    OUT_OF_SERVICE: {
        label: "Out of Service",
        badgeClassName: "bg-slate-100 text-slate-800",
        sortOrder: 2,
    },
    MAINTENANCE: {
        label: "Maintenance",
        badgeClassName: "bg-amber-100 text-amber-800",
        sortOrder: 3,
    },
    UNKNOWN: {
        label: "Unknown",
        badgeClassName: "bg-gray-100 text-gray-700",
        sortOrder: 99,
    },
}

const TRIP_STATUS_META: Record<TripStatusValue, StatusMeta> = {
    NOT_SCHEDULED: {
        label: "Not Scheduled",
        badgeClassName: "bg-gray-100 text-gray-800",
        sortOrder: 1,
    },
    TRIP_NOT_STARTED: {
        label: "Trip Not Started",
        badgeClassName: "bg-blue-100 text-blue-800",
        sortOrder: 2,
    },
    ON_TRIP: {
        label: "On Trip",
        badgeClassName: "bg-green-100 text-green-800",
        sortOrder: 3,
    },
    COMPLETED: {
        label: "Completed",
        badgeClassName: "bg-indigo-100 text-indigo-800",
        sortOrder: 4,
    },
    DELAYED: {
        label: "Delayed",
        badgeClassName: "bg-orange-100 text-orange-800",
        sortOrder: 5,
    },
    CANCELLED: {
        label: "Cancelled",
        badgeClassName: "bg-red-100 text-red-800",
        sortOrder: 6,
    },
    MAINTENANCE_HOLD: {
        label: "Maintenance Hold",
        badgeClassName: "bg-amber-100 text-amber-800",
        sortOrder: 7,
    },
    UNKNOWN: {
        label: "Unknown",
        badgeClassName: "bg-gray-100 text-gray-700",
        sortOrder: 99,
    },
}

export const TRACKING_STATUS_META: Record<TrackingStatusValue, StatusMeta> = {
    RUNNING: {
        label: "Running",
        badgeClassName: "bg-green-100 text-green-800",
        sortOrder: 1,
    },
    IDLE: {
        label: "Idle",
        badgeClassName: "bg-yellow-100 text-yellow-800",
        sortOrder: 2,
    },
    OFFLINE: {
        label: "Offline",
        badgeClassName: "bg-red-100 text-red-800",
        sortOrder: 3,
    },
    NO_SIGNAL: {
        label: "No Signal",
        badgeClassName: "bg-gray-100 text-gray-700",
        sortOrder: 4,
    },
    UNKNOWN: {
        label: "Unknown",
        badgeClassName: "bg-gray-100 text-gray-700",
        sortOrder: 99,
    },
}

const toUpperSnake = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, "_")

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value)

const parseFleetStatus = (value?: string | null): FleetStatus | undefined => {
    if (!value) return undefined
    const normalized = toUpperSnake(value)
    if (normalized === "IN_SERVICE") return "IN_SERVICE"
    if (normalized === "OUT_OF_SERVICE") return "OUT_OF_SERVICE"
    if (normalized === "MAINTENANCE") return "MAINTENANCE"
    return undefined
}

const parseLegacyFleetStatus = (value?: string | null): FleetStatus | undefined => {
    if (!value) return undefined
    const normalized = value.trim().toLowerCase()
    if (normalized === "active") return "IN_SERVICE"
    if (normalized === "inactive") return "OUT_OF_SERVICE"
    if (normalized === "maintenance") return "MAINTENANCE"
    return undefined
}

const parseTripStatus = (value?: string | null): TripStatus | undefined => {
    if (!value) return undefined
    const normalized = toUpperSnake(value)
    if (normalized === "NOT_SCHEDULED") return "NOT_SCHEDULED"
    if (normalized === "TRIP_NOT_STARTED") return "TRIP_NOT_STARTED"
    if (normalized === "ON_TRIP") return "ON_TRIP"
    if (normalized === "COMPLETED") return "COMPLETED"
    if (normalized === "DELAYED") return "DELAYED"
    if (normalized === "CANCELLED") return "CANCELLED"
    if (normalized === "MAINTENANCE_HOLD") return "MAINTENANCE_HOLD"
    return undefined
}

const parseTrackingStatus = (value?: string | null): TrackingStatus | undefined => {
    if (!value) return undefined
    const normalized = toUpperSnake(value)
    if (normalized === "RUNNING") return "RUNNING"
    if (normalized === "IDLE") return "IDLE"
    if (normalized === "OFFLINE") return "OFFLINE"
    if (normalized === "NO_SIGNAL") return "NO_SIGNAL"
    return undefined
}

const parseLegacyTrackingStatus = (value?: string | null, input?: BusStatusInput): TrackingStatus | undefined => {
    if (!value) return undefined
    const normalized = value.trim().toLowerCase()
    if (normalized === "online") {
        const speed =
            input?.speed ??
            input?.telemetry?.speed
        if (isFiniteNumber(speed) && speed > 0) return "RUNNING"
        return "IDLE"
    }
    if (normalized === "moving") return "RUNNING"
    if (normalized === "stopped") return "IDLE"
    if (normalized === "idle") return "IDLE"
    if (normalized === "offline") return "OFFLINE"
    return undefined
}

/**
 * Normalize bus status fields from API response to canonical types.
 * CRITICAL: Trust backend tripStatus as source of truth. Do NOT derive tripStatus from trackingStatus.
 * The backend now manages trip and tracking separately:
 * - tripStatus reflects actual trip lifecycle (started only after first telemetry)
 * - trackingStatus reflects GPS/telemetry connection state
 * Frontend must not conflate these concerns.
 */
export const normalizeBusStatuses = (input: BusStatusInput): NormalizedBusStatuses => {
    const fleetStatus =
        parseFleetStatus(input.fleetStatus) ??
        parseLegacyFleetStatus(input.status) ??
        "UNKNOWN"

    const trackingStatus =
        parseTrackingStatus(input.trackingStatus) ??
        parseLegacyTrackingStatus(input.trackingStatus, input) ??
        "NO_SIGNAL"

    // IMPORTANT: Prefer canonical tripStatus from API.
    // Only fall back to derived values if tripStatus is completely missing.
    const parsedTrip = parseTripStatus(input.tripStatus)
    if (parsedTrip !== undefined) {
        return {
            fleetStatus,
            tripStatus: parsedTrip,
            trackingStatus,
        }
    }

    // === Fallback logic for missing tripStatus ===
    // These are only used if backend did not provide canonical tripStatus.

    // No route assigned → bus not scheduled for any trip
    const hasRoute = Boolean(input.routeId) || Boolean(input.routeName)
    if (!hasRoute) {
        return {
            fleetStatus,
            tripStatus: "NOT_SCHEDULED",
            trackingStatus,
        }
    }

    // Bus in maintenance → trip is on maintenance hold
    if (fleetStatus === "MAINTENANCE") {
        return {
            fleetStatus,
            tripStatus: "MAINTENANCE_HOLD",
            trackingStatus,
        }
    }

    // Default fallback: trip assigned but not started (waiting for driver/telemetry).
    // DO NOT infer ON_TRIP from trackingStatus === RUNNING.
    // That conflation is exactly what caused the UI bug.
    return {
        fleetStatus,
        tripStatus: "TRIP_NOT_STARTED",
        trackingStatus,
    }
}

export const getStatusMeta = (
    kind: BusStatusKind,
    value: FleetStatusValue | TripStatusValue | TrackingStatusValue | string | null | undefined
): StatusMeta => {
    const normalizedValue = value ? toUpperSnake(String(value)) : "UNKNOWN"

    if (kind === "fleet") {
        const fleetValue = (parseFleetStatus(normalizedValue) ?? (normalizedValue === "UNKNOWN" ? "UNKNOWN" : undefined)) as FleetStatusValue | undefined
        return FLEET_STATUS_META[fleetValue ?? "UNKNOWN"]
    }

    if (kind === "trip") {
        const tripValue = (parseTripStatus(normalizedValue) ?? (normalizedValue === "UNKNOWN" ? "UNKNOWN" : undefined)) as TripStatusValue | undefined
        return TRIP_STATUS_META[tripValue ?? "UNKNOWN"]
    }

    const trackingValue = (parseTrackingStatus(normalizedValue) ?? (normalizedValue === "UNKNOWN" ? "UNKNOWN" : undefined)) as TrackingStatusValue | undefined
    return TRACKING_STATUS_META[trackingValue ?? "UNKNOWN"]
}

export const matchesStatusFilter = (
    value: string | null | undefined,
    filter: string,
    allFilterValue = "ALL"
) => {
    if (filter === allFilterValue) return true
    return value === filter
}

export const getStatusSortOrder = (
    kind: BusStatusKind,
    value: FleetStatusValue | TripStatusValue | TrackingStatusValue | string | null | undefined
) => getStatusMeta(kind, value).sortOrder

/**
 * Detect stale or conflicting tracking state for warning display.
 * Returns true if tracking has lost signal (NO_SIGNAL/OFFLINE) while trip is active (ON_TRIP/DELAYED).
 * Use this to show: "Live signal unavailable. Status may be delayed."
 *
 * This is a display-only indicator and does NOT modify backend status.
 * It helps admins understand that the trip status shown may be based on last-known state.
 */
export const isStaleTrackingState = (
    tripStatus: TripStatusValue | TripStatus | string | null | undefined,
    trackingStatus: TrackingStatusValue | TrackingStatus | string | null | undefined
): boolean => {
    const isActiveTripStatus = (ts: string | null | undefined) => {
        if (!ts) return false
        const normalized = toUpperSnake(String(ts))
        return normalized === "ON_TRIP" || normalized === "DELAYED"
    }

    const isOfflineTrackingStatus = (ts: string | null | undefined) => {
        if (!ts) return false
        const normalized = toUpperSnake(String(ts))
        return normalized === "NO_SIGNAL" || normalized === "OFFLINE"
    }

    return isActiveTripStatus(tripStatus) && isOfflineTrackingStatus(trackingStatus)
}

export const getLiveTrackingStatusMeta = (
    statusLabel?: string | null
): StatusMeta => {
    const normalized = statusLabel?.trim().toLowerCase() ?? ""

    if (normalized === "running") {
        return {
            label: "Running",
            badgeClassName: "bg-green-100 text-green-800",
            sortOrder: 1,
        }
    }

    if (normalized === "stopped") {
        return {
            label: "Stopped",
            badgeClassName: "bg-orange-100 text-orange-800",
            sortOrder: 2,
        }
    }

    if (normalized === "idle") {
        return {
            label: "Idle",
            badgeClassName: "bg-slate-100 text-slate-700",
            sortOrder: 3,
        }
    }

    return {
        label: "No Signal",
        badgeClassName: "bg-red-100 text-red-700",
        sortOrder: 4,
    }
}
