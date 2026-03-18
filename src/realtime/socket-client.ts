import { io, type Socket } from "socket.io-client"

import type { BusLocationUpdatePayload } from "@/realtime/types"

export interface ServerToClientEvents {
    busLocationUpdate: (payload: BusLocationUpdatePayload) => void
}

export interface ClientToServerEvents {
    joinBusRoom: (payload: string | { busId: string }) => void
    leaveBusRoom: (payload: string | { busId: string }) => void
    driverLocationUpdate: (payload: {
        latitude: number
        longitude: number
        speed?: number
        timestamp: string
    }) => void
}

export type TrackingSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TrackingSocket | null = null

const getBaseUrl = () => {
    const socketBase = process.env.NEXT_PUBLIC_SOCKET_URL
    if (socketBase && socketBase.trim()) return socketBase.trim()

    const envBase = process.env.NEXT_PUBLIC_API_BASE_URL
    if (envBase && envBase.trim()) return envBase.trim()

    if (typeof window !== "undefined") {
        const { protocol, hostname, port } = window.location

        // Local dev convention in this project: Next.js runs on 3001, backend/socket on 3000.
        if (port === "3001") {
            return `${protocol}//${hostname}:3000`
        }

        return window.location.origin
    }

    return ""
}

const getAuthToken = () => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("token") ?? ""
}

export const getTrackingSocket = (): TrackingSocket => {
    if (socket) return socket

    const baseUrl = getBaseUrl()
    const token = getAuthToken()

    console.info("[tracking-socket] token from localStorage:", token || "(empty)")

    socket = io(baseUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        auth: {
            token: token || "",
        },
    })

    console.info("[tracking-socket] init", { baseUrl, path: "/socket.io", hasToken: !!token })

    socket.on("connect", () => {
        console.info("[tracking-socket] connected", { socketId: socket?.id })
    })

    socket.on("connect_error", (error) => {
        console.warn("[tracking-socket] connect_error", error.message)
    })

    socket.io.on("reconnect", (attempt: number) => {
        console.info("[tracking-socket] reconnect", { attempt })
    })

    socket.on("disconnect", (reason) => {
        console.warn("[tracking-socket] disconnect", { reason })
    })

    return socket
}

export const refreshTrackingSocketAuth = () => {
    const instance = getTrackingSocket()
    instance.auth = {
        token: getAuthToken(),
    }
}

export const emitDriverLocationUpdate = (payload: {
    latitude: number
    longitude: number
    speed?: number
    timestamp?: string
}) => {
    const instance = getTrackingSocket()
    if (!instance.connected) return

    try {
        instance.emit("driverLocationUpdate", {
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed,
            timestamp: payload.timestamp ?? new Date().toISOString(),
        })
    } catch {
        // Fail silently and retry on next caller tick.
    }
}
