"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditMuscleGroupPage() {
  const params = useParams()
  return <LibraryForm slug="muscle-groups" label="Muscle Groups" backUrl="/dashboard/muscle-groups" editId={params.id as string} />
}
