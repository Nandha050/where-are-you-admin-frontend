"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Plus, AlertCircle, CheckCircle } from "lucide-react"

import { AddBusDialog } from "@/components/buses/add-bus-dialog"
import { AssignDriverDialog } from "@/components/buses/assign-driver-dialog"
import { BusTable, type Bus } from "@/components/buses/bus-table"
import { DeleteBusDialog } from "@/components/buses/delete-bus-dialog"
import { ViewBusDialog } from "@/components/buses/view-bus-dialog"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  getBuses,
  createBus,
  updateBusDriver,
  updateBusRoute,
  deleteBus,
  getBusById,
  getRoutes,
  getDrivers,
  type BusResponse,
  type Route,
  type Driver
} from "@/services/api"
import {
  getStatusSortOrder,
  matchesStatusFilter,
  normalizeBusStatuses,
} from "@/lib/bus-status"

interface Toast {
  type: "success" | "error"
  message: string
}

interface BusWithDriverName extends Bus {
  id?: string
  driverName?: string
  currentLat?: number
  currentLng?: number
  createdAt?: string
  updatedAt?: string
}

const ROUTE_CACHE_KEY = "busRouteCache"

interface FetchAllDataOptions {
  silent?: boolean
}

const loadRouteCache = (): Record<string, string> => {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(ROUTE_CACHE_KEY)
    return raw ? JSON.parse(raw) as Record<string, string> : {}
  } catch {
    return {}
  }
}

const saveRouteToCache = (key: string, routeName: string | undefined) => {
  if (typeof window === "undefined" || !routeName) return
  try {
    const cache = loadRouteCache()
    cache[key] = routeName
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore cache write errors
  }
}

const extractList = <T,>(input: unknown, keys: string[]): T[] => {
  // If it's already an array, just return it
  if (Array.isArray(input)) return input as T[]

  const seen = new Set<unknown>()
  const queue: unknown[] = []
  if (input && typeof input === "object") queue.push(input)

  while (queue.length) {
    const current = queue.shift()
    if (!current || typeof current !== "object" || seen.has(current)) continue
    seen.add(current)

    const obj = current as Record<string, unknown>

    // Prefer explicit keys first
    for (const key of keys) {
      const value = obj[key]
      if (Array.isArray(value)) return value as T[]
      if (value && typeof value === "object") queue.push(value)
    }

    // If nothing found, enqueue any object values to search breadth-first (shallow recursion guard by Set)
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[]
      if (value && typeof value === "object") queue.push(value)
    }
  }

  return []
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "response" in err) {
    const maybe = err as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    if (typeof msg === "string" && msg.trim()) return msg
  }
  return fallback
}

export default function BusesPage() {
  const [buses, setBuses] = useState<BusWithDriverName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false)
  const [selectedRouteName, setSelectedRouteName] = useState<string>("")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [routeFilter, setRouteFilter] = useState("All Routes")
  const [searchQuery, setSearchQuery] = useState("")
  const [fleetStatusFilter, setFleetStatusFilter] = useState("ALL")
  const [tripStatusFilter, setTripStatusFilter] = useState("ALL")
  const [trackingStatusFilter, setTrackingStatusFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("NUMBER_PLATE_ASC")

  const [selectedBus, setSelectedBus] = useState<BusWithDriverName | null>(null)

  // Fetch initial data
  const fetchAllData = useCallback(async ({ silent = false }: FetchAllDataOptions = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const [busesRes, routesRes, driversRes] = await Promise.allSettled([
        getBuses(),
        getRoutes(),
        getDrivers(),
      ])

      let busesData: BusResponse[] = []
      let routesData: Route[] = []
      let driversData: Driver[] = []
      const routeCache = loadRouteCache()

      if (busesRes.status === "fulfilled") {
        busesData = extractList<BusResponse>(busesRes.value.data, ["buses", "data"])
      } else {
        if (!silent) {
          showToast("error", getErrorMessage(busesRes.reason, "Failed to fetch buses."))
        }
      }

      if (routesRes.status === "fulfilled") {
        routesData = extractList<Route>(routesRes.value.data, ["routes", "data"])
        setRoutes(routesData)
      }

      if (driversRes.status === "fulfilled") {
        driversData = extractList<Driver>(driversRes.value.data, ["drivers", "data"])
      } else {
        // Drivers are optional for showing buses; degrade gracefully
        if (!silent) {
          showToast("error", "Drivers unavailable (404). You can still view buses.")
        }
        driversData = []
      }

      // Map routes for quick lookup by id/name (support varied backend keys)
      const routeLookup = new Map<string, string>()
      routesData.forEach((r) => {
        const typedRoute = r as unknown as {
          _id?: string
          id?: string
          routeId?: string
          route_id?: string
          name?: string
        }
        const keys = [typedRoute._id, typedRoute.id, typedRoute.routeId, typedRoute.route_id, typedRoute.name]
        keys.filter(Boolean).forEach((key) => {
          if (key && typedRoute.name) routeLookup.set(String(key), typedRoute.name)
        })
      })

      // Map drivers by multiple identifiers for matching
      const driverLookup = new Map<string, Driver>()
      driversData.forEach((d) => {
        [d._id, d.id, d.memberId].forEach((key) => {
          if (key) driverLookup.set(String(key), d)
        })
      })

      // Enrich buses with driver names from driver list
      const extractBusDriverIds = (bus: BusResponse) => {
        const typedBus = bus as unknown as {
          driverId?: string | number
          driver_id?: string | number
          driverMemberId?: string | number
          driver_member_id?: string | number
          driver?: { memberId?: string | number; _id?: string | number; id?: string | number }
        }

        return [
          typedBus.driverId,
          typedBus.driver_id,
          typedBus.driverMemberId,
          typedBus.driver_member_id,
          typedBus.driver?.memberId,
          typedBus.driver?._id,
          typedBus.driver?.id,
        ].filter(Boolean) as Array<string | number>
      }

      const busesWithDriverNames = busesData.map((bus) => {
        const candidateKeys = extractBusDriverIds(bus)

        // Normalize route name/id if backend embeds route object
        const typedBus = bus as unknown as {
          route?: { name?: string; _id?: string; id?: string; routeId?: string; route_id?: string; routeName?: string }
          routeId?: string
          route_id?: string
          routeName?: string
        }
        const normalizedRouteId = typedBus.routeId
          ?? typedBus.route_id
          ?? typedBus.route?.routeId
          ?? typedBus.route?.route_id
          ?? typedBus.route?._id
          ?? typedBus.route?.id
        const normalizedRouteName = typedBus.routeName
          ?? typedBus.route?.name
          ?? typedBus.route?.routeName
          ?? (normalizedRouteId ? routeLookup.get(String(normalizedRouteId)) : undefined)
          ?? (typedBus.route ? undefined : undefined)

        let driverMatch: Driver | undefined
        for (const key of candidateKeys) {
          const match = driverLookup.get(String(key))
          if (match) {
            driverMatch = match
            break
          }
        }

        const cacheKey = String(bus._id || (bus as unknown as { id?: string }).id || bus.numberPlate)

        return {
          ...bus,
          driverName: driverMatch?.name,
          routeName: normalizedRouteName ?? bus.routeName ?? routeCache[cacheKey],
          routeId: normalizedRouteId ?? (bus as unknown as { routeId?: string }).routeId,
        }
      })

      // Build assignment map: driver identifier -> bus number
      const assignmentMap = new Map<string, string>()
      busesWithDriverNames.forEach((bus) => {
        const identifiers = extractBusDriverIds(bus as BusResponse)
        identifiers.forEach((id) => {
          assignmentMap.set(String(id), bus.numberPlate)
        })
      })

      const driversWithAssignment = driversData.map((d) => {
        const candidateKeys = [d._id, d.id, d.memberId].filter(Boolean) as Array<string | number>
        const assigned = candidateKeys.map((k) => assignmentMap.get(String(k))).find(Boolean)
        const clone: Driver = { ...d }
        if (assigned) {
          clone.assignedBusNumber = assigned
        } else if ("assignedBusNumber" in clone) {
          delete (clone as { assignedBusNumber?: string }).assignedBusNumber
        }
        return clone
      })

      setBuses(busesWithDriverNames)
      setDrivers(driversWithAssignment)
      setSelectedBus((current) => {
        if (!current) return current

        const currentKey = String(current._id || current.id || current.numberPlate)
        const latest = busesWithDriverNames.find((bus) => {
          const key = String(bus._id || bus.id || bus.numberPlate)
          return key === currentKey
        })

        return latest ? { ...current, ...latest } : current
      })
    } catch (err) {
      console.error("Failed to fetch data:", err)
      if (!silent) {
        showToast("error", getErrorMessage(err, "Failed to fetch buses. Please try again."))
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchAllData()
  }, [fetchAllData])

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  const busesWithCanonicalStatus = useMemo(() => {
    return buses.map((bus) => {
      const normalized = normalizeBusStatuses(bus)
      return {
        ...bus,
        fleetStatus: normalized.fleetStatus,
        tripStatus: normalized.tripStatus,
        trackingStatus: normalized.trackingStatus,
      }
    })
  }, [buses])

  const filteredBuses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const list = busesWithCanonicalStatus.filter((bus) => {
      const routeMatches = routeFilter === "All Routes" || bus.routeName === routeFilter
      const fleetMatches = matchesStatusFilter(bus.fleetStatus, fleetStatusFilter)
      const tripMatches = matchesStatusFilter(bus.tripStatus, tripStatusFilter)
      const trackingMatches = matchesStatusFilter(bus.trackingStatus, trackingStatusFilter)

      const searchMatches =
        query.length === 0 ||
        [bus.numberPlate, bus.routeName, bus.driverName, bus.driverId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))

      return routeMatches && fleetMatches && tripMatches && trackingMatches && searchMatches
    })

    return list.sort((left, right) => {
      if (sortBy === "NUMBER_PLATE_DESC") {
        return right.numberPlate.localeCompare(left.numberPlate)
      }

      if (sortBy === "FLEET_STATUS") {
        const diff = getStatusSortOrder("fleet", left.fleetStatus) - getStatusSortOrder("fleet", right.fleetStatus)
        return diff !== 0 ? diff : left.numberPlate.localeCompare(right.numberPlate)
      }

      if (sortBy === "TRIP_STATUS") {
        const diff = getStatusSortOrder("trip", left.tripStatus) - getStatusSortOrder("trip", right.tripStatus)
        return diff !== 0 ? diff : left.numberPlate.localeCompare(right.numberPlate)
      }

      if (sortBy === "TRACKING_STATUS") {
        const diff = getStatusSortOrder("tracking", left.trackingStatus) - getStatusSortOrder("tracking", right.trackingStatus)
        return diff !== 0 ? diff : left.numberPlate.localeCompare(right.numberPlate)
      }

      return left.numberPlate.localeCompare(right.numberPlate)
    })
  }, [
    busesWithCanonicalStatus,
    routeFilter,
    searchQuery,
    fleetStatusFilter,
    tripStatusFilter,
    trackingStatusFilter,
    sortBy,
  ])

  const handleAddBus = useCallback(async (numberPlate: string, routeName: string) => {
    try {
      setLoading(true)
      const response = await createBus({
        numberPlate: numberPlate.toUpperCase(),
        routeName: routeName && routeName !== "None" ? routeName : undefined
      })

      const newBus = response.data.bus
      setBuses(prev => [newBus, ...prev])
      const cacheKey = String(newBus._id || (newBus as unknown as { id?: string }).id || newBus.numberPlate)
      saveRouteToCache(cacheKey, newBus.routeName ?? routeName)
      setIsAddDialogOpen(false)
      showSuccess("Bus created successfully!")
    } catch (err: unknown) {
      showError(getErrorMessage(err, "Failed to create bus"))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAssignDriver = useCallback(async (memberId: string) => {
    if (!selectedBus) return

    try {
      setLoading(true)
      const busId = selectedBus._id || selectedBus.id || ""
      const response = await updateBusDriver(busId, {
        memberId
      })

      const updatedBus = response.data.bus
      const driver = drivers.find((d) => d.memberId === memberId)
      const driverName = driver?.name

      setBuses(prev =>
        prev.map((bus, idx) => {
          const idMatch = bus._id && selectedBus._id && bus._id === selectedBus._id
          const idxMatch = selectedIndex !== null && idx === selectedIndex
          return (idMatch || idxMatch)
            ? { ...updatedBus, driverName }
            : bus
        })
      )

      // Reflect assignment on drivers list for driver page + reuse
      setDrivers(prev => prev.map(d => {
        const id = d._id || d.id
        if (d.memberId === memberId) {
          return { ...d, assignedBusNumber: selectedBus.numberPlate }
        }
        if (selectedBus.driverId && id === selectedBus.driverId) {
          const clone = { ...d }
          delete (clone as { assignedBusNumber?: string }).assignedBusNumber
          return clone
        }
        return d
      }))
      setSelectedBus(null)
      setSelectedIndex(null)
      setIsAssignDriverDialogOpen(false)
      showSuccess("Driver assigned successfully!")
    } catch (err: unknown) {
      showError(getErrorMessage(err, "Failed to assign driver"))
    } finally {
      setLoading(false)
    }
  }, [drivers, selectedBus, selectedIndex])

  const handleOpenRouteDialog = useCallback((bus: BusWithDriverName, idx: number) => {
    setSelectedBus(bus)
    setSelectedIndex(idx)
    setSelectedRouteName(bus.routeName || "")
    setIsRouteDialogOpen(true)
  }, [])

  const handleUpdateRoute = useCallback(async () => {
    if (!selectedBus) return
    try {
      setLoading(true)
      const busId = selectedBus._id || selectedBus.id || ""
      const response = await updateBusRoute(busId, { routeName: selectedRouteName })
      const updatedBus = response.data.bus
      const cacheKey = String(selectedBus._id || selectedBus.id || selectedBus.numberPlate)
      saveRouteToCache(cacheKey, selectedRouteName)

      setBuses(prev => prev.map((bus, idx) => {
        const idMatch = bus._id && selectedBus._id && bus._id === selectedBus._id
        const idxMatch = selectedIndex !== null && idx === selectedIndex
        return (idMatch || idxMatch)
          ? { ...updatedBus, driverName: bus.driverName }
          : bus
      }))

      setIsRouteDialogOpen(false)
      setSelectedBus(null)
      setSelectedIndex(null)
      showSuccess("Route updated")
    } catch (err: unknown) {
      showError(getErrorMessage(err, "Failed to update route"))
    } finally {
      setLoading(false)
    }
  }, [selectedBus, selectedRouteName, selectedIndex])

  const handleDeleteBus = useCallback(async () => {
    if (!selectedBus) return

    try {
      setLoading(true)
      const busId = selectedBus._id || selectedBus.id || ""
      await deleteBus(busId)

      const cacheKey = String(selectedBus._id || selectedBus.id || selectedBus.numberPlate)
      if (typeof window !== "undefined") {
        try {
          const cache = loadRouteCache()
          delete cache[cacheKey]
          localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cache))
        } catch {
          // ignore cache errors
        }
      }

      setBuses(prev => prev.filter((bus, idx) => {
        const idMatch = bus._id && selectedBus._id && bus._id === selectedBus._id
        const idxMatch = selectedIndex !== null && idx === selectedIndex
        return !(idMatch || idxMatch)
      }))
      setSelectedBus(null)
      setSelectedIndex(null)
      setIsDeleteDialogOpen(false)
      showSuccess("Bus deleted successfully!")
    } catch (err: unknown) {
      showError(getErrorMessage(err, "Failed to delete bus"))
    } finally {
      setLoading(false)
    }
  }, [selectedBus, selectedIndex])

  const handleViewBus = useCallback(async (bus: BusWithDriverName) => {
    try {
      const busId = bus._id || bus.id || ""
      const response = await getBusById(busId)
      setSelectedBus({
        ...bus,
        ...(response.data.bus as BusWithDriverName),
      })
      setIsViewDialogOpen(true)
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to fetch bus details"))
    }
  }, [])

  const uniqueRoutes = useMemo(() => {
    const routeNames = new Set(buses.map(b => b.routeName).filter((r): r is string => !!r))
    return Array.from(routeNames)
  }, [buses])

  return (
    <>
      <Header onToggleSidebar={() => { }} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
            }`}
        >
          {toast.type === "success"
            ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toast.message}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Messages */}
        {error && (
          <Card className="border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {successMessage && (
          <Card className="border-l-4 border-green-500 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </Card>
        )}

        {/* Header Section */}
        <section className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Bus Fleet</h1>
            <p className="text-sm text-gray-500">
              Monitor and manage {buses.length} vehicle{buses.length !== 1 ? 's' : ''} in your fleet
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            disabled={loading}
            className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors gap-2 shadow-sm"
          >
            <Plus className="size-5" />
            Add Bus
          </Button>
        </section>

        {/* Loading State */}
        {loading && buses.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600">Loading buses...</p>
            </div>
          </Card>
        ) : (
          <BusTable
            buses={filteredBuses.map(b => ({
              id: b.id,
              _id: b._id,
              numberPlate: b.numberPlate,
              routeName: b.routeName,
              routeId: b.routeId,
              fleetStatus: b.fleetStatus,
              tripStatus: b.tripStatus,
              status: b.status,
              trackingStatus: b.trackingStatus,
              driverName: b.driverName,
              driverId: b.driverId,
              currentLat: b.currentLat,
              currentLng: b.currentLng,
              speed: b.speed,
            }))}
            routes={uniqueRoutes}
            searchQuery={searchQuery}
            routeFilter={routeFilter}
            fleetStatusFilter={fleetStatusFilter}
            tripStatusFilter={tripStatusFilter}
            trackingStatusFilter={trackingStatusFilter}
            sortBy={sortBy}
            onSearchQueryChange={setSearchQuery}
            onRouteFilterChange={setRouteFilter}
            onFleetStatusFilterChange={setFleetStatusFilter}
            onTripStatusFilterChange={setTripStatusFilter}
            onTrackingStatusFilterChange={setTrackingStatusFilter}
            onSortByChange={setSortBy}
            onClearFilters={() => {
              setSearchQuery("")
              setRouteFilter("All Routes")
              setFleetStatusFilter("ALL")
              setTripStatusFilter("ALL")
              setTrackingStatusFilter("ALL")
              setSortBy("NUMBER_PLATE_ASC")
            }}
            onAssignDriver={(bus, idx) => {
              const matchIndex = buses.findIndex(b =>
                (b._id && bus._id && b._id === bus._id)
                || (b.id && bus.id && b.id === bus.id)
                || b.numberPlate === bus.numberPlate
              )
              const resolvedIndex = matchIndex !== -1 ? matchIndex : idx
              const match = matchIndex !== -1 ? buses[matchIndex] : buses[resolvedIndex]

              setSelectedBus(match || null)
              setSelectedIndex(resolvedIndex)
              setIsAssignDriverDialogOpen(true)
            }}
            onChangeRoute={(bus, idx) => {
              const matchIndex = buses.findIndex(b =>
                (b._id && bus._id && b._id === bus._id)
                || (b.id && bus.id && b.id === bus.id)
                || b.numberPlate === bus.numberPlate
              )
              const resolvedIndex = matchIndex !== -1 ? matchIndex : idx
              const match = matchIndex !== -1 ? buses[matchIndex] : buses[resolvedIndex]

              if (match) handleOpenRouteDialog(match, resolvedIndex)
            }}
            onViewBus={(bus) => handleViewBus(bus)}
            onDeleteBus={(bus, idx) => {
              const matchIndex = buses.findIndex(b =>
                (b._id && bus._id && b._id === bus._id)
                || (b.id && bus.id && b.id === bus.id)
                || b.numberPlate === bus.numberPlate
              )
              const resolvedIndex = matchIndex !== -1 ? matchIndex : idx
              const match = matchIndex !== -1 ? buses[matchIndex] : buses[resolvedIndex]

              setSelectedBus(match || null)
              setSelectedIndex(resolvedIndex)
              setIsDeleteDialogOpen(true)
            }}
          />
        )}
      </main>

      {/* Dialogs */}
      <AddBusDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddBus}
        routes={routes}
      />

      <AssignDriverDialog
        open={isAssignDriverDialogOpen}
        onOpenChange={setIsAssignDriverDialogOpen}
        onSubmit={handleAssignDriver}
        drivers={drivers}
        selectedBus={selectedBus}
      />

      <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Change Route</DialogTitle>
            <DialogDescription>
              Select a route to assign to this bus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Route</label>
            <select
              value={selectedRouteName}
              onChange={(e) => setSelectedRouteName(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {routes.map((route) => (
                <option key={route._id || route.name} value={route.name}>{route.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRouteDialogOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleUpdateRoute} disabled={loading} className="rounded-lg bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViewBusDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        bus={selectedBus ?? undefined}
      />

      <DeleteBusDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteBus}
        bus={selectedBus}
      />
    </>
  )
}
