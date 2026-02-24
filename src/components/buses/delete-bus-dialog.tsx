"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteBusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  bus?: any
}

export function DeleteBusDialog({
  open,
  onOpenChange,
  onConfirm,
  bus,
}: DeleteBusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Delete Bus</DialogTitle>
          <DialogDescription>
            {bus
              ? `This action will permanently delete the bus with number plate ${bus.numberPlate}. This cannot be undone.`
              : "Are you sure you want to delete this bus? This cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        {bus && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Number Plate:</span>
              <span className="font-semibold">{bus.numberPlate}</span>
            </div>
            {bus.routeName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Route:</span>
                <span className="font-semibold">{bus.routeName}</span>
              </div>
            )}
            {bus.status && (
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold capitalize">{bus.status}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="rounded-lg"
          >
            Delete Bus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
