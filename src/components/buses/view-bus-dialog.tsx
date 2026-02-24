"use client"

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

interface ViewBusDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bus?: any
}

export function ViewBusDialog({
    open,
    onOpenChange,
    bus,
}: ViewBusDialogProps) {
    if (!bus) return null

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "active":
                return "bg-green-100 text-green-800"
            case "inactive":
                return "bg-gray-100 text-gray-800"
            case "maintenance":
                return "bg-yellow-100 text-yellow-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    const getTrackingStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "online":
                return "bg-green-100 text-green-800"
            case "offline":
                return "bg-red-100 text-red-800"
            case "idle":
                return "bg-yellow-100 text-yellow-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

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

                        {/* Status */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Status
                            </p>
                            <Badge className={`${getStatusColor(bus.status)} border-0 w-fit`}>
                                {bus.status ? bus.status.charAt(0).toUpperCase() + bus.status.slice(1) : "N/A"}
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
                        {bus.trackingStatus && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Tracking Status
                                </p>
                                <Badge className={`${getTrackingStatusColor(bus.trackingStatus)} border-0 w-fit`}>
                                    {bus.trackingStatus.charAt(0).toUpperCase() + bus.trackingStatus.slice(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Current Location */}
                        {bus.currentLat && bus.currentLng && (
                            <div className="col-span-2 space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Current Location
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {bus.currentLat.toFixed(4)}, {bus.currentLng.toFixed(4)}
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
