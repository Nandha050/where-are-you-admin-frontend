"use client"

import { memo } from "react"
import {
  Eye,
  ListFilter,
  MoreHorizontal,
  Trash2,
  UserRound,
  AlertCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getStatusMeta,
  getLiveTrackingStatusMeta,
  isStaleTrackingState,
  type FleetStatusValue,
  type TripStatusValue,
  type TrackingStatusValue,
} from "@/lib/bus-status"
import { useBusLiveTracking } from "@/realtime/hooks"

export interface Bus {
  id?: string
  _id?: string
  numberPlate: string
  routeName?: string
  routeId?: string
  driverId?: string
  driverName?: string
  fleetStatus?: FleetStatusValue
  tripStatus?: TripStatusValue
  trackingStatus?: TrackingStatusValue | "online" | "offline" | "idle" | "moving"
  // Deprecated: use fleetStatus. Kept for temporary fallback.
  status?: "active" | "inactive"
  currentLat?: number
  currentLng?: number
  speed?: number
  createdAt?: string
}

interface BusTableProps {
  buses: Bus[]
  routes: string[]
  routeFilter: string
  searchQuery: string
  fleetStatusFilter: string
  tripStatusFilter: string
  trackingStatusFilter: string
  sortBy: string
  onSearchQueryChange: (value: string) => void
  onRouteFilterChange: (value: string) => void
  onFleetStatusFilterChange: (value: string) => void
  onTripStatusFilterChange: (value: string) => void
  onTrackingStatusFilterChange: (value: string) => void
  onSortByChange: (value: string) => void
  onClearFilters: () => void
  onAssignDriver: (bus: Bus, index: number) => void
  onChangeRoute: (bus: Bus, index: number) => void
  onViewBus: (bus: Bus, index: number) => void
  onDeleteBus: (bus: Bus, index: number) => void
}

interface BusRowProps {
  bus: Bus
  idx: number
  onAssignDriver: (bus: Bus, index: number) => void
  onChangeRoute: (bus: Bus, index: number) => void
  onViewBus: (bus: Bus, index: number) => void
  onDeleteBus: (bus: Bus, index: number) => void
}

const FLEET_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All Fleet Status" },
  { value: "IN_SERVICE", label: "In Service" },
  { value: "OUT_OF_SERVICE", label: "Out of Service" },
  { value: "MAINTENANCE", label: "Maintenance" },
]

const TRIP_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All Trip Status" },
  { value: "NOT_SCHEDULED", label: "Not Scheduled" },
  { value: "TRIP_NOT_STARTED", label: "Trip Not Started" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELAYED", label: "Delayed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "MAINTENANCE_HOLD", label: "Maintenance Hold" },
]

const TRACKING_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All Tracking" },
  { value: "RUNNING", label: "Running" },
  { value: "IDLE", label: "Idle" },
  { value: "OFFLINE", label: "Offline" },
  { value: "NO_SIGNAL", label: "No Signal" },
]

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NUMBER_PLATE_ASC", label: "Plate A-Z" },
  { value: "NUMBER_PLATE_DESC", label: "Plate Z-A" },
  { value: "FLEET_STATUS", label: "Fleet Status" },
  { value: "TRIP_STATUS", label: "Trip Status" },
  { value: "TRACKING_STATUS", label: "Tracking Status" },
]

const resolveBusKey = (bus: Bus) => String(bus._id || bus.id || bus.numberPlate)

const BusRow = memo(function BusRow({
  bus,
  idx,
  onAssignDriver,
  onChangeRoute,
  onViewBus,
  onDeleteBus,
}: BusRowProps) {
  const busKey = resolveBusKey(bus)
  const live = useBusLiveTracking(busKey, [bus._id, bus.id, bus.numberPlate])
  const fleetMeta = getStatusMeta("fleet", bus.fleetStatus)
  const tripMeta = getStatusMeta("trip", bus.tripStatus)
  const fallbackTrackingMeta = getStatusMeta("tracking", bus.trackingStatus)
  const liveTrackingMeta = getLiveTrackingStatusMeta(live.statusLabel)
  const trackingMeta = live.lastUpdatedText !== "never" ? liveTrackingMeta : fallbackTrackingMeta
  const isRouteChangeBlocked = bus.tripStatus === "ON_TRIP" || bus.tripStatus === "DELAYED"
  const hasStaleTracking = isStaleTrackingState(
    live.tripStatus ?? bus.tripStatus,
    live.trackingStatus ?? bus.trackingStatus
  )

  return (
    <TableRow className="hover:bg-gray-50/70">
      {/* Number Plate */}
      <TableCell className="font-semibold text-gray-900">
        {bus.numberPlate}
      </TableCell>

      {/* Route */}
      <TableCell>
        {bus.routeName ? (
          <Badge variant="secondary" className="cursor-default border-gray-300 bg-white text-blue-600">
            {bus.routeName}
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </TableCell>

      {/* Driver */}
      <TableCell>
        {bus.driverName && bus.driverName !== "Unassigned" ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
              {bus.driverName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <span className="text-sm font-medium text-gray-700">{bus.driverName}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}
      </TableCell>

      {/* Fleet Status */}
      <TableCell>
        <Badge
          variant="secondary"
          className={`rounded-full border-0 ${fleetMeta.badgeClassName}`}
        >
          {fleetMeta.label}
        </Badge>
      </TableCell>

      {/* Trip Status with Stale Tracking Indicator */}
      <TableCell>
        <div
          className="flex items-center gap-2"
          title={hasStaleTracking ? "Live signal unavailable. Status may be delayed." : undefined}
        >
          <Badge className={`rounded-full border-0 ${tripMeta.badgeClassName}`}>
            {tripMeta.label}
          </Badge>
          {hasStaleTracking && (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
        </div>
      </TableCell>

      {/* Tracking Status */}
      <TableCell>
        <div className="space-y-1">
          <Badge className={`rounded-full border-0 ${trackingMeta.badgeClassName}`}>
            {trackingMeta.label}
          </Badge>
          <p className="text-[11px] text-gray-500">
            {live.lastUpdatedText === "never" ? "No live updates" : `Updated ${live.lastUpdatedText}`}
          </p>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onViewBus(bus, idx)}
            className="rounded-lg hover:bg-gray-100 h-8 w-8"
            title="View Details"
          >
            <Eye className="size-4 text-gray-600" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onAssignDriver(bus, idx)}
            className="rounded-lg hover:bg-gray-100 h-8 w-8"
            title="Assign Driver"
          >
            <UserRound className="size-4 text-gray-600" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-lg hover:bg-gray-100 h-8 w-8"
              >
                <MoreHorizontal className="size-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-lg">
              <DropdownMenuItem onClick={() => onDeleteBus(bus, idx)}>
                <Trash2 className="size-4" />
                Delete Bus
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isRouteChangeBlocked}
                onClick={() => onChangeRoute(bus, idx)}
                title={isRouteChangeBlocked ? "Complete/cancel active trip before changing route" : "Change route"}
              >
                <ListFilter className="size-4" />
                Change Route
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
})

export function BusTable({
  buses,
  routes,
  routeFilter,
  searchQuery,
  fleetStatusFilter,
  tripStatusFilter,
  trackingStatusFilter,
  sortBy,
  onSearchQueryChange,
  onRouteFilterChange,
  onFleetStatusFilterChange,
  onTripStatusFilterChange,
  onTrackingStatusFilterChange,
  onSortByChange,
  onClearFilters,
  onAssignDriver,
  onChangeRoute,
  onViewBus,
  onDeleteBus,
}: BusTableProps) {
  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm">
      <CardContent className="space-y-5 p-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search plate, route, or driver"
              className="h-9 min-w-56"
            />

            <select
              value={routeFilter}
              onChange={(event) => onRouteFilterChange(event.target.value)}
              className="h-9 min-w-32 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Routes">All Routes</option>
              {routes.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>

            <select
              value={fleetStatusFilter}
              onChange={(event) => onFleetStatusFilterChange(event.target.value)}
              className="h-9 min-w-28 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FLEET_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={tripStatusFilter}
              onChange={(event) => onTripStatusFilterChange(event.target.value)}
              className="h-9 min-w-36 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRIP_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={trackingStatusFilter}
              onChange={(event) => onTrackingStatusFilterChange(event.target.value)}
              className="h-9 min-w-34 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRACKING_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => onSortByChange(event.target.value)}
              className="h-9 min-w-32 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <Button
              variant="ghost"
              onClick={onClearFilters}
              className="h-9 rounded-md px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              Clear Filters
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200 h-9 w-9">
              <ListFilter className="size-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Bus Plate</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Route</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Driver</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Fleet Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Trip Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Tracking Status</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-gray-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                  No buses available. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              buses.map((bus, idx) => {
                const stableKey = resolveBusKey(bus)
                return (
                  <BusRow
                    key={stableKey}
                    bus={bus}
                    idx={idx}
                    onAssignDriver={onAssignDriver}
                    onChangeRoute={onChangeRoute}
                    onViewBus={onViewBus}
                    onDeleteBus={onDeleteBus}
                  />
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        {buses.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">
              Showing {buses.length} bus{buses.length !== 1 ? 'es' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}