"use client"

import { useMemo, useState, useEffect } from "react"
import { Bell, Plus } from "lucide-react"
import axios from "axios"

import { AddBusDialog } from "@/components/buses/add-bus-dialog"
import { AssignDriverDialog } from "@/components/buses/assign-driver-dialog"
import { AssignRouteDialog } from "@/components/buses/assign-route-dialog"
import { BusTable, type Bus } from "@/components/buses/bus-table"
import { DeleteBusDialog } from "@/components/buses/delete-bus-dialog"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebasr"
import { Button } from "@/components/ui/button"

// Regex patterns for input validation
const NUMBER_PLATE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/ // e.g., TS09AB1234
const ROUTE_NAME_REGEX = /^Route \d+$/

// API configuration
const API_BASE_URL = "http://localhost:3000"
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Mock demo buses for testing without backend
const demoBuses: Bus[] = [
  {
    id: "BUS001",
    numberPlate: "TS09AB1234",
    routeName: "Route 42",
    driverId: "D2001",
    driverMemberId: "D2001",
    driverName: "John Doe",
    status: "active",
    lastSeen: "2 mins ago",
    powerOn: true,
  },
]

export default function BusesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [buses, setBuses] = useState<Bus[]>(demoBuses)
  const [loading, setLoading] = useState(false)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAssignRouteDialogOpen, setIsAssignRouteDialogOpen] = useState(false)
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [routeFilter, setRouteFilter] = useState("All Routes")
  const [statusFilter, setStatusFilter] = useState("All Status")

  const [selectedBus, setSelectedBus] = useState<Bus | null>(null)

  // Fetch buses from API on mount
  useEffect(() => {
    fetchBuses()
  }, [])

  const fetchBuses = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/buses")
      const busesData = response.data.data || response.data.buses || []
      setBuses(busesData)
    } catch (error) {
      console.error("Failed to fetch buses:", error)
      // Keep demo buses if API fails
    } finally {
      setLoading(false)
    }
  }

  const sortedBuses = useMemo(() => {
    const filtered = buses.filter((bus) => {
      const routeMatches = routeFilter === "All Routes" || bus.routeName === routeFilter
      const statusMatches = statusFilter === "All Status" || bus.status === statusFilter
      return routeMatches && statusMatches
    })

    return filtered.sort((a, b) => a.numberPlate.localeCompare(b.numberPlate))
  }, [buses, routeFilter, statusFilter])

  const handleAddBus = async (numberPlate: string) => {
    if (!NUMBER_PLATE_REGEX.test(numberPlate)) {
      alert("Invalid number plate format. Use: TS09AB1234")
      return
    }

    try {
      setLoading(true)
      const response = await api.post("/api/buses", {
        numberPlate,
        routeId: null,
      })

      const newBus = response.data.bus || {
        id: `BUS${buses.length + 1}`,
        numberPlate,
        routeName: "Unassigned",
        driverId: null,
        driverName: "Unassigned",
        status: "inactive",
        powerOn: false,
      }

      setBuses((prev) => [newBus, ...prev])
      setIsAddDialogOpen(false)
      alert("Bus added successfully!")
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || "Failed to add bus"
        : "Failed to add bus"
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRoute = async (routeName: string) => {
    if (!selectedBus) return
    if (!ROUTE_NAME_REGEX.test(routeName)) {
      alert("Invalid route name. Use format: Route 42")
      return
    }

    try {
      setLoading(true)
      const response = await api.put(`/api/buses/${selectedBus.id}/route`, {
        routeName,
      })

      const updatedBus = response.data.bus
      setBuses((prev) =>
        prev.map((bus) => (bus.id === selectedBus.id ? updatedBus : bus))
      )
      setSelectedBus(null)
      setIsAssignRouteDialogOpen(false)
      alert("Route assigned successfully!")
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to assign route"
        : "Failed to assign route"
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignDriver = async (memberId: string) => {
    if (!selectedBus) return

    try {
      setLoading(true)
      const response = await api.put(`/api/buses/${selectedBus.id}/driver`, {
        memberId,
      })

      const updatedBus = response.data.bus
      setBuses((prev) =>
        prev.map((bus) => (bus.id === selectedBus.id ? updatedBus : bus))
      )
      setSelectedBus(null)
      setIsAssignDriverDialogOpen(false)
      alert("Driver assigned successfully!")
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to assign driver"
        : "Failed to assign driver"
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBus = async () => {
    if (!selectedBus) return

    if (!window.confirm("Are you sure you want to delete this bus?")) return

    try {
      setLoading(true)
      await api.delete(`/api/buses/${selectedBus.id}`)

      setBuses((prev) => prev.filter((bus) => bus.id !== selectedBus.id))
      setSelectedBus(null)
      setIsDeleteDialogOpen(false)
      alert("Bus deleted successfully!")
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to delete bus"
        : "Failed to delete bus"
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBus = async (numberPlate: string) => {
    if (!selectedBus) return
    if (!NUMBER_PLATE_REGEX.test(numberPlate)) {
      alert("Invalid number plate format. Use: TS09AB1234")
      return
    }

    try {
      setLoading(true)
      const response = await api.put(`/api/buses/${selectedBus.id}`, {
        numberPlate,
      })

      const updatedBus = response.data.bus
      setBuses((prev) =>
        prev.map((bus) => (bus.id === selectedBus.id ? updatedBus : bus))
      )
      setSelectedBus(null)
      setIsEditDialogOpen(false)
      alert("Bus updated successfully!")
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to update bus"
        : "Failed to update bus"
      alert(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          searchPlaceholder="Search by plate number, driver, or route..."
          rightContent={
            <>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </button>
            </>
          }
        />

        <main className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Bus Fleet</h1>
              <p className="text-sm text-gray-500">
                Monitor and manage {buses.length} vehicles in your service area.
              </p>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={loading}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors gap-2 shadow-sm mt-0"
            >
              <Plus className="size-5" />
              Add New Bus
            </Button>
          </section>

          <BusTable
            buses={sortedBuses}
            routeFilter={routeFilter}
            statusFilter={statusFilter}
            onRouteFilterChange={setRouteFilter}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={() => {
              setRouteFilter("All Routes")
              setStatusFilter("All Status")
            }}
            onAssignRoute={(bus) => {
              setSelectedBus(bus)
              setIsAssignRouteDialogOpen(true)
            }}
            onAssignDriver={(bus) => {
              setSelectedBus(bus)
              setIsAssignDriverDialogOpen(true)
            }}
            onEditBus={(bus) => {
              setSelectedBus(bus)
              setIsEditDialogOpen(true)
            }}
            onDeleteBus={(bus) => {
              setSelectedBus(bus)
              setIsDeleteDialogOpen(true)
            }}
          />
        </main>
      </div>

      <AddBusDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddBus}
        numberPlateRegex={NUMBER_PLATE_REGEX}
      />

      <AddBusDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleUpdateBus}
        numberPlateRegex={NUMBER_PLATE_REGEX}
        initialValue={selectedBus?.numberPlate ?? ""}
        mode="edit"
      />

      <AssignRouteDialog
        open={isAssignRouteDialogOpen}
        onOpenChange={setIsAssignRouteDialogOpen}
        onSubmit={handleAssignRoute}
        routeNameRegex={ROUTE_NAME_REGEX}
        numberPlate={selectedBus?.numberPlate}
        initialValue={selectedBus?.routeName === "Unassigned" ? "" : selectedBus?.routeName}
      />

      <AssignDriverDialog
        open={isAssignDriverDialogOpen}
        onOpenChange={setIsAssignDriverDialogOpen}
        onSubmit={handleAssignDriver}
        numberPlate={selectedBus?.numberPlate}
        initialValue={selectedBus?.driverMemberId ?? ""}
      />

      <DeleteBusDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteBus}
      />
    </div>
  )
}
