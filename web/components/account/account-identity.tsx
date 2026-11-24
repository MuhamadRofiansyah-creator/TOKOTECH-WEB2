"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials, useSessionUser } from "@/components/auth/session-user"

export function AccountIdentity() {
  const { user } = useSessionUser()
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-12">
        <AvatarFallback className="bg-accent font-medium text-accent-foreground">{user ? initials(user.name, user.email) : ""}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">{user?.name ?? " "}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email ?? " "}</p>
      </div>
    </div>
  )
}
