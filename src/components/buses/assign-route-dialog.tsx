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

interface AssignRouteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  numberPlate?: string
  onSubmit: (routeName: string) => void
  routeNameRegex: RegExp
  initialValue?: string
}

export function AssignRouteDialog({
  open,
  onOpenChange,
  numberPlate,
  onSubmit,
  routeNameRegex,
  initialValue = "",
}: AssignRouteDialogProps) {
  const [routeName, setRouteName] = useState(initialValue)
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setRouteName(initialValue)
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const value = routeName.trim()

    if (!routeNameRegex.test(value)) {
      setError("Route name must be in format Route 42")
      return
    }

    onSubmit(value)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Assign Route</DialogTitle>
          <DialogDescription>
            {numberPlate ? `Assign route for ${numberPlate}.` : "Assign route to bus."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label htmlFor="route-name" className="text-sm font-medium">
            Route Name
          </label>
          <Input
            id="route-name"
            value={routeName}
            onChange={(event) => {
              setRouteName(event.target.value)
              if (error) setError("")
            }}
            placeholder="Route 42"
            className="rounded-lg"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} className="rounded-lg">
            Assign Route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
