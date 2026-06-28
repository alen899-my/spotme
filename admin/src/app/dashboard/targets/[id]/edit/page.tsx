"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditTargetPage() {
  const params = useParams()
  return <LibraryForm slug="targets" label="Targets" backUrl="/dashboard/targets" editId={params.id as string} />
}
