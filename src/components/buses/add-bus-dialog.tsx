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
import { Input } from "@/components/ui/input"
import { Route } from "@/services/api"

interface AddBusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (numberPlate: string, routeName: string) => void
  routes: Route[]
}

export function AddBusDialog({
  open,
  onOpenChange,
  onSubmit,
  routes,
}: AddBusDialogProps) {
  const [numberPlate, setNumberPlate] = useState("")
  const [routeName, setRouteName] = useState("")
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNumberPlate("")
      setRouteName("")
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const value = numberPlate.trim().toUpperCase()

    if (!value || value.length < 3) {
      setError("Please enter a valid number plate")
      return
    }

    setError("")
    onSubmit(value, routeName)
    setNumberPlate("")
    setRouteName("")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Add New Bus</DialogTitle>
          <DialogDescription>
            Create a new bus in your fleet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="bus-number" className="text-sm font-medium text-gray-700">
              Number Plate *
            </label>
            <Input
              id="bus-number"
              value={numberPlate}
              onChange={(event) => {
                setNumberPlate(event.target.value)
                if (error) setError("")
              }}
              placeholder="e.g., TS09AB1234"
              className="rounded-lg"
            />
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="route" className="text-sm font-medium text-gray-700">
              Route (Optional)
            </label>
            <select
              id="route"
              value={routeName}
              onChange={(event) => setRouteName(event.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {routes.map((route) => (
                <option key={route._id} value={route.name}>
                  {route.name}
                </option>
              ))}
            </select>
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
          >
            Create Bus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
