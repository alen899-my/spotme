"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { UserDetailForm } from "@/components/user-detail-form"
import type { User } from "@/types"
import api from "@/lib/api"

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<User | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/users/${id}`).then((res) => {
      setUser(res.data.user ?? res.data)
    }).finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${id}`)
      router.push("/dashboard/users")
    } catch {}
  }

  return (
    <UserDetailForm
      user={user}
      loading={loading}
      mode="view"
      onDelete={handleDelete}
    />
  )
}
