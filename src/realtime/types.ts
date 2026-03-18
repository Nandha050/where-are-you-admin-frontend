export type LiveStatusLabel = "Running" | "Stopped" | "Idle" | "No Signal"

export interface BusLocationUpdatePayload {
    busId: string
    id?: string
    busID?: string
    bus_id?: string
    lat?: number
    lng?: number
    latitude?: number
    longitude?: number
    lon?: number
    speed?: number | null
    status?: string | null
    timestamp?: string | number | null
    trackingStatus?: string | null
    tripStatus?: string | null
    skipped?: boolean
}

export interface BusLiveSnapshot {
    busId: string
    lat?: number
    lng?: number
    speed?: number
    statusLabel: LiveStatusLabel
    timestampMs: number
    lastUpdateMs: number
    trackingStatus?: string
    tripStatus?: string
}

export interface BusLiveTrackingView {
    location?: {
        lat: number
        lng: number
    }
    speed?: number
    statusLabel: LiveStatusLabel
    isConnected: boolean
    lastUpdatedText: string
    timestampMs: number
    lastUpdateMs: number
    trackingStatus?: string
    tripStatus?: string
}
