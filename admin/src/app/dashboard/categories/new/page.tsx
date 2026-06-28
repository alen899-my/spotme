"use client"

import { LibraryForm } from "@/components/library-form"

export default function NewCategoryPage() {
  return <LibraryForm slug="categories" label="Categories" backUrl="/dashboard/categories" />
}
