"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Plus, AlertCircle } from "lucide-react"

import { AddBusDialog } from "@/components/buses/add-bus-dialog"
import { AssignDriverDialog } from "@/components/buses/assign-driver-dialog"
import { BusTable, type Bus } from "@/components/buses/bus-table"
import { DeleteBusDialog } from "@/components/buses/delete-bus-dialog"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  getBuses,
  createBus,
  updateBusDriver,
  deleteBus,
  getBusById,
  getRoutes,
  getDrivers,
  type BusResponse,
  type Route,
  type Driver
} from "@/services/api"

interface BusWithDriverName extends BusResponse {
  driverName?: string
  routeName?: string
  id?: string
}

export default function BusesPage() {
  const [buses, setBuses] = useState<BusWithDriverName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const [routeFilter, setRouteFilter] = useState("All Routes")
  const [statusFilter, setStatusFilter] = useState("All Status")

  const [selectedBus, setSelectedBus] = useState<BusWithDriverName | null>(null)

  // Fetch initial data
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [busesRes, routesRes, driversRes] = await Promise.all([
        getBuses(),
        getRoutes(),
        getDrivers()
      ])

      // Extract buses data
      const busesData = (Array.isArray(busesRes.data)
        ? busesRes.data
        : ((busesRes.data as any).buses || (busesRes.data as any).data || [])) as BusResponse[]
      setBuses(busesData)

      // Extract routes data
      const routesData = (Array.isArray(routesRes.data)
        ? routesRes.data
        : ((routesRes.data as any).routes || (routesRes.data as any).data || [])) as Route[]
      setRoutes(routesData)

      // Extract drivers data
      const driversData = (Array.isArray(driversRes.data)
        ? driversRes.data
        : ((driversRes.data as any).drivers || (driversRes.data as any).data || [])) as Driver[]
      setDrivers(driversData)
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("Failed to fetch buses. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const routeMatches = routeFilter === "All Routes" || bus.routeName === routeFilter
      const statusMatches = statusFilter === "All Status" || bus.status === statusFilter
      return routeMatches && statusMatches
    }).sort((a, b) => a.numberPlate.localeCompare(b.numberPlate))
  }, [buses, routeFilter, statusFilter])

  const handleAddBus = useCallback(async (numberPlate: string, routeName: string) => {
    try {
      setLoading(true)
      const response = await createBus({
        numberPlate: numberPlate.toUpperCase(),
        routeName: routeName && routeName !== "None" ? routeName : undefined
      })

      const newBus = response.data.bus
      setBuses(prev => [newBus, ...prev])
      setIsAddDialogOpen(false)
      showSuccess("Bus created successfully!")
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create bus")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAssignDriver = useCallback(async (driverId: string) => {
    if (!selectedBus) return

    try {
      setLoading(true)
      const busId = selectedBus._id || selectedBus.id || ""
      const response = await updateBusDriver(busId, {
        driverId
      })

      setBuses(prev =>
        prev.map(bus => (bus._id === selectedBus._id || bus.id === selectedBus.id) ? response.data.bus : bus)
      )
      setSelectedBus(null)
      setIsAssignDriverDialogOpen(false)
      showSuccess("Driver assigned successfully!")
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to assign driver")
    } finally {
      setLoading(false)
    }
  }, [selectedBus])

  const handleDeleteBus = useCallback(async () => {
    if (!selectedBus) return

    try {
      setLoading(true)
      const busId = selectedBus._id || selectedBus.id || ""
      await deleteBus(busId)

      setBuses(prev => prev.filter(bus => (bus._id !== selectedBus._id && bus.id !== selectedBus.id)))
      setSelectedBus(null)
      setIsDeleteDialogOpen(false)
      showSuccess("Bus deleted successfully!")
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to delete bus")
    } finally {
      setLoading(false)
    }
  }, [selectedBus])

  const handleViewBus = useCallback(async (bus: any) => {
    try {
      const busId = bus._id || bus.id || ""
      const response = await getBusById(busId)
      setSelectedBus(response.data.bus as BusWithDriverName)
      setIsViewDialogOpen(true)
    } catch (err: any) {
      showError("Failed to fetch bus details")
    }
  }, [])

  const uniqueRoutes = useMemo(() => {
    const routeNames = new Set(buses.map(b => b.routeName).filter((r): r is string => !!r))
    return Array.from(routeNames)
  }, [buses])

  return (
    <>
      <Header onToggleSidebar={() => { }} />

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
              status: b.status,
              trackingStatus: b.trackingStatus,
              driverName: b.driverName,
            }))}
            routes={uniqueRoutes}
            routeFilter={routeFilter}
            statusFilter={statusFilter}
            onRouteFilterChange={setRouteFilter}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={() => {
              setRouteFilter("All Routes")
              setStatusFilter("All Status")
            }}
            onAssignDriver={(bus) => {
              setSelectedBus(buses.find(b => b._id === bus._id || b.id === bus.id) || null)
              setIsAssignDriverDialogOpen(true)
            }}
            onViewBus={handleViewBus}
            onDeleteBus={(bus) => {
              setSelectedBus(buses.find(b => b._id === bus._id || b.id === bus.id) || null)
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

      {/* ViewBusDialog removed due to missing module */}

      <DeleteBusDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteBus}
        bus={selectedBus}
      />
    </>
  )
}
