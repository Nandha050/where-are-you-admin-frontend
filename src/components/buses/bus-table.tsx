"use client"

import {
  Eye,
  ListFilter,
  MoreHorizontal,
  Trash2,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

export interface Bus {
  id?: string
  _id?: string
  numberPlate: string
  routeName?: string
  routeId?: string
  driverId?: string
  driverName?: string
  status?: "active" | "inactive"
  trackingStatus?: string
  createdAt?: string
}

interface BusTableProps {
  buses: Bus[]
  routes: string[]
  routeFilter: string
  statusFilter: string
  onRouteFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onClearFilters: () => void
  onAssignDriver: (bus: Bus) => void
  onViewBus: (bus: Bus) => void
  onDeleteBus: (bus: Bus) => void
}

export function BusTable({
  buses,
  routes,
  routeFilter,
  statusFilter,
  onRouteFilterChange,
  onStatusFilterChange,
  onClearFilters,
  onAssignDriver,
  onViewBus,
  onDeleteBus,
}: BusTableProps) {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "inactive":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getTrackingStatusColor = (status?: string) => {
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
    <Card className="rounded-xl border border-gray-200 shadow-sm">
      <CardContent className="space-y-5 p-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
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
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="h-9 min-w-28 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Status">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Tracking</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-gray-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                  No buses available. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              buses.map((bus) => (
                <TableRow key={bus.id || bus._id} className="hover:bg-gray-50/70">
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

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`rounded-full border-0 ${getStatusColor(bus.status)}`}
                    >
                      {bus.status ? bus.status.charAt(0).toUpperCase() + bus.status.slice(1) : "N/A"}
                    </Badge>
                  </TableCell>

                  {/* Tracking Status */}
                  <TableCell>
                    {bus.trackingStatus ? (
                      <Badge className={`rounded-full border-0 ${getTrackingStatusColor(bus.trackingStatus)}`}>
                        {bus.trackingStatus.charAt(0).toUpperCase() + bus.trackingStatus.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onViewBus(bus)}
                        className="rounded-lg hover:bg-gray-100 h-8 w-8"
                        title="View Details"
                      >
                        <Eye className="size-4 text-gray-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onAssignDriver(bus)}
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
                          <DropdownMenuItem onClick={() => onDeleteBus(bus)}>
                            <Trash2 className="size-4" />
                            Delete Bus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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