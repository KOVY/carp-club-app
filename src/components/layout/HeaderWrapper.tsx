"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Header } from "./Header"
import { getCurrentUser, signOut } from "@/actions/auth.actions"

interface UserData {
  id: string
  email: string
  name?: string
}

interface HeaderWrapperProps {
  /** Enable floating mode with margins */
  floating?: boolean
}

export function HeaderWrapper({ floating }: HeaderWrapperProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    // Fetch current user on mount
    const fetchUser = async () => {
      const result = await getCurrentUser()
      if (result.success && result.data) {
        setUser({
          id: result.data.userId,
          email: result.data.email,
          name: result.data.profile?.jmeno,
        })
      } else {
        setUser(null)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = () => {
    startTransition(async () => {
      const result = await signOut()
      if (result.success) {
        setUser(null)
        router.push("/")
        router.refresh()
      }
    })
  }

  return <Header user={user} onSignOut={handleSignOut} floating={floating} />
}
