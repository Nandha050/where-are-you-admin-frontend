import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"

import {
    getLiveSnapshotByBusId,
    getLiveSnapshotByBusIds,
    getLiveSnapshotsByBusIds,
    initLiveTracking,
    isLiveTrackingConnected,
    joinBusRoom,
    joinManyBusRooms,
    leaveBusRoom,
    leaveManyBusRooms,
    subscribeManyBusLiveTracking,
    subscribeBusLiveTracking,
    subscribeLiveTracking,
} from "@/realtime/live-tracking-store"
import type { BusLiveTrackingView } from "@/realtime/types"

const EMPTY_SNAPSHOTS: Record<string, BusLiveTrackingView> = {}

const uniqueBusIds = (ids: Array<string | undefined>): string[] => {
    const seen = new Set<string>()
    const result: string[] = []

    ids.forEach((id) => {
        const key = id?.trim()
        if (!key || seen.has(key)) return
        seen.add(key)
        result.push(key)
    })

    return result
}

export const useBusLiveTracking = (busId?: string, aliases?: Array<string | undefined>) => {
    const resolvedBusIds = useMemo(
        () => uniqueBusIds([busId, ...(aliases ?? [])]),
        [aliases, busId]
    )
    const stableBusId = resolvedBusIds[0] ?? ""
    const resolvedBusIdsKey = useMemo(() => resolvedBusIds.join("|"), [resolvedBusIds])

    useEffect(() => {
        initLiveTracking()
    }, [])

    useEffect(() => {
        if (resolvedBusIds.length === 0) return

        if (resolvedBusIds.length === 1) {
            joinBusRoom(resolvedBusIds[0])
            return () => {
                leaveBusRoom(resolvedBusIds[0])
            }
        }

        joinManyBusRooms(resolvedBusIds)
        return () => {
            leaveManyBusRooms(resolvedBusIds)
        }
    }, [resolvedBusIds, resolvedBusIdsKey])

    const subscribeToBus = useCallback(
        (listener: () => void) => {
            if (resolvedBusIds.length === 0) {
                return () => {
                    // no-op
                }
            }

            if (resolvedBusIds.length > 1) {
                return subscribeManyBusLiveTracking(resolvedBusIds, listener)
            }

            return subscribeBusLiveTracking(stableBusId, listener)
        },
        [resolvedBusIds, stableBusId]
    )

    const snapshot = useSyncExternalStore(
        subscribeToBus,
        () => {
            if (resolvedBusIds.length > 1) return getLiveSnapshotByBusIds(resolvedBusIds)
            return stableBusId ? getLiveSnapshotByBusId(stableBusId) : undefined
        },
        () => undefined
    )

    return useMemo(
        () => ({
            location: snapshot?.location,
            speed: snapshot?.speed,
            statusLabel: snapshot?.statusLabel ?? "No Signal",
            isConnected: snapshot?.isConnected ?? isLiveTrackingConnected(),
            lastUpdatedText: snapshot?.lastUpdatedText ?? "never",
            trackingStatus: snapshot?.trackingStatus,
            tripStatus: snapshot?.tripStatus,
        }),
        [snapshot]
    )
}

const serializeBusIds = (busIds: string[]) => busIds.join("|")

export const useLiveBusListTracking = (busIds: string[]) => {
    const normalizedBusIds = useMemo(
        () => busIds.map((id) => id.trim()).filter(Boolean),
        [busIds]
    )

    const key = useMemo(() => serializeBusIds(normalizedBusIds), [normalizedBusIds])

    useEffect(() => {
        initLiveTracking()
    }, [])

    useEffect(() => {
        if (normalizedBusIds.length === 0) return

        joinManyBusRooms(normalizedBusIds)
        return () => {
            leaveManyBusRooms(normalizedBusIds)
        }
    }, [key, normalizedBusIds])

    const snapshots = useSyncExternalStore(
        subscribeLiveTracking,
        () => getLiveSnapshotsByBusIds(normalizedBusIds),
        () => EMPTY_SNAPSHOTS
    )

    return useMemo(
        () => ({
            byBusId: snapshots,
            isConnected: isLiveTrackingConnected(),
        }),
        [snapshots]
    )
}
