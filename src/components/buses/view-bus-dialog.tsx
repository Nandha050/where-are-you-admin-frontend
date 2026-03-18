"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { BusStatusInput } from "@/lib/bus-status"
import { getStatusMeta, getLiveTrackingStatusMeta, normalizeBusStatuses, isStaleTrackingState } from "@/lib/bus-status"
import { useBusLiveTracking } from "@/realtime/hooks"

type ViewBus = BusStatusInput & {
    numberPlate: string
    routeName?: string
    routeId?: string
    driverId?: string
    currentLat?: number
    currentLng?: number
    createdAt?: string
    updatedAt?: string
}

interface ViewBusDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bus?: ViewBus
}

export function ViewBusDialog({
    open,
    onOpenChange,
    bus,
}: ViewBusDialogProps) {
    const busIdentity = bus as ({ _id?: string; id?: string } & ViewBus) | undefined
    const primaryBusId = String(busIdentity?._id || busIdentity?.id || busIdentity?.numberPlate || "")
    const live = useBusLiveTracking(primaryBusId, [busIdentity?._id, busIdentity?.id, busIdentity?.numberPlate])

    if (!bus) return null

    const normalizedStatus = normalizeBusStatuses(bus)
    const fleetMeta = getStatusMeta("fleet", normalizedStatus.fleetStatus)
    const tripMeta = getStatusMeta("trip", normalizedStatus.tripStatus)
    const fallbackTrackingMeta = getStatusMeta("tracking", normalizedStatus.trackingStatus)
    const liveTrackingMeta = getLiveTrackingStatusMeta(live.statusLabel)
    const trackingMeta = live.lastUpdatedText !== "never" ? liveTrackingMeta : fallbackTrackingMeta
    const hasStaleTracking = isStaleTrackingState(
        live.tripStatus ?? normalizedStatus.tripStatus,
        live.trackingStatus ?? normalizedStatus.trackingStatus
    )

    const currentLat = live.location?.lat ?? bus.currentLat
    const currentLng = live.location?.lng ?? bus.currentLng
    const currentSpeed = live.speed ?? bus.speed

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl">
                <DialogHeader>
                    <DialogTitle>Bus Details</DialogTitle>
                    <DialogDescription>
                        {bus.numberPlate}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Number Plate */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Number Plate
                            </p>
                            <p className="text-sm font-semibold text-gray-900">{bus.numberPlate}</p>
                        </div>

                        {/* Fleet Status */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Fleet Status
                            </p>
                            <Badge className={`${fleetMeta.badgeClassName} border-0 w-fit`}>
                                {fleetMeta.label}
                            </Badge>
                        </div>

                        {/* Trip Status */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Trip Status
                            </p>
                            <Badge className={`${tripMeta.badgeClassName} border-0 w-fit`}>
                                {tripMeta.label}
                            </Badge>
                        </div>

                        {/* Route ID / Name */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Route
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                                {bus.routeName || bus.routeId || "Unassigned"}
                            </p>
                        </div>

                        {/* Driver ID */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Driver ID
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                                {bus.driverId || "Unassigned"}
                            </p>
                        </div>

                        {/* Tracking Status */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Tracking Status
                            </p>
                            <Badge className={`${trackingMeta.badgeClassName} border-0 w-fit`}>
                                {trackingMeta.label}
                            </Badge>
                            <p className="text-xs text-gray-500">Last updated {live.lastUpdatedText}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Socket
                            </p>
                            <Badge className={`${live.isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"} border-0 w-fit`}>
                                {live.isConnected ? "Connected" : "Disconnected"}
                            </Badge>
                        </div>

                        {/* Stale Tracking Warning */}
                        {hasStaleTracking && (
                            <div className="col-span-2 flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                    <span className="font-semibold">Live signal unavailable.</span> Trip status may be delayed.
                                </p>
                            </div>
                        )}

                        {/* Current Location */}
                        {typeof currentLat === "number" && typeof currentLng === "number" && (
                            <div className="col-span-2 space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Current Location
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                                </p>
                            </div>
                        )}

                        {typeof currentSpeed === "number" && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Speed
                                </p>
                                <p className="text-sm text-gray-700">
                                    {currentSpeed.toFixed(1)} km/h
                                </p>
                            </div>
                        )}

                        {/* Created At */}
                        {bus.createdAt && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Created
                                </p>
                                <p className="text-sm text-gray-600">
                                    {new Date(bus.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}

                        {/* Updated At */}
                        {bus.updatedAt && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Updated
                                </p>
                                <p className="text-sm text-gray-600">
                                    {new Date(bus.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
