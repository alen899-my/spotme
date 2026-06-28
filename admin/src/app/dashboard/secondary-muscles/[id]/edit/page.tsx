"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditSecondaryMusclePage() {
  const params = useParams()
  return <LibraryForm slug="secondary-muscles" label="Secondary Muscles" backUrl="/dashboard/secondary-muscles" editId={params.id as string} />
}
