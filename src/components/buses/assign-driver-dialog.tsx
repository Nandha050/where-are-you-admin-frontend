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

interface AssignDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  numberPlate?: string
  onSubmit: (memberId: string) => void
  initialValue?: string
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  numberPlate,
  onSubmit,
  initialValue = "",
}: AssignDriverDialogProps) {
  const [memberId, setMemberId] = useState(initialValue)
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMemberId(initialValue)
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const value = memberId.trim()

    if (!value || value.length < 2) {
      setError("Please enter a valid driver ID (e.g., D2001)")
      return
    }

    onSubmit(value)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
          <DialogDescription>
            {numberPlate ? `Assign driver for ${numberPlate}.` : "Assign driver to bus."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label htmlFor="driver-id" className="text-sm font-medium">
            Driver ID
          </label>
          <Input
            id="driver-id"
            value={memberId}
            onChange={(event) => {
              setMemberId(event.target.value)
              if (error) setError("")
            }}
            placeholder="D2001"
            className="rounded-lg"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} className="rounded-lg">
            Assign Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
