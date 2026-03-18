import { getTrackingSocket, refreshTrackingSocketAuth, type TrackingSocket } from "@/realtime/socket-client"
import type { BusLiveSnapshot, BusLocationUpdatePayload, BusLiveTrackingView, LiveStatusLabel } from "@/realtime/types"

const NO_SIGNAL_AFTER_MS = 60_000
const WATCHDOG_INTERVAL_MS = 12_000

const subscribers = new Set<() => void>()
const perBusSubscribers = new Map<string, Set<() => void>>()
const busSnapshots = new Map<string, BusLiveSnapshot>()
const busViews = new Map<string, BusLiveTrackingView>()
const activeRooms = new Set<string>()

let socket: TrackingSocket | null = null
let initialized = false
let watchdogId: number | null = null
let socketConnected = false
let subscriptionCount = 0

let lastListSelectorKey = ""
let lastListSelectorRefs: Array<BusLiveTrackingView | undefined> = []
let lastListSelectorResult: Record<string, BusLiveTrackingView> = {}

const nowMs = () => Date.now()
const isDev = process.env.NODE_ENV !== "production"

const normalizeBusKey = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        const key = value.trim()
        return key ? key : undefined
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value)
    }

    return undefined
}

const uniqueBusKeys = (values: Array<string | undefined>): string[] => {
    const result: string[] = []
    const seen = new Set<string>()

    values.forEach((value) => {
        const key = normalizeBusKey(value)
        if (!key || seen.has(key)) return
        seen.add(key)
        result.push(key)
    })

    return result
}

const subscribeBusKey = (busKey: string, listener: () => void) => {
    if (!perBusSubscribers.has(busKey)) {
        perBusSubscribers.set(busKey, new Set())
    }

    perBusSubscribers.get(busKey)?.add(listener)
}

const unsubscribeBusKey = (busKey: string, listener: () => void) => {
    const listeners = perBusSubscribers.get(busKey)
    listeners?.delete(listener)
    if (listeners && listeners.size === 0) {
        perBusSubscribers.delete(busKey)
    }
}

const extractBusIdFromPayload = (payload: BusLocationUpdatePayload): string | undefined => {
    const enrichedPayload = payload as BusLocationUpdatePayload & {
        id?: string
        busID?: string
        bus_id?: string
        bus?: {
            id?: string
            _id?: string
            busId?: string
        }
    }

    return normalizeBusKey(
        payload.busId ??
        enrichedPayload.id ??
        enrichedPayload.busID ??
        enrichedPayload.bus_id ??
        enrichedPayload.bus?.id ??
        enrichedPayload.bus?._id ??
        enrichedPayload.bus?.busId
    )
}

const extractCoordinatesFromPayload = (payload: BusLocationUpdatePayload): { lat?: number; lng?: number } => {
    const enrichedPayload = payload as BusLocationUpdatePayload & {
        latitude?: number
        longitude?: number
        lon?: number
    }

    const lat =
        typeof payload.lat === "number"
            ? payload.lat
            : typeof enrichedPayload.latitude === "number"
                ? enrichedPayload.latitude
                : undefined

    const lng =
        typeof payload.lng === "number"
            ? payload.lng
            : typeof enrichedPayload.longitude === "number"
                ? enrichedPayload.longitude
                : typeof enrichedPayload.lon === "number"
                    ? enrichedPayload.lon
                    : undefined

    return { lat, lng }
}

const toStatusLabel = (value?: string | null): LiveStatusLabel => {
    const normalized = value ? value.trim().toLowerCase() : ""
    if (normalized === "running" || normalized === "moving" || normalized === "online") return "Running"
    if (normalized === "stopped") return "Stopped"
    if (normalized === "idle") return "Idle"
    if (normalized === "offline" || normalized === "no_signal" || normalized === "no signal") return "No Signal"
    return "No Signal"
}

const parseTimestampMs = (timestamp?: string | number | null): number => {
    if (typeof timestamp === "number" && Number.isFinite(timestamp)) return timestamp
    if (typeof timestamp === "string") {
        const parsed = Date.parse(timestamp)
        if (!Number.isNaN(parsed)) return parsed
    }
    return nowMs()
}

const shallowEqualLiveFields = (current: BusLiveSnapshot | undefined, incoming: BusLiveSnapshot): boolean => {
    if (!current) return false

    return (
        current.lat === incoming.lat &&
        current.lng === incoming.lng &&
        current.speed === incoming.speed &&
        current.statusLabel === incoming.statusLabel &&
        current.timestampMs === incoming.timestampMs &&
        current.trackingStatus === incoming.trackingStatus &&
        current.tripStatus === incoming.tripStatus
    )
}

const notify = () => {
    subscribers.forEach((subscriber) => subscriber())
}

const notifyBus = (busId: string) => {
    const listeners = perBusSubscribers.get(busId)
    if (!listeners) return
    listeners.forEach((listener) => listener())
}

const notifyAllBusSubscribers = () => {
    perBusSubscribers.forEach((listeners) => {
        listeners.forEach((listener) => listener())
    })
}

const formatLastUpdatedText = (lastUpdateMs: number): string => {
    const deltaSeconds = Math.max(0, Math.floor((nowMs() - lastUpdateMs) / 1000))
    if (deltaSeconds < 5) return "just now"
    if (deltaSeconds < 60) return `${deltaSeconds}s ago`
    const deltaMinutes = Math.floor(deltaSeconds / 60)
    if (deltaMinutes < 60) return `${deltaMinutes}m ago`
    const date = new Date(lastUpdateMs)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const toLiveView = (snapshot: BusLiveSnapshot): BusLiveTrackingView => {
    return {
        location:
            typeof snapshot.lat === "number" && typeof snapshot.lng === "number"
                ? { lat: snapshot.lat, lng: snapshot.lng }
                : undefined,
        speed: snapshot.speed,
        statusLabel: snapshot.statusLabel,
        isConnected: socketConnected,
        lastUpdatedText: formatLastUpdatedText(snapshot.lastUpdateMs),
        timestampMs: snapshot.timestampMs,
        lastUpdateMs: snapshot.lastUpdateMs,
        trackingStatus: snapshot.trackingStatus,
        tripStatus: snapshot.tripStatus,
    }
}

const areLiveViewsEqual = (
    current: BusLiveTrackingView | undefined,
    next: BusLiveTrackingView
): boolean => {
    if (!current) return false

    return (
        current.location?.lat === next.location?.lat &&
        current.location?.lng === next.location?.lng &&
        current.speed === next.speed &&
        current.statusLabel === next.statusLabel &&
        current.isConnected === next.isConnected &&
        current.lastUpdatedText === next.lastUpdatedText &&
        current.timestampMs === next.timestampMs &&
        current.lastUpdateMs === next.lastUpdateMs &&
        current.trackingStatus === next.trackingStatus &&
        current.tripStatus === next.tripStatus
    )
}

const refreshLiveViewForBus = (busId: string): boolean => {
    const snapshot = busSnapshots.get(busId)
    if (!snapshot) {
        if (!busViews.has(busId)) return false
        busViews.delete(busId)
        return true
    }

    const next = toLiveView(snapshot)
    const current = busViews.get(busId)
    if (areLiveViewsEqual(current, next)) return false

    busViews.set(busId, next)
    return true
}

const refreshAllLiveViews = (): string[] => {
    const changedBusIds: string[] = []

    busSnapshots.forEach((_snapshot, busId) => {
        if (refreshLiveViewForBus(busId)) {
            changedBusIds.push(busId)
        }
    })

    return changedBusIds
}

const applyNoSignalWatchdog = (): boolean => {
    const now = nowMs()
    let changed = false

    busSnapshots.forEach((snapshot, busId) => {
        if (now - snapshot.lastUpdateMs <= NO_SIGNAL_AFTER_MS) return
        if (snapshot.statusLabel === "No Signal") return

        busSnapshots.set(busId, {
            ...snapshot,
            statusLabel: "No Signal",
        })
        const viewChanged = refreshLiveViewForBus(busId)
        if (viewChanged) {
            notifyBus(busId)
            changed = true
        }
    })

    return changed
}

const upsertFromSocketPayload = (payload: BusLocationUpdatePayload): boolean => {
    const busId = extractBusIdFromPayload(payload)
    if (!busId) {
        if (isDev) {
            console.warn("[tracking-store] ignored update without bus id", payload)
        }
        return false
    }

    const prev = busSnapshots.get(busId)
    const incomingStatus = toStatusLabel(payload.status ?? payload.trackingStatus)
    const { lat, lng } = extractCoordinatesFromPayload(payload)

    const next: BusLiveSnapshot = {
        busId,
        lat: typeof lat === "number" ? lat : prev?.lat,
        lng: typeof lng === "number" ? lng : prev?.lng,
        speed: typeof payload.speed === "number" ? payload.speed : prev?.speed,
        statusLabel: incomingStatus,
        timestampMs: parseTimestampMs(payload.timestamp),
        lastUpdateMs: nowMs(),
        trackingStatus: payload.trackingStatus ?? prev?.trackingStatus,
        tripStatus: payload.tripStatus ?? prev?.tripStatus,
    }

    const onlyHeartbeatChanged = shallowEqualLiveFields(prev, next)
    if (onlyHeartbeatChanged) {
        busSnapshots.set(busId, {
            ...(prev ?? next),
            lastUpdateMs: next.lastUpdateMs,
        })
        return false
    }

    busSnapshots.set(busId, next)
    const changed = refreshLiveViewForBus(busId)
    if (changed) {
        notifyBus(busId)
    }

    return changed
}

const handleSocketConnect = () => {
    socketConnected = true
    activeRooms.forEach((busId) => {
        socket?.emit("joinBusRoom", busId)
    })

    const changedBusIds = refreshAllLiveViews()
    changedBusIds.forEach((busId) => notifyBus(busId))
    notifyAllBusSubscribers()
    notify()
}

const handleSocketDisconnect = () => {
    socketConnected = false

    const changedBusIds = refreshAllLiveViews()
    changedBusIds.forEach((busId) => notifyBus(busId))
    notifyAllBusSubscribers()
    notify()
}

const handleBusLocationUpdate = (payload: BusLocationUpdatePayload) => {
    const changed = upsertFromSocketPayload(payload)
    if (isDev) {
        const busId = extractBusIdFromPayload(payload)
        console.info("[tracking-store] busLocationUpdate", {
            busId,
            changed,
            status: payload.status,
            trackingStatus: payload.trackingStatus,
        })
    }

    if (changed) {
        notify()
    }
}

const attachSocketListeners = () => {
    if (!socket) return

    socket.on("connect", handleSocketConnect)
    socket.on("disconnect", handleSocketDisconnect)
    socket.on("busLocationUpdate", handleBusLocationUpdate)
}

const detachSocketListeners = () => {
    if (!socket) return

    socket.off("connect", handleSocketConnect)
    socket.off("disconnect", handleSocketDisconnect)
    socket.off("busLocationUpdate", handleBusLocationUpdate)
}

const startWatchdog = () => {
    if (watchdogId !== null) return

    watchdogId = window.setInterval(() => {
        const changed = applyNoSignalWatchdog()
        if (changed) notify()
    }, WATCHDOG_INTERVAL_MS)
}

const stopWatchdog = () => {
    if (watchdogId === null) return
    window.clearInterval(watchdogId)
    watchdogId = null
}

const maybeTeardownRuntime = () => {
    if (subscriptionCount > 0) return
    if (activeRooms.size > 0) return
    if (!initialized) return

    stopWatchdog()
    detachSocketListeners()
    socket?.disconnect()
    socketConnected = false
    initialized = false
}

export const initLiveTracking = () => {
    if (initialized || typeof window === "undefined") return

    refreshTrackingSocketAuth()
    socket = getTrackingSocket()
    attachSocketListeners()
    if (!socket.connected) {
        socket.connect()
    }
    startWatchdog()
    initialized = true
}

export const subscribeLiveTracking = (listener: () => void) => {
    initLiveTracking()
    subscriptionCount += 1
    subscribers.add(listener)

    return () => {
        subscribers.delete(listener)
        subscriptionCount = Math.max(0, subscriptionCount - 1)
        maybeTeardownRuntime()
    }
}

export const subscribeBusLiveTracking = (busId: string, listener: () => void) => {
    initLiveTracking()

    const key = normalizeBusKey(busId)
    if (!key) {
        return () => {
            // no-op
        }
    }

    subscriptionCount += 1
    subscribeBusKey(key, listener)

    return () => {
        unsubscribeBusKey(key, listener)

        subscriptionCount = Math.max(0, subscriptionCount - 1)
        maybeTeardownRuntime()
    }
}

export const subscribeManyBusLiveTracking = (busIds: string[], listener: () => void) => {
    initLiveTracking()

    const keys = uniqueBusKeys(busIds)
    if (keys.length === 0) {
        return () => {
            // no-op
        }
    }

    subscriptionCount += 1
    keys.forEach((key) => subscribeBusKey(key, listener))

    return () => {
        keys.forEach((key) => unsubscribeBusKey(key, listener))
        subscriptionCount = Math.max(0, subscriptionCount - 1)
        maybeTeardownRuntime()
    }
}

export const joinBusRoom = (busId: string) => {
    if (!busId || typeof window === "undefined") return

    const key = normalizeBusKey(busId)
    if (!key) return

    initLiveTracking()
    const wasActive = activeRooms.has(key)
    activeRooms.add(key)

    if (socket?.connected && !wasActive) {
        socket.emit("joinBusRoom", key)
        socket.emit("joinBusRoom", { busId: key })
    }
}

export const leaveBusRoom = (busId: string) => {
    if (!busId || typeof window === "undefined") return

    const key = normalizeBusKey(busId)
    if (!key) return

    const wasActive = activeRooms.delete(key)
    if (wasActive && socket?.connected) {
        socket.emit("leaveBusRoom", key)
        socket.emit("leaveBusRoom", { busId: key })
    }

    maybeTeardownRuntime()
}

export const joinManyBusRooms = (busIds: string[]) => {
    busIds.forEach((busId) => joinBusRoom(busId))
}

export const leaveManyBusRooms = (busIds: string[]) => {
    busIds.forEach((busId) => leaveBusRoom(busId))
}

export const getLiveSnapshotByBusId = (busId: string): BusLiveTrackingView | undefined => {
    const key = normalizeBusKey(busId)
    if (!key) return undefined
    return busViews.get(key)
}

export const getLiveSnapshotByBusIds = (busIds: string[]): BusLiveTrackingView | undefined => {
    const keys = uniqueBusKeys(busIds)
    for (const key of keys) {
        const snapshot = busViews.get(key)
        if (snapshot) return snapshot
    }

    return undefined
}

export const getLiveSnapshotsByBusIds = (busIds: string[]): Record<string, BusLiveTrackingView> => {
    const selectorKey = busIds.join("|")
    const selectorRefs = busIds.map((busId) => busViews.get(busId))
    const selectorUnchanged =
        selectorKey === lastListSelectorKey &&
        selectorRefs.length === lastListSelectorRefs.length &&
        selectorRefs.every((entry, index) => entry === lastListSelectorRefs[index])

    if (selectorUnchanged) {
        return lastListSelectorResult
    }

    const next: Record<string, BusLiveTrackingView> = {}

    busIds.forEach((busId) => {
        const view = busViews.get(busId)
        if (view) {
            next[busId] = view
        }
    })

    lastListSelectorKey = selectorKey
    lastListSelectorRefs = selectorRefs
    lastListSelectorResult = next

    return next
}

export const isLiveTrackingConnected = () => socketConnected
