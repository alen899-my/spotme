"use client"

import { useParams } from "next/navigation"
import { BuildForm } from "@/components/build-form"

export default function EditBuildPage() {
  const params = useParams()
  return <BuildForm backUrl="/dashboard/builds" editId={params.id as string} />
}
