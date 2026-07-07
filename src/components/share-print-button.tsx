"use client"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SharePrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" />
      Download PDF
    </Button>
  )
}
