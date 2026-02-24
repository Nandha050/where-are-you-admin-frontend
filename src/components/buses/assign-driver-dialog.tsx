"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Driver } from "@/services/api"

interface AssignDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (driverId: string) => void
  drivers: Driver[]
  selectedBus?: any
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  onSubmit,
  drivers,
  selectedBus,
}: AssignDriverDialogProps) {
  const [driverId, setDriverId] = useState("")
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDriverId("")
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const value = driverId.trim()

    if (!value) {
      setError("Please select a driver")
      return
    }

    setError("")
    onSubmit(value)
    setDriverId("")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
          <DialogDescription>
            {selectedBus ? `Assign driver for ${selectedBus.numberPlate}` : "Assign driver to bus"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="driver-select" className="text-sm font-medium text-gray-700">
              Select Driver *
            </label>
            <select
              id="driver-select"
              value={driverId}
              onChange={(event) => {
                setDriverId(event.target.value)
                if (error) setError("")
              }}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a driver --</option>
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <option key={driver._id || driver.id} value={driver._id || driver.id || ""}>
                    {driver.name} {driver.licenseNumber ? `(${driver.licenseNumber})` : ""}
                  </option>
                ))
              ) : (
                <option disabled>No drivers available</option>
              )}
            </select>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-lg bg-blue-600 hover:bg-blue-700"
            disabled={drivers.length === 0}
          >
            Assign Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
