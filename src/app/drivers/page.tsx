"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, AlertCircle, CheckCircle } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  getDrivers,
  createDriver,
  getBuses,
  type Driver,
  type CreateDriverPayload,
  type Bus,
} from "@/services/api";

interface Toast {
  type: "success" | "error";
  message: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<CreateDriverPayload>({
    name: "",
    memberId: "",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
      const maybe = err as { response?: { data?: { message?: unknown } } };
      const msg = maybe.response?.data?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    return fallback;
  };

  const extractList = <T,>(input: unknown, keys: string[]): T[] => {
    if (Array.isArray(input)) return input as T[];
    const seen = new Set<unknown>();
    const queue: unknown[] = [];
    if (input && typeof input === "object") queue.push(input);

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== "object" || seen.has(current)) continue;
      seen.add(current);
      const obj = current as Record<string, unknown>;

      for (const key of keys) {
        const value = obj[key];
        if (Array.isArray(value)) return value as T[];
        if (value && typeof value === "object") queue.push(value);
      }

      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) return value as T[];
        if (value && typeof value === "object") queue.push(value);
      }
    }
    return [];
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, busesRes] = await Promise.allSettled([getDrivers(), getBuses()]);

      let driverList: Driver[] = [];
      let busList: Bus[] = [];

      if (driversRes.status === "fulfilled") {
        driverList = extractList<Driver>(driversRes.value.data, ["drivers", "data"]);
      } else {
        showToast("error", getErrorMessage(driversRes.reason, "Failed to load drivers"));
      }

      if (busesRes.status === "fulfilled") {
        busList = extractList<Bus>(busesRes.value.data, ["buses", "data"]);
      }

      const extractBusDriverIds = (bus: Bus) => {
        const typedBus = bus as unknown as {
          driverId?: string | number;
          driver_id?: string | number;
          driverMemberId?: string | number;
          driver_member_id?: string | number;
          driver?: { memberId?: string | number; _id?: string | number; id?: string | number };
        };

        return [
          typedBus.driverId,
          typedBus.driver_id,
          typedBus.driverMemberId,
          typedBus.driver_member_id,
          typedBus.driver?.memberId,
          typedBus.driver?._id,
          typedBus.driver?.id,
        ].filter(Boolean) as Array<string | number>;
      };

      const assignmentMap = new Map<string, string>();
      busList.forEach((bus) => {
        const ids = extractBusDriverIds(bus);
        ids.forEach((id) => assignmentMap.set(String(id), bus.numberPlate));
      });

      const driversWithAssignments = driverList.map((d) => {
        const candidateKeys = [d.memberId, d._id, d.id].filter(Boolean) as Array<string | number>;
        const assigned = candidateKeys.map((k) => assignmentMap.get(String(k))).find(Boolean);
        const clone: Driver = { ...d };
        if (assigned) clone.assignedBusNumber = assigned;
        else if ("assignedBusNumber" in clone) delete (clone as { assignedBusNumber?: string }).assignedBusNumber;
        return clone;
      });

      setDrivers(driversWithAssignments);
      setBuses(busList);
    } catch (err) {
      console.error("Failed to load drivers:", err);
      showToast("error", getErrorMessage(err, "Failed to load drivers"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const assignedBusByDriverId = useMemo(() => {
    const map = new Map<string, string>();
    buses.forEach((bus) => {
      const typedBus = bus as unknown as {
        driverId?: string | number;
        driver_id?: string | number;
        driverMemberId?: string | number;
        driver_member_id?: string | number;
        driver?: { memberId?: string | number; _id?: string | number; id?: string | number };
      };
      const ids = [
        typedBus.driverId,
        typedBus.driver_id,
        typedBus.driverMemberId,
        typedBus.driver_member_id,
        typedBus.driver?.memberId,
        typedBus.driver?._id,
        typedBus.driver?.id,
      ].filter(Boolean) as Array<string | number>;

      ids.forEach((id) => map.set(String(id), bus.numberPlate));
    });
    return map;
  }, [buses]);

  const assignedDrivers = drivers.filter((d) => {
    const ids = [d.memberId, d._id, d.id].filter(Boolean) as Array<string | number>;
    return ids.some((id) => assignedBusByDriverId.has(String(id)));
  }).length;

  const handleCreate = async () => {
    setFormError(null);
    const trimmed = {
      name: form.name.trim(),
      memberId: form.memberId.trim(),
      password: form.password.trim(),
    };
    if (!trimmed.name || !trimmed.memberId || !trimmed.password) {
      setFormError("All fields are required");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await createDriver(trimmed);
      const createdResponse = data as unknown;
      const created =
        (createdResponse as { driver?: Driver }).driver ?? (createdResponse as Driver);
      setDrivers((prev) => [created, ...prev]);
      showToast("success", "Driver created");
      setForm({ name: "", memberId: "", password: "" });
      setOpenCreate(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to create driver"));
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-3xl font-semibold text-gray-900">Driver Management</h1>
            <p className="text-sm text-gray-500">Monitor fleet compliance, assignments, and add new drivers.</p>
          </div>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setOpenCreate(true)}
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Assigned Drivers</p>
            <p className="text-2xl font-semibold text-gray-900">{assignedDrivers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Unassigned Drivers</p>
            <p className="text-2xl font-semibold text-gray-900">{drivers.length - assignedDrivers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-gray-900">{drivers.length}</p>
          </Card>
        </div>

        <Card className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Drivers</p>
              <p className="text-xs text-gray-500">Showing {drivers.length} driver{drivers.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wide text-gray-500">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-gray-500">Member ID</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-gray-500">Assigned Bus</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-gray-500">Assignment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500">Loading drivers...</TableCell>
                  </TableRow>
                ) : drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500">No drivers yet. Add one to get started.</TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver) => {
                    const id = String(driver._id || driver.id || "");
                    const assignedBus = assignedBusByDriverId.get(id) || driver.assignedBusNumber;
                    return (
                      <TableRow key={id || driver.memberId || driver.name} className="hover:bg-gray-50/70">
                        <TableCell className="font-semibold text-gray-900">{driver.name}</TableCell>
                        <TableCell className="text-sm text-gray-700">{driver.memberId || "—"}</TableCell>
                        <TableCell>
                          {assignedBus ? (
                            <Badge variant="secondary" className="border-gray-300 bg-white text-blue-600">{assignedBus}</Badge>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full border-0 ${assignedBus ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {assignedBus ? "Assigned" : "Unassigned"}
                          </Badge>
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

      {/* Create Driver Drawer/Dialog */}
      {openCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Driver</h2>
                <p className="text-sm text-gray-500">Create a driver with member ID and password.</p>
              </div>
              <button onClick={() => setOpenCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {formError ? (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Driver name"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Member ID</label>
                <Input
                  value={form.memberId}
                  onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                  placeholder="e.g., D2002"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Driver@123"
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)} className="rounded-lg">Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                {submitting ? "Saving..." : "Save Driver"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
