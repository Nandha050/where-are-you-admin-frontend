"use client"

import {
  Grid2x2,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Route,
  Trash2,
  UserRound,
  ChevronLeft,
  ChevronRight,
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
  id: string
  numberPlate: string
  routeName: string
  routeId?: string
  driverId?: string
  driverMemberId?: string
  driverName: string
  status: "active" | "inactive"
  trackingStatus?: string
  lastSeen?: string
  powerOn?: boolean
}

interface BusTableProps {
  buses: Bus[]
  routeFilter: string
  statusFilter: string
  onRouteFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onClearFilters: () => void
  onAssignRoute: (bus: Bus) => void
  onAssignDriver: (bus: Bus) => void
  onEditBus: (bus: Bus) => void
  onDeleteBus: (bus: Bus) => void
}

export function BusTable({
  buses,
  routeFilter,
  statusFilter,
  onRouteFilterChange,
  onStatusFilterChange,
  onClearFilters,
  onAssignRoute,
  onAssignDriver,
  onEditBus,
  onDeleteBus,
}: BusTableProps) {
  return (
    <Card className="rounded-xl border border-gray-200 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={routeFilter}
              onChange={(event) => onRouteFilterChange(event.target.value)}
              className="h-9 min-w-32 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="All Routes">All Routes</option>
              <option value="Route 10">Route 10</option>
              <option value="Route 15">Route 15</option>
              <option value="Route 42">Route 42</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="h-9 min-w-28 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <Button variant="outline" className="h-9 rounded-md border-gray-200 text-gray-700">
              <ListFilter className="size-4" />
              Advanced Filters
            </Button>

            <Button
              variant="ghost"
              onClick={onClearFilters}
              className="h-9 rounded-md px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              Clear All
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              <ListFilter className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              <Grid2x2 className="size-4" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Bus Plate</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Assigned Driver</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Assigned Route</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Last Seen</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-gray-500">Power</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-gray-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                  No buses available.
                </TableCell>
              </TableRow>
            ) : (
              buses.map((bus) => (
                <TableRow key={bus.id} className="hover:bg-gray-50/70">
                  <TableCell className="font-semibold text-gray-800">{bus.numberPlate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
                        {bus.driverName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{bus.driverName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer rounded-md border border-gray-300 bg-white text-blue-600 hover:bg-blue-50"
                    >
                      {bus.routeName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={bus.status === "active" ? "default" : "secondary"}
                      className={
                        bus.status === "active"
                          ? "rounded-full bg-green-100 text-green-700 hover:bg-green-100"
                          : "rounded-full bg-gray-100 text-gray-600 hover:bg-gray-100"
                      }
                    >
                      {bus.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{bus.lastSeen ?? "Just now"}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                        bus.powerOn ? "bg-blue-600" : "bg-gray-300"
                      }`}
                      aria-label="Power status"
                    >
                      <span
                        className={`inline-block size-5 transform rounded-full bg-white transition-transform ${
                          bus.powerOn ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEditBus(bus)}
                        className="rounded-lg hover:bg-gray-100"
                      >
                        <Pencil className="size-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDeleteBus(bus)}
                        className="rounded-lg hover:bg-gray-100"
                      >
                        <Trash2 className="size-4 text-gray-600" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="rounded-lg hover:bg-gray-100">
                            <MoreHorizontal className="size-4 text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg">
                          <DropdownMenuItem onClick={() => onAssignRoute(bus)}>
                            <Route className="size-4" />
                            Assign Route
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignDriver(bus)}>
                            <UserRound className="size-4" />
                            Assign Driver
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

        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Showing 1 - {Math.min(buses.length, 4)} of {buses.length} buses
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="bg-blue-600 text-white">
              1
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              2
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              3
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              4
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-md border-gray-200">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
