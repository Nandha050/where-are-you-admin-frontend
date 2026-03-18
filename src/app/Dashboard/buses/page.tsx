"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Plus, AlertCircle, CheckCircle } from "lucide-react"

import { AddBusDialog } from "@/components/buses/add-bus-dialog"
import { AssignDriverDialog } from "@/components/buses/assign-driver-dialog"
import { BusTable, type Bus } from "@/components/buses/bus-table"
import { DeleteBusDialog } from "@/components/buses/delete-bus-dialog"
import { ViewBusDialog } from "@/components/buses/view-bus-dialog"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
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
  postBusTripEvent,
  deleteBus,
  getBusById,
  getRoutes,
  getDrivers,
  type BusResponse,
  type Route,
  type Driver
} from "@/services/api"
import {
  getStatusMeta,
  getStatusSortOrder,
  matchesStatusFilter,
  normalizeBusStatuses,
} from "@/lib/bus-status"
import { useBusLiveTracking } from "@/realtime/hooks"

interface Toast {
  type: "success" | "error"
  message: string
}

type RouteChangeActionState = "idle" | "validating" | "blocked" | "submitting" | "success" | "failed"

interface RouteChangeConflictMetadata {
  isConflict: boolean
  action?: string
  message: string
}

const ROUTE_CONFLICT_ACTION = "complete_or_cancel_trip_then_retry"

interface RouteChangeErrorInfo {
  status?: number
  action?: string
  isConflict: boolean
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
    if (typeof msg === "string" && msg.trim()) {
      const normalized = msg.toLowerCase()
      if (normalized.includes("invalid trip status transition") && normalized.includes("on_trip")) {
        return "Cannot change route while bus is on an active trip. Complete or cancel the trip first."
      }
      return msg
    }
  }
  return fallback
}

const mapRouteChangeError = (err: unknown, fallback: string): RouteChangeErrorInfo => {
  const status = (err as { response?: { status?: number } })?.response?.status
  const data = (err as { response?: { data?: { message?: unknown; action?: unknown } } })?.response?.data
  const action = typeof data?.action === "string" ? data.action : undefined
  const backendMessage = typeof data?.message === "string" ? data.message.toLowerCase() : ""

  if (status === 409 && action === ROUTE_CONFLICT_ACTION) {
    return {
      status,
      action,
      isConflict: true,
      message: "Trip is active. Complete or cancel it before changing route.",
    }
  }

  if (status === 404 && backendMessage.includes("route")) {
    return {
      status,
      action,
      isConflict: false,
      message: "Selected route does not exist. Refresh route list and try again.",
    }
  }

  if (status === 404 && backendMessage.includes("bus")) {
    return {
      status,
      action,
      isConflict: false,
      message: "Bus no longer exists. Refresh bus list.",
    }
  }

  if (status === 401) {
    return {
      status,
      action,
      isConflict: false,
      message: "Session expired. Please sign in again.",
    }
  }

  return {
    status,
    action,
    isConflict: false,
    message: fallback,
  }
}

const isRouteChangeBlockedByTripState = (bus: Pick<BusWithDriverName, "tripStatus">) => {
  const normalized = bus.tripStatus ? String(bus.tripStatus).trim().toUpperCase().replace(/[\s-]+/g, "_") : ""
  return normalized === "ON_TRIP" || normalized === "DELAYED"
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
  const [routeChangeState, setRouteChangeState] = useState<RouteChangeActionState>("idle")
  const [routeChangeConflict, setRouteChangeConflict] = useState<RouteChangeConflictMetadata | null>(null)
  const [isRouteStatusSyncing, setIsRouteStatusSyncing] = useState(false)
  const [tripEventSubmitting, setTripEventSubmitting] = useState<"trip_completed" | "trip_cancelled" | null>(null)

  const [routeFilter, setRouteFilter] = useState("All Routes")
  const [searchQuery, setSearchQuery] = useState("")
  const [fleetStatusFilter, setFleetStatusFilter] = useState("ALL")
  const [tripStatusFilter, setTripStatusFilter] = useState("ALL")
  const [trackingStatusFilter, setTrackingStatusFilter] = useState("ALL")
  const [sortBy, setSortBy] = useState("NUMBER_PLATE_ASC")

  const [selectedBus, setSelectedBus] = useState<BusWithDriverName | null>(null)

  const selectedBusId = selectedBus?._id || selectedBus?.id || ""
  const selectedBusLive = useBusLiveTracking(selectedBusId, [selectedBus?._id, selectedBus?.id, selectedBus?.numberPlate])

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
          const key = String(bus._id || (bus as unknown as { id?: string }).id || bus.numberPlate)
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

  const syncSelectedBusSnapshot = useCallback(async (busId: string, options?: { silent?: boolean }) => {
    if (!busId) return null

    setIsRouteStatusSyncing(true)
    try {
      const response = await getBusById(busId)
      const freshBus = response.data.bus as BusWithDriverName

      setBuses((prev) =>
        prev.map((bus, idx) => {
          const idMatch = bus._id && freshBus._id && bus._id === freshBus._id
          const fallbackIdMatch = bus.id && freshBus.id && bus.id === freshBus.id
          const idxMatch = selectedIndex !== null && idx === selectedIndex

          if (!(idMatch || fallbackIdMatch || idxMatch)) return bus

          return {
            ...bus,
            ...freshBus,
            driverName: freshBus.driverName ?? bus.driverName,
          }
        })
      )

      setSelectedBus((current) => {
        if (!current) return current

        const sameBus =
          (current._id && freshBus._id && current._id === freshBus._id) ||
          (current.id && freshBus.id && current.id === freshBus.id) ||
          current.numberPlate === freshBus.numberPlate

        if (!sameBus) return current

        return {
          ...current,
          ...freshBus,
          driverName: freshBus.driverName ?? current.driverName,
        }
      })

      return freshBus
    } catch (err: unknown) {
      if (!options?.silent) {
        const mapped = mapRouteChangeError(err, "Failed to refresh bus status.")
        showToast("error", mapped.message)
      }
      console.error("[route-change] bus status refresh failed", err)
      return null
    } finally {
      setIsRouteStatusSyncing(false)
    }
  }, [selectedIndex])

  useEffect(() => {
    if (!isRouteDialogOpen || !selectedBus) return
    if (selectedBusLive.lastUpdatedText === "never") return

    const liveTrackingStatus = selectedBusLive.trackingStatus as BusWithDriverName["trackingStatus"] | undefined

    setSelectedBus((current) => {
      if (!current) return current

      const sameBus =
        (selectedBus._id && current._id && selectedBus._id === current._id) ||
        (selectedBus.id && current.id && selectedBus.id === current.id) ||
        selectedBus.numberPlate === current.numberPlate

      if (!sameBus) return current

      return {
        ...current,
        currentLat: selectedBusLive.location?.lat ?? current.currentLat,
        currentLng: selectedBusLive.location?.lng ?? current.currentLng,
        speed: typeof selectedBusLive.speed === "number" ? selectedBusLive.speed : current.speed,
        trackingStatus: liveTrackingStatus ?? current.trackingStatus,
      }
    })
  }, [isRouteDialogOpen, selectedBus, selectedBusLive.lastUpdatedText, selectedBusLive.location?.lat, selectedBusLive.location?.lng, selectedBusLive.speed, selectedBusLive.trackingStatus])

  useEffect(() => {
    if (!isRouteDialogOpen || !selectedBusId) return
    if (selectedBusLive.isConnected) return

    void syncSelectedBusSnapshot(selectedBusId, { silent: true })

    const pollId = window.setInterval(() => {
      void syncSelectedBusSnapshot(selectedBusId, { silent: true })
    }, 20000)

    return () => {
      window.clearInterval(pollId)
    }
  }, [isRouteDialogOpen, selectedBusId, selectedBusLive.isConnected, syncSelectedBusSnapshot])

  useEffect(() => {
    if (!isRouteDialogOpen || !selectedBusId) return

    let cancelled = false
    setRouteChangeState("validating")
    setRouteChangeConflict(null)

    void syncSelectedBusSnapshot(selectedBusId, { silent: true }).then((freshBus) => {
      if (cancelled || !freshBus) return

      if (isRouteChangeBlockedByTripState(freshBus)) {
        setRouteChangeState("blocked")
        setRouteChangeConflict({
          isConflict: true,
          action: ROUTE_CONFLICT_ACTION,
          message: "Cannot change route while trip is active. Complete or cancel the trip first.",
        })
        return
      }

      setRouteChangeState("idle")
    })

    return () => {
      cancelled = true
    }
  }, [isRouteDialogOpen, selectedBusId, syncSelectedBusSnapshot])

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
    setRouteChangeState("idle")
    setRouteChangeConflict(null)
    setTripEventSubmitting(null)
    setIsRouteDialogOpen(true)
  }, [])

  const dismissRouteConflict = useCallback(() => {
    setRouteChangeConflict(null)
    setRouteChangeState("idle")
  }, [])

  const handleResolveRouteConflict = useCallback(async (eventType: "trip_completed" | "trip_cancelled") => {
    if (!selectedBus) return

    const busId = selectedBus._id || selectedBus.id || ""
    if (!busId) return

    setTripEventSubmitting(eventType)
    setRouteChangeState("validating")

    try {
      await postBusTripEvent(busId, { eventType })
      const refreshed = await syncSelectedBusSnapshot(busId)

      if (!refreshed) {
        setRouteChangeState("failed")
        return
      }

      if (isRouteChangeBlockedByTripState(refreshed)) {
        setRouteChangeState("blocked")
        setRouteChangeConflict({
          isConflict: true,
          action: ROUTE_CONFLICT_ACTION,
          message: "Trip is still active. Wait a moment and try again.",
        })
        return
      }

      setRouteChangeConflict(null)
      setRouteChangeState("idle")
      showToast("success", eventType === "trip_completed" ? "Trip completed. You can reassign route now." : "Trip cancelled. You can reassign route now.")
    } catch (err: unknown) {
      const mapped = mapRouteChangeError(err, "Failed to update trip status.")
      setRouteChangeState("failed")
      showToast("error", mapped.message)
      console.error("[route-change] trip-event resolution failed", err)
    } finally {
      setTripEventSubmitting(null)
    }
  }, [selectedBus, syncSelectedBusSnapshot])

  const handleUpdateRoute = useCallback(async () => {
    if (!selectedBus) return

    const busId = selectedBus._id || selectedBus.id || ""
    if (!busId) return

    setRouteChangeConflict(null)
    setRouteChangeState("validating")

    const latestBus = await syncSelectedBusSnapshot(busId)
    if (!latestBus) {
      setRouteChangeState("failed")
      return
    }

    if (isRouteChangeBlockedByTripState(latestBus)) {
      setRouteChangeState("blocked")
      setRouteChangeConflict({
        isConflict: true,
        action: ROUTE_CONFLICT_ACTION,
        message: "Cannot change route while trip is active. Complete or cancel the trip first.",
      })
      return
    }

    try {
      setRouteChangeState("submitting")
      setLoading(true)
      const response = await updateBusRoute(busId, { routeName: selectedRouteName })
      const updatedBus = response.data.bus as BusWithDriverName
      const cacheKey = String(selectedBus._id || selectedBus.id || selectedBus.numberPlate)
      saveRouteToCache(cacheKey, selectedRouteName)

      setBuses(prev => prev.map((bus, idx) => {
        const idMatch = bus._id && selectedBus._id && bus._id === selectedBus._id
        const idxMatch = selectedIndex !== null && idx === selectedIndex
        return (idMatch || idxMatch)
          ? { ...updatedBus, driverName: bus.driverName }
          : bus
      }))

      await syncSelectedBusSnapshot(busId, { silent: true })

      setRouteChangeState("success")
      setIsRouteDialogOpen(false)
      setSelectedBus(null)
      setSelectedIndex(null)
      setRouteChangeConflict(null)
      setTripEventSubmitting(null)
      showSuccess("Route updated")
    } catch (err: unknown) {
      const mapped = mapRouteChangeError(err, "Failed to update route.")
      console.error("[route-change] update failed", err)

      if (mapped.isConflict && mapped.action === ROUTE_CONFLICT_ACTION) {
        setRouteChangeState("blocked")
        setRouteChangeConflict({
          isConflict: true,
          action: mapped.action,
          message: mapped.message,
        })
        return
      }

      if (mapped.status === 404 && mapped.message.includes("Selected route does not exist")) {
        try {
          const routesRes = await getRoutes()
          const routesData = extractList<Route>(routesRes.data, ["routes", "data"])
          setRoutes(routesData)
        } catch (refreshErr) {
          console.error("[route-change] route refresh failed", refreshErr)
        }
      }

      if (mapped.status === 404 && mapped.message.includes("Bus no longer exists")) {
        void fetchAllData({ silent: true })
        setIsRouteDialogOpen(false)
        setSelectedBus(null)
        setSelectedIndex(null)
      }

      setRouteChangeState("failed")
      showError(mapped.message)
    } finally {
      setLoading(false)
    }
  }, [fetchAllData, selectedBus, selectedRouteName, selectedIndex, syncSelectedBusSnapshot])

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

  const selectedFleetMeta = getStatusMeta("fleet", selectedBus?.fleetStatus ?? selectedBus?.status)
  const selectedTripMeta = getStatusMeta("trip", selectedBus?.tripStatus)
  const selectedTrackingMeta = getStatusMeta("tracking", selectedBus?.trackingStatus)

  const isRouteBlockedByTrip = selectedBus ? isRouteChangeBlockedByTripState(selectedBus) : false
  const isRouteActionLocked =
    loading ||
    isRouteStatusSyncing ||
    routeChangeState === "validating" ||
    routeChangeState === "submitting" ||
    Boolean(tripEventSubmitting)
  const hasRouteChanged = selectedRouteName !== (selectedBus?.routeName || "")
  const canSubmitRouteChange =
    Boolean(selectedBus && selectedRouteName) &&
    hasRouteChanged &&
    !isRouteActionLocked &&
    !isRouteBlockedByTrip &&
    !routeChangeConflict?.isConflict

  const handleRouteDialogOpenChange = useCallback((nextOpen: boolean) => {
    setIsRouteDialogOpen(nextOpen)
    if (!nextOpen) {
      setRouteChangeState("idle")
      setRouteChangeConflict(null)
      setTripEventSubmitting(null)
      setIsRouteStatusSyncing(false)
    }
  }, [])

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

      <Dialog open={isRouteDialogOpen} onOpenChange={handleRouteDialogOpenChange}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Change Route</DialogTitle>
            <DialogDescription>
              {selectedBus ? `Select a route to assign to ${selectedBus.numberPlate}.` : "Select a route to assign to this bus."}
            </DialogDescription>
          </DialogHeader>

          {selectedBus && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Status</div>
              <div className="flex flex-wrap gap-2">
                <Badge className={`rounded-full border-0 ${selectedFleetMeta.badgeClassName}`}>
                  Fleet: {selectedFleetMeta.label}
                </Badge>
                <Badge className={`rounded-full border-0 ${selectedTripMeta.badgeClassName}`}>
                  Trip: {selectedTripMeta.label}
                </Badge>
                <Badge className={`rounded-full border-0 ${selectedTrackingMeta.badgeClassName}`}>
                  Tracking: {selectedTrackingMeta.label}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {isRouteStatusSyncing || routeChangeState === "validating"
                  ? "Syncing latest backend status..."
                  : selectedBusLive.isConnected
                    ? "Live tracking connected. Status validated with backend snapshot."
                    : "Live tracking disconnected. Backend snapshot auto-refresh runs every 20 seconds."}
              </p>
            </div>
          )}

          {(isRouteBlockedByTrip || routeChangeState === "blocked") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Cannot change route while trip is active. Complete or cancel the trip first.
            </div>
          )}

          {routeChangeConflict?.isConflict && routeChangeConflict.action === ROUTE_CONFLICT_ACTION && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
              <p className="text-sm text-red-800">{routeChangeConflict.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleResolveRouteConflict("trip_completed")}
                  disabled={isRouteActionLocked}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
                >
                  {tripEventSubmitting === "trip_completed" ? "Completing..." : "Complete Trip"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleResolveRouteConflict("trip_cancelled")}
                  disabled={isRouteActionLocked}
                  className="rounded-lg"
                >
                  {tripEventSubmitting === "trip_cancelled" ? "Cancelling..." : "Cancel Trip"}
                </Button>
                <Button type="button" variant="outline" onClick={dismissRouteConflict} disabled={isRouteActionLocked} className="rounded-lg">
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Route</label>
            <select
              value={selectedRouteName}
              onChange={(e) => setSelectedRouteName(e.target.value)}
              disabled={isRouteActionLocked}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {routes.map((route) => (
                <option key={route._id || route.name} value={route.name}>{route.name}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleRouteDialogOpenChange(false)} className="rounded-lg" disabled={routeChangeState === "submitting" || routeChangeState === "validating"}>Cancel</Button>
            <Button
              onClick={() => void handleUpdateRoute()}
              disabled={!canSubmitRouteChange}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              {routeChangeState === "validating" ? "Validating..." : routeChangeState === "submitting" ? "Saving..." : "Save"}
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
