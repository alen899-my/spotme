"use client"

import { useParams } from "next/navigation"
import { LibraryForm } from "@/components/library-form"

export default function EditCategoryPage() {
  const params = useParams()
  return <LibraryForm slug="categories" label="Categories" backUrl="/dashboard/categories" editId={params.id as string} />
}
