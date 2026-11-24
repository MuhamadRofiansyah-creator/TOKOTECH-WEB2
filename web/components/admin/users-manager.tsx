"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Ban, Mail, MoreHorizontal, ShieldCheck, UserPlus, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AdminUserRow as AdminUser, Role as UserRole } from "@/lib/types"
import { formatDate, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAdminAction } from "./use-admin-action"
import { inviteStaffAction, setUserRoleAction, setUserSuspendedAction } from "@/lib/actions/admin"
import { useSessionUser } from "@/components/auth/session-user"
import { RoleBadge, StatusBadge } from "./status-badge"
import { SegmentedTabs, TablePagination, TableSearch } from "./data-table-parts"

const PER_PAGE = 10
type Tab = "all" | UserRole

const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const ago = (iso: string) => {
  const h = Math.round((Date.UTC(2026, 10, 16) - new Date(iso).getTime()) / 3_600_000)
  return h < 1 ? "Online now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export function UsersManager({ users }: { users: AdminUser[] }) {
  const action = useAdminAction()
  const me = useSessionUser().user?.id
  const [tab, setTab] = useState<Tab>("all")
  const [status, setStatus] = useState("all")
  const initialQuery = useSearchParams().get("q") ?? ""
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [invite, setInvite] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(
      (u) =>
        (tab === "all" || u.role === tab) &&
        (status === "all" || u.status === status) &&
        (!q || (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [users, tab, status, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const count = (r: UserRole) => users.filter((u) => u.role === r).length

  const stats = [
    { label: "Total users", value: users.length, icon: UserRound },
    { label: "Admins & staff", value: count("ADMIN") + count("STAFF"), icon: ShieldCheck },
    { label: "Pending invites", value: users.filter((u) => u.status === "INVITED").length, icon: Mail },
    { label: "Suspended", value: users.filter((u) => u.status === "SUSPENDED").length, icon: Ban },
  ]

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customers, staff accounts and access roles.</p>
        </div>
        <Button className="h-9" onClick={() => setInvite(true)}>
          <UserPlus /> Invite user
        </Button>
      </div>

      <ul className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <li key={label} className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block text-2xl font-semibold tabular-nums">{value}</span>
              <span className="block text-xs text-muted-foreground">{label}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="px-4 pt-1">
          <SegmentedTabs<Tab>
            value={tab}
            onChange={(v) => { setTab(v); setPage(1) }}
            options={[
              { value: "all", label: "All users", count: users.length },
              { value: "CUSTOMER", label: "Customers", count: count("CUSTOMER") },
              { value: "STAFF", label: "Staff", count: count("STAFF") },
              { value: "ADMIN", label: "Admins", count: count("ADMIN") },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <TableSearch value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search name or email" className="w-full sm:w-72" />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="h-9! w-[150px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INVITED">Invited</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                <th className="px-3 py-2.5 text-right font-medium">Total spent</th>
                <th className="px-3 py-2.5 font-medium">Joined</th>
                <th className="px-3 py-2.5 font-medium">Last active</th>
                <th className="w-12 py-2.5 pr-4" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className={cn("text-xs font-medium", u.role === "CUSTOMER" ? "bg-muted" : "bg-accent text-accent-foreground")}>
                          {initials(u.name ?? u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {u.name}
                          {u.id === me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{u.orderCount || "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{u.totalSpent ? formatPrice(u.totalSpent) : "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{u.lastActiveAt ? ago(u.lastActiveAt) : "Never"}</td>
                  <td className="py-3 pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions for {u.name}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{u.city ?? "No address yet"}</DropdownMenuLabel>
                        {(["CUSTOMER", "STAFF", "ADMIN"] as const)
                          .filter((r) => r !== u.role)
                          .map((r) => (
                            <DropdownMenuItem key={r} disabled={u.id === me || action.pending} onSelect={() => action.run(() => setUserRoleAction(u.id, r))}>
                              <ShieldCheck /> Make {r.toLowerCase()}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={u.id === me || u.status === "INVITED" || action.pending}
                          onSelect={() => action.run(() => setUserSuspendedAction(u.id, u.status !== "SUSPENDED"))}
                        >
                          <Ban /> {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    No users match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={current} pageCount={pageCount} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
      </div>

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>They&apos;ll get an email with a link to set up their account.</DialogDescription>
          </DialogHeader>
          <form
            id="invite-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              action.run(() => inviteStaffAction(form), () => setInvite(false))
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" name="email" type="email" required placeholder="name@tokotech.id" className="h-10" />
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Role</legend>
              <RadioGroup name="role" defaultValue="STAFF" className="gap-2">
                {[
                  ["STAFF", "Staff", "Manage products and orders"],
                  ["ADMIN", "Admin", "Full access, including payments and users"],
                ].map(([v, label, desc]) => (
                  <Label key={v} htmlFor={`role-${v}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent/40">
                    <RadioGroupItem value={v} id={`role-${v}`} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="invite-form">
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
