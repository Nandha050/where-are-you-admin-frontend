"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, AlertCircle, CheckCircle, MoreHorizontal } from "lucide-react"

import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createUser, getUsers, type CreateUserPayload, type User } from "@/services/api"

interface Toast {
  type: "success" | "error"
  message: string
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "response" in err) {
    const maybe = err as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    if (typeof msg === "string" && msg.trim()) return msg
  }
  return fallback
}

const extractList = <T,>(input: unknown, keys: string[]): T[] => {
  if (Array.isArray(input)) return input as T[]
  const seen = new Set<unknown>()
  const queue: unknown[] = []
  if (input && typeof input === "object") queue.push(input)

  while (queue.length) {
    const current = queue.shift()
    if (!current || typeof current !== "object" || seen.has(current)) continue
    seen.add(current)
    const obj = current as Record<string, unknown>

    for (const key of keys) {
      const value = obj[key]
      if (Array.isArray(value)) return value as T[]
      if (value && typeof value === "object") queue.push(value)
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as T[]
      if (value && typeof value === "object") queue.push(value)
    }
  }
  return []
}

const formatDate = (value?: string) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const initials = (name?: string) => {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All Roles")

  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState<CreateUserPayload>({
    name: "",
    memberId: "",
    password: "",
    email: "",
    phone: "",
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3200)
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      const list = extractList<User>(res.data, ["users", "data"])
      setUsers(list)
    } catch (err) {
      console.error("Failed to load users", err)
      showToast("error", getErrorMessage(err, "Failed to load users"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const totalUsers = users.length
  const adminCount = users.filter(u => (u.role ?? "").toLowerCase() === "admin").length
  const memberCount = users.filter(u => (u.role ?? "").toLowerCase() === "member").length

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>()
    users.forEach(u => {
      if (u.role) roles.add(u.role)
    })
    return ["All Roles", ...Array.from(roles)]
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesQuery = !query || [u.name, u.email, u.phone, u.memberId]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(query))
      const matchesRole = roleFilter === "All Roles" || (u.role ?? "").toLowerCase() === roleFilter.toLowerCase()
      return matchesQuery && matchesRole
    })
  }, [users, search, roleFilter])

  const handleCreate = async () => {
    setFormError(null)
    const trimmed = {
      name: form.name.trim(),
      memberId: form.memberId.trim(),
      password: form.password.trim(),
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
    }

    if (!trimmed.name || !trimmed.memberId || !trimmed.password) {
      setFormError("Name, Member ID, and Password are required")
      return
    }

    try {
      setSubmitting(true)
      const { data } = await createUser(trimmed)
      const createdResponse = data as unknown
      const created = (createdResponse as { user?: User }).user ?? (createdResponse as User)
      setUsers(prev => [created, ...prev])
      showToast("success", "User created")
      setOpenCreate(false)
      setForm({ name: "", memberId: "", password: "", email: "", phone: "" })
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to create user"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header onToggleSidebar={() => { }} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
            }`}
        >
          {toast.type === "success"
            ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toast.message}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Manage users, roles, and onboarding.</p>
          </div>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpenCreate(true)}
          >
            <Plus className="w-4 h-4" />
            Add New User
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Total Users</p>
            <p className="text-2xl font-semibold text-gray-900">{totalUsers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Admins</p>
            <p className="text-2xl font-semibold text-gray-900">{adminCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Members</p>
            <p className="text-2xl font-semibold text-gray-900">{memberCount}</p>
          </Card>
        </div>

        <Card className="p-4 border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <Input
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full lg:w-80"
              />

              <div className="flex items-center gap-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <Button variant="ghost" onClick={() => { setSearch(""); setRoleFilter("All Roles") }} className="h-10">Clear</Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wide text-gray-500">Name / Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-500">Phone</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-500">Role</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-gray-500">Join Date</TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wide text-gray-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-gray-500">Loading users...</TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-gray-500">No users found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <TableRow key={`${user._id || user.id || user.memberId || user.email || "user"}-${idx}`} className="hover:bg-gray-50/60">
                        <TableCell className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                            {initials(user.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                            <span className="text-xs text-gray-500">{user.email ?? "No email"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{user.phone ?? "—"}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant="secondary" className="bg-white text-blue-600 border border-gray-200">
                              {user.role}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm" className="rounded-lg hover:bg-gray-100 h-8 w-8" aria-label="More actions">
                            <MoreHorizontal className="size-4 text-gray-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </main>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account for your organization.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Member ID</label>
              <Input
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                placeholder="U1004"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email (optional)</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone (optional)</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpenCreate(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
