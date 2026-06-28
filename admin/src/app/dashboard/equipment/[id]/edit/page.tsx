"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditEquipmentPage() {
  const params = useParams()
  return <LibraryForm slug="equipment" label="Equipment" backUrl="/dashboard/equipment" editId={params.id as string} />
}
