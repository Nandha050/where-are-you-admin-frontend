"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, AlertCircle, CheckCircle, Pencil, Trash2, Loader2 } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createUser,
  deleteUser,
  getUsers,
  getRouteOptions,
  updateUser,
  type CreateUserPayload,
  type RouteOption,
  type UpdateUserPayload,
  type User,
} from "@/services/api";

interface Toast {
  type: "success" | "error";
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getEntityId = (item: { _id?: string; id?: string }) => item._id ?? item.id ?? "";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const extractUsers = (input: unknown): User[] => {
  if (Array.isArray(input)) return input as User[];
  if (!input || typeof input !== "object") return [];

  const obj = input as { users?: unknown; data?: unknown };
  if (Array.isArray(obj.users)) return obj.users as User[];
  if (Array.isArray(obj.data)) return obj.data as User[];
  return [];
};

const getErrorMeta = (err: unknown, fallback: string) => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as Error)?.message ||
    fallback;
  return { status, message };
};

const validatePayload = (payload: {
  name: string;
  memberId: string;
  email?: string;
  phone?: string;
  password?: string;
}) => {
  if (payload.name.trim().length < 2) return "Name must be at least 2 characters.";
  if (!payload.memberId.trim()) return "Member ID is required.";
  if (payload.email && !EMAIL_REGEX.test(payload.email)) return "Please enter a valid email.";
  if (payload.phone && (payload.phone.length < 7 || payload.phone.length > 20)) return "Phone length must be 7 to 20 characters.";
  if (payload.password !== undefined && payload.password.length < 6) return "Password must be at least 6 characters.";
  return null;
};

const normalizeCompare = (value?: string) => (value || "").trim().toLowerCase();

const extractRouteOptions = (input: unknown): RouteOption[] => {
  if (Array.isArray(input)) return input as RouteOption[];
  if (!input || typeof input !== "object") return [];

  const obj = input as { routes?: unknown; data?: unknown };
  if (Array.isArray(obj.routes)) return obj.routes as RouteOption[];
  if (Array.isArray(obj.data)) return obj.data as RouteOption[];
  return [];
};

interface RoutePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function RoutePicker({ label, value, onChange, placeholder }: RoutePickerProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveSelected = async () => {
      if (!value) {
        if (mounted) {
          setQuery("");
          setOptions([]);
        }
        return;
      }

      try {
        const res = await getRouteOptions(value);
        if (!mounted) return;
        const route = extractRouteOptions(res.data).find((item) => item.id === value) ?? null;
        if (route) {
          setQuery(route.label || route.name || route.id);
          setOptions([route]);
        } else {
          setQuery(value);
        }
      } catch {
        if (mounted) setQuery(value);
      }
    };

    void resolveSelected();

    return () => {
      mounted = false;
    };
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || !trimmed) {
      if (!trimmed) setOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingOptions(true);
        const res = await getRouteOptions(trimmed);
        setOptions(extractRouteOptions(res.data));
      } catch {
        setOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, query]);

  const handleSelect = (route: RouteOption) => {
    onChange(route.id);
    setQuery(route.label || route.name || route.id);
    setOptions([route]);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onChange("");
          }}
          placeholder={placeholder}
          className="pr-20"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOptions([]);
              setOpen(false);
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
          >
            Clear
          </button>
        )}

        {open && query.trim() && (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
            {loadingOptions ? (
              <div className="px-4 py-3 text-sm text-gray-500">Searching routes...</div>
            ) : options.length ? (
              options.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleSelect(route)}
                  className="flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-blue-50"
                >
                  <span className="text-sm font-semibold text-gray-900">{route.label || route.name}</span>
                  <span className="text-xs text-gray-500">{route.id}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">No routes found.</div>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">Search by route name, start name, end name, or paste a route ID.</p>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form, setForm] = useState<CreateUserPayload>({
    name: "",
    memberId: "",
    routeId: "",
    password: "",
    email: "",
    phone: "",
  });
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    name: "",
    memberId: "",
    routeId: "",
    email: "",
    phone: "",
    password: "",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await getUsers(q);
      setUsers(extractUsers(res.data));
    } catch (err) {
      const { message } = getErrorMeta(err, "Failed to load users.");
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(searchQuery || undefined);
  }, [fetchUsers, searchQuery]);

  const stats = useMemo(() => {
    const withEmail = users.filter((u) => Boolean(u.email)).length;
    const withPhone = users.filter((u) => Boolean(u.phone)).length;
    return { total: users.length, withEmail, withPhone };
  }, [users]);

  const handleCreate = async () => {
    setFormError(null);
    const payload: CreateUserPayload = {
      name: form.name.trim(),
      memberId: form.memberId.trim(),
      password: form.password.trim(),
      routeId: form.routeId?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
    };

    const validationError = validatePayload(payload);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await createUser(payload);
      const created = ((data as { user?: User }).user ?? data) as User;
      setUsers((prev) => [created, ...prev]);
      setOpenCreate(false);
      setForm({ name: "", memberId: "", routeId: "", password: "", email: "", phone: "" });
      showToast("success", "User created successfully.");
    } catch (err) {
      const { message } = getErrorMeta(err, "Failed to create user.");
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditError(null);
    setEditForm({
      name: user.name,
      memberId: user.memberId ?? "",
      routeId: user.routeId ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
    });
    setOpenEdit(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setEditError(null);
    const userId = getEntityId(selectedUser);

    const payload: UpdateUserPayload = {
      name: editForm.name?.trim() || undefined,
      memberId: editForm.memberId?.trim() || undefined,
      routeId: editForm.routeId?.trim() || undefined,
      email: editForm.email?.trim() || undefined,
      phone: editForm.phone?.trim() || undefined,
      password: editForm.password?.trim() || undefined,
    };

    const validationError = validatePayload({
      name: payload.name || "",
      memberId: payload.memberId || "",
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
    });

    if (validationError) {
      setEditError(validationError);
      return;
    }

    const duplicateField = users
      .filter((user) => getEntityId(user) !== userId)
      .find((user) => {
        const sameMemberId = Boolean(payload.memberId) && normalizeCompare(user.memberId) === normalizeCompare(payload.memberId);
        const sameEmail = Boolean(payload.email) && normalizeCompare(user.email) === normalizeCompare(payload.email);
        const samePhone = Boolean(payload.phone) && normalizeCompare(user.phone) === normalizeCompare(payload.phone);
        return sameMemberId || sameEmail || samePhone;
      });

    if (duplicateField) {
      if (normalizeCompare(duplicateField.memberId) === normalizeCompare(payload.memberId)) {
        setEditError("Member ID must be unique in your organization.");
      } else if (normalizeCompare(duplicateField.email) === normalizeCompare(payload.email)) {
        setEditError("Email must be unique in your organization.");
      } else {
        setEditError("Phone number must be unique in your organization.");
      }
      return;
    }

    try {
      setEditing(true);
      const { data } = await updateUser(userId, payload);
      const updated = ((data as { user?: User }).user ?? data) as User;

      setUsers((prev) => prev.map((u) => (getEntityId(u) === userId ? { ...u, ...updated } : u)));
      setOpenEdit(false);
      setSelectedUser(null);
      showToast("success", "User updated successfully.");
    } catch (err) {
      const { status, message } = getErrorMeta(err, "Failed to update user.");
      if (status === 404) {
        setOpenEdit(false);
        setSelectedUser(null);
        await fetchUsers(searchQuery || undefined);
        showToast("error", "User no longer exists. List refreshed.");
        return;
      }
      setEditError(message);
    } finally {
      setEditing(false);
    }
  };

  const requestDelete = (user: User) => {
    setSelectedUser(user);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setDeleting(true);
      const userId = getEntityId(selectedUser);
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => getEntityId(u) !== userId));
      setOpenDelete(false);
      setSelectedUser(null);
      showToast("success", "User deleted.");
    } catch (err) {
      const { status, message } = getErrorMeta(err, "Failed to delete user.");
      if (status === 404) {
        setOpenDelete(false);
        setSelectedUser(null);
        await fetchUsers(searchQuery || undefined);
        showToast("error", "User was already removed. List refreshed.");
        return;
      }
      showToast("error", message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header onToggleSidebar={() => {}} />

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Create, update, search, and delete organization users.</p>
          </div>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setOpenCreate(true)}>
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Total Users</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">With Email</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.withEmail}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">With Phone</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.withPhone}</p>
          </Card>
        </div>

        <Card className="p-4 border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Input
              placeholder="Search users by name, member ID, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full sm:w-96"
            />
            <Button variant="outline" onClick={() => setSearchInput("")}>Clear</Button>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">Loading users...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">No users found.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const id = getEntityId(user);
                    return (
                      <TableRow key={id || `${user.memberId}-${user.name}`} className="hover:bg-gray-50/60">
                        <TableCell className="font-medium text-gray-900">{user.name}</TableCell>
                        <TableCell>{user.memberId || "-"}</TableCell>
                        <TableCell>{user.routeName || "-"}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                              <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => requestDelete(user)}>
                              <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user in your organization.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
            <Input value={form.memberId} onChange={(e) => setForm((p) => ({ ...p, memberId: e.target.value }))} placeholder="Member ID" />
            <RoutePicker
              label="Route"
              value={form.routeId ?? ""}
              onChange={(routeId) => setForm((p) => ({ ...p, routeId }))}
              placeholder="Search and select route"
            />
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" />
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" />
            <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password" />
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details. Set password only if you want to reset it.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input value={editForm.name || ""} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
            <Input value={editForm.memberId || ""} onChange={(e) => setEditForm((p) => ({ ...p, memberId: e.target.value }))} placeholder="Member ID" />
            <RoutePicker
              label="Route"
              value={editForm.routeId ?? ""}
              onChange={(routeId) => setEditForm((p) => ({ ...p, routeId }))}
              placeholder="Search and select route"
            />
            <Input type="email" value={editForm.email || ""} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" />
            <Input value={editForm.phone || ""} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" />
            <Input type="password" value={editForm.password || ""} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="New password (optional)" />
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={editing} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Delete {selectedUser?.name || "this user"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
