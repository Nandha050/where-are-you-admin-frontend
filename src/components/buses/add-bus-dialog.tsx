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

interface AddBusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (numberPlate: string) => void
  numberPlateRegex: RegExp
  initialValue?: string
  mode?: "create" | "edit"
}

export function AddBusDialog({
  open,
  onOpenChange,
  onSubmit,
  numberPlateRegex,
  initialValue = "",
  mode = "create",
}: AddBusDialogProps) {
  const [numberPlate, setNumberPlate] = useState(initialValue)
  const [error, setError] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setNumberPlate(initialValue)
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const value = numberPlate.trim().toUpperCase()

    if (!numberPlateRegex.test(value)) {
      setError("Number plate must be in format TS09AB1234")
      return
    }

    onSubmit(value)
    handleOpenChange(false)
  }

  const isEdit = mode === "edit"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Bus" : "Add Bus"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the bus details." : "Create a new bus in your fleet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label htmlFor="bus-number" className="text-sm font-medium">
            Number Plate
          </label>
          <Input
            id="bus-number"
            value={numberPlate}
            onChange={(event) => {
              setNumberPlate(event.target.value)
              if (error) setError("")
            }}
            placeholder="TS09AB1234"
            className="rounded-lg"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} className="rounded-lg">
            {isEdit ? "Update Bus" : "Create Bus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
