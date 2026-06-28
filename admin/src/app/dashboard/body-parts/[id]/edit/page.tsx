"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditBodyPartPage() {
  const params = useParams()
  return <LibraryForm slug="body-parts" label="Body Parts" backUrl="/dashboard/body-parts" editId={params.id as string} />
}
