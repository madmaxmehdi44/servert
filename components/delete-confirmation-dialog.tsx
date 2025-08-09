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
import { AlertTriangle, Loader2 } from "lucide-react"

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
  disabled?: boolean
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  disabled = false,
}: DeleteConfirmationDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (disabled) return

    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-right">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            انصراف
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={loading || disabled}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
