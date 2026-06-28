"use client"

import { useParams } from "next/navigation"
import SplitForm from "@/components/split-form"

export default function EditSplitPage() {
  const params = useParams()
  return <SplitForm editId={params.id as string} />
}
