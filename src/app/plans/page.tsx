"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, ShieldCheck, BusFront, ArrowRight } from "lucide-react";

import { Header } from "@/components/layout/header";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    activatePlan,
    getCurrentPlan,
    getPlanSummary,
    getPlans,
    type ActivatePlanPayload,
    type PlanCode,
} from "@/services/api";

type PlanCardModel = {
    planCode: PlanCode;
    title: string;
    priceLabel: string;
    billingLabel: string;
    highlight?: string;
    theme: "light" | "accent" | "dark";
    features: string[];
};

type CurrentPlan = {
    id?: string;
    organizationId?: string;
    planCode?: PlanCode;
    planName?: string;
    description?: string;
    durationDays?: number;
    pricePerBus?: number;
    busLimit?: number;
    startsAt?: string;
    endsAt?: string;
    status?: string;
    activationSource?: string;
    createdAt?: string;
    updatedAt?: string;
    currentBusCount?: number;
    remainingBusSlots?: number;
    isExpired?: boolean;
};

type PlanUsage = {
    currentBusCount?: number;
    hasActivePlan?: boolean;
    activePlanExpiresAt?: string;
};

const defaultPlans: PlanCardModel[] = [
    {
        planCode: "TRIAL_7D",
        title: "Free Trial",
        priceLabel: "Free",
        billingLabel: "for 7 days",
        theme: "light",
        features: [
            "Trial access for evaluation",
            "Core fleet dashboard",
            "Route and student management",
            "Driver and bus workflows",
        ],
    },
    {
        planCode: "MONTHLY_1",
        title: "Monthly",
        priceLabel: "₹300",
        billingLabel: "per bus / month",
        theme: "light",
        features: [
            "Real-time bus tracking",
            "Student notifications",
            "Delay alerts",
            "Route and driver management",
        ],
    },
    {
        planCode: "QUARTERLY_3",
        title: "Quarterly",
        priceLabel: "₹750",
        billingLabel: "per bus / 3 months",
        theme: "light",
        features: [
            "Location refresh optimization",
            "Personalized notifications",
            "Route visibility controls",
            "Priority support",
        ],
    },
    {
        planCode: "SEMIANNUAL_6",
        title: "Half-Yearly",
        priceLabel: "₹1500",
        billingLabel: "per bus / 6 months",
        highlight: "Recommended",
        theme: "accent",
        features: [
            "Advanced dashboard",
            "Live fleet monitoring",
            "Driver activity tracking",
            "Route performance monitoring",
        ],
    },
    {
        planCode: "ANNUAL_12",
        title: "Annual",
        priceLabel: "₹2500",
        billingLabel: "per bus / 12 months",
        theme: "dark",
        features: [
            "Lowest cost per month",
            "Dedicated onboarding support",
            "Institution branding",
            "Premium customer support",
        ],
    },
];

const planOrder: PlanCode[] = ["TRIAL_7D", "MONTHLY_1", "QUARTERLY_3", "SEMIANNUAL_6", "ANNUAL_12"];

const toPlanCode = (value: unknown): PlanCode | null => {
    if (typeof value !== "string") return null;
    return planOrder.includes(value as PlanCode) ? (value as PlanCode) : null;
};

const toText = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value : fallback;

const normalizePlanSummary = (
    input: unknown
): { currentPlan?: CurrentPlan; usage?: PlanUsage } | null => {
    if (!input || typeof input !== "object") return null;

    const obj = input as {
        currentPlan?: CurrentPlan;
        usage?: PlanUsage;
        data?: { currentPlan?: CurrentPlan; usage?: PlanUsage };
    };

    if (obj.data && typeof obj.data === "object") {
        return obj.data;
    }

    return {
        currentPlan: obj.currentPlan,
        usage: obj.usage,
    };
};

const mapPlanList = (input: unknown): PlanCardModel[] => {
    const items = Array.isArray(input)
        ? input
        : input && typeof input === "object"
            ? ((input as { plans?: unknown; data?: unknown }).plans ?? (input as { plans?: unknown; data?: unknown }).data)
            : undefined;

    if (!Array.isArray(items) || items.length === 0) return defaultPlans;

    return items
        .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const planCode =
                toPlanCode((item as { planCode?: unknown }).planCode) ??
                toPlanCode((item as { code?: unknown }).code) ??
                planOrder[index] ??
                null;
            if (!planCode) return null;

            const title = toText(
                (item as { name?: unknown }).name ?? (item as { title?: unknown }).title,
                defaultPlans.find((plan) => plan.planCode === planCode)?.title ?? planCode
            );
            const priceValue = (item as { price?: unknown }).price ?? (item as { amount?: unknown }).amount;
            const periodValue =
                (item as { billingLabel?: unknown }).billingLabel ??
                (item as { intervalLabel?: unknown }).intervalLabel ??
                (item as { durationLabel?: unknown }).durationLabel;
            const features = Array.isArray((item as { features?: unknown }).features)
                ? ((item as { features?: unknown }).features as unknown[])
                      .filter((feature) => typeof feature === "string")
                      .map((feature) => feature as string)
                : defaultPlans.find((plan) => plan.planCode === planCode)?.features ?? [];

            const fallback = defaultPlans.find((plan) => plan.planCode === planCode);

            return {
                planCode,
                title,
                priceLabel:
                    typeof priceValue === "string"
                        ? priceValue
                        : typeof priceValue === "number"
                            ? `₹${priceValue}`
                            : fallback?.priceLabel ?? "",
                billingLabel: toText(periodValue, fallback?.billingLabel ?? ""),
                        highlight: toText((item as { highlight?: unknown }).highlight, fallback?.highlight ?? "") || undefined,
                theme: fallback?.theme ?? "light",
                features,
            };
        })
                    .filter(Boolean) as PlanCardModel[];
};

export default function PlansPage() {
    const { toggle } = useSidebar();
    const [plans, setPlans] = useState<PlanCardModel[]>(defaultPlans);
    const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
    const [usage, setUsage] = useState<PlanUsage | null>(null);
    const [busCounts, setBusCounts] = useState<Record<PlanCode, string>>({
        TRIAL_7D: "",
        MONTHLY_1: "20",
        QUARTERLY_3: "20",
        SEMIANNUAL_6: "20",
        ANNUAL_12: "20",
    });
    const [loading, setLoading] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<PlanCode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [plansRes, currentRes, summaryRes] = await Promise.allSettled([
                    getPlans(),
                    getCurrentPlan(),
                    getPlanSummary(),
                ]);

                if (!mounted) return;

                if (plansRes.status === "fulfilled") {
                    setPlans(mapPlanList(plansRes.value.data));
                }

                if (currentRes.status === "fulfilled") {
                    const current = normalizePlanSummary(currentRes.value.data);
                    setCurrentPlan(current?.currentPlan ?? null);
                }

                if (summaryRes.status === "fulfilled") {
                    const summary = normalizePlanSummary(summaryRes.value.data);
                    setCurrentPlan(summary?.currentPlan ?? null);
                    setUsage(summary?.usage ?? null);
                }
            } catch {
                if (mounted) setError("Failed to load plans.");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, []);

    const handleActivate = async (planCode: PlanCode) => {
        setError(null);
        setMessage(null);
        setLoadingPlan(planCode);
        try {
            const payload: ActivatePlanPayload =
                planCode === "TRIAL_7D"
                    ? { planCode }
                    : { planCode, busCount: Number(busCounts[planCode] || 0) };

            await activatePlan(payload);
            setMessage("Plan activated successfully.");
            const currentRes = await getCurrentPlan();
            const current = normalizePlanSummary(currentRes.data);
            setCurrentPlan(current?.currentPlan ?? null);
            const summaryRes = await getPlanSummary();
            const summary = normalizePlanSummary(summaryRes.data);
            setCurrentPlan(summary?.currentPlan ?? current?.currentPlan ?? null);
            setUsage(summary?.usage ?? null);
        } catch (err) {
            const fallback = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to activate plan.";
            setError(fallback);
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            <Header onToggleSidebar={toggle} />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="rounded-[28px] border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl sm:px-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                                    <Sparkles className="h-3.5 w-3.5 text-orange-300" />
                                    Plans & Services
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Choose the right membership plan</h1>
                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                                        Select a plan to activate your organization and unlock access to buses, users, drivers, routes, and stops.
                                    </p>
                                </div>
                            </div>

                            <Card className="border-white/10 bg-white/5 p-4 text-white shadow-none backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-300">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-white/60">Organization access</p>
                                        <p className="text-lg font-semibold">Plan required</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                        <Card className="border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active plan</p>
                                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                                        {currentPlan?.planName ?? "No active plan"}
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                        {currentPlan?.description ?? "Activate a plan to unlock the admin features and bus limits for your organization."}
                                    </p>
                                </div>
                                {currentPlan?.status && (
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        {currentPlan.status}
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    
                                    { label: "Duration", value: currentPlan?.durationDays ? `${currentPlan.durationDays} days` : "-" },
                                    { label: "Bus limit", value: currentPlan?.busLimit ?? "-" },
                                    { label: "Price / bus", value: currentPlan?.pricePerBus === 0 ? "Free" : currentPlan?.pricePerBus ? `₹${currentPlan.pricePerBus}` : "-" },
                                    { label: "Current buses", value: usage?.currentBusCount ?? currentPlan?.currentBusCount ?? "-" },
                                    { label: "Remaining slots", value: currentPlan?.remainingBusSlots ?? "-" },
                                    { label: "Ends at", value: currentPlan?.endsAt ? new Date(currentPlan.endsAt).toLocaleString() : (usage?.activePlanExpiresAt ? new Date(usage.activePlanExpiresAt).toLocaleString() : "-") },
                                    { label: "Expired", value: currentPlan?.isExpired ? "Yes" : "No" },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                                    <Check className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Usage</p>
                                    <h3 className="text-lg font-bold text-slate-950">
                                        {usage?.hasActivePlan ? "Active plan enabled" : "No active plan"}
                                    </h3>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 text-sm text-slate-600">
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>Current bus count</span>
                                    <span className="font-semibold text-slate-950">{usage?.currentBusCount ?? currentPlan?.currentBusCount ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>Plan expires at</span>
                                    <span className="font-semibold text-slate-950">
                                        {usage?.activePlanExpiresAt ? new Date(usage.activePlanExpiresAt).toLocaleString() : currentPlan?.endsAt ? new Date(currentPlan.endsAt).toLocaleString() : "-"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>Remaining slots</span>
                                    <span className="font-semibold text-slate-950">{currentPlan?.remainingBusSlots ?? 0}</span>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                            {message}
                        </div>
                    )}

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {loading ? (
                            <Card className="col-span-full flex items-center justify-center gap-2 border-slate-200 bg-white p-8 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading plans...
                            </Card>
                        ) : (
                            plans.map((plan) => {
                                const active = currentPlan?.planCode === plan.planCode;
                                const cardClass =
                                    plan.theme === "dark"
                                        ? "border-slate-900 bg-slate-950 text-white shadow-2xl"
                                        : plan.theme === "accent"
                                            ? "border-orange-300 bg-orange-50 shadow-xl shadow-orange-100"
                                            : "border-slate-200 bg-white shadow-sm";

                                return (
                                    <Card key={plan.planCode} className={`relative rounded-3xl p-5 ${cardClass}`}>
                                        {plan.highlight && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
                                                {plan.highlight}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div>
                                                <p className={`text-sm font-semibold ${plan.theme === "dark" ? "text-white/70" : "text-slate-500"}`}>{plan.title}</p>
                                                <p className={`mt-1 text-4xl font-black tracking-tight ${plan.theme === "dark" ? "text-white" : "text-slate-950"}`}>
                                                    {plan.priceLabel}
                                                </p>
                                                <p className={`text-sm ${plan.theme === "dark" ? "text-white/65" : "text-slate-500"}`}>{plan.billingLabel}</p>
                                            </div>

                                            <ul className="space-y-2 pt-1">
                                                {plan.features.map((feature) => (
                                                    <li key={feature} className={`flex items-start gap-2 text-sm ${plan.theme === "dark" ? "text-white/80" : "text-slate-600"}`}>
                                                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.theme === "dark" ? "text-emerald-400" : "text-emerald-500"}`} />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {plan.planCode !== "TRIAL_7D" && (
                                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bus count</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={busCounts[plan.planCode]}
                                                        onChange={(event) => setBusCounts((current) => ({ ...current, [plan.planCode]: event.target.value }))}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-orange-400"
                                                        placeholder="Enter number of buses"
                                                    />
                                                </div>
                                            )}

                                            <Button
                                                onClick={() => handleActivate(plan.planCode)}
                                                disabled={loadingPlan !== null}
                                                className={
                                                    plan.theme === "dark"
                                                        ? "mt-1 w-full bg-white text-slate-950 hover:bg-slate-100"
                                                        : plan.theme === "accent"
                                                            ? "mt-1 w-full bg-orange-500 text-white hover:bg-orange-600"
                                                            : "mt-1 w-full bg-slate-950 text-white hover:bg-slate-800"
                                                }
                                            >
                                                {loadingPlan === plan.planCode ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        Select Plan <ArrowRight className="h-4 w-4" />
                                                    </>
                                                )}
                                            </Button>

                                            {active && (
                                                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${plan.theme === "dark" ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                                                    <Check className="h-4 w-4" />
                                                    Current active plan
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h2 className="text-xl font-black text-slate-950">Platform Features</h2>
                            <p className="mt-1 text-sm text-slate-500">A quick comparison across available membership plans.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Feature</th>
                                        {plans.map((plan) => (
                                            <th key={plan.planCode} className="px-6 py-4 font-semibold">{plan.title}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        "Real-time Bus Tracking",
                                        "Driver GPS Tracking",
                                        "Current Bus Location",
                                        "Next Stop Visibility",
                                        "ETA Updates",
                                        "Student Notifications",
                                        "Route Management",
                                        "Driver Management",
                                        "Trip History",
                                        "Live Fleet Dashboard",
                                        "Priority Support",
                                        "Institution Branding",
                                    ].map((feature, index) => (
                                        <tr key={feature} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                                            <td className="px-6 py-4 font-medium text-slate-700">{feature}</td>
                                            {plans.map((plan) => (
                                                <td key={`${plan.planCode}-${feature}`} className="px-6 py-4 text-slate-600">
                                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${plan.planCode === "TRIAL_7D" || plan.planCode === "MONTHLY_1" ? "bg-emerald-100 text-emerald-600" : "bg-emerald-100 text-emerald-600"}`}>
                                                        <Check className="h-3.5 w-3.5" />
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <Card className="border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                                    <BusFront className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-950">Perfect for institutions</h3>
                                    <p className="text-sm text-slate-500">Schools, colleges, and campus transport teams can start with trial and upgrade later.</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-950">Why this page exists</h3>
                                    <p className="text-sm text-slate-500">Plan activation controls access to core management screens and bus capacity.</p>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
}