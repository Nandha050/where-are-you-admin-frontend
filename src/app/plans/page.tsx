"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BusFront, Check, History, Loader2, Sparkles, ShieldCheck } from "lucide-react";

import { Header } from "@/components/layout/header";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    activatePlan,
    createRazorpayOrder,
    getCurrentPlan,
    getPlanHistory,
    getPlanSummary,
    getPlans,
    verifyRazorpayPayment,
    type ActivatePlanPayload,
    type PlanCode,
    type RazorpayOrderPayload,
    type RazorpayOrderResponse,
    type RazorpayVerifyPayload,
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
    currentBusCount?: number;
    remainingBusSlots?: number;
    isExpired?: boolean;
};

type PlanUsage = {
    currentBusCount?: number;
    hasActivePlan?: boolean;
    activePlanExpiresAt?: string;
};

type PaymentHistoryItem = {
    planName?: string;
    busCount?: number;
    amount?: number;
    status?: "paid" | "failed" | "created" | string;
    createdAt?: string;
    paidAt?: string;
    failureReason?: string;
    pendingReason?: string;
};

type RazorpaySummary = {
    currentPlan?: CurrentPlan;
    usage?: PlanUsage;
    activePlans?: CurrentPlan[];
};

type RazorpayCheckoutResponse = {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
};

type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    handler: (response: RazorpayCheckoutResponse) => void;
    modal?: {
        ondismiss?: () => void;
    };
    prefill?: {
        name?: string;
        email?: string;
    };
    theme?: {
        color?: string;
    };
};

type RazorpayWindow = Window & {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void };
};

const planOrder: PlanCode[] = ["TRIAL_7D", "MONTHLY_1", "QUARTERLY_3", "SEMIANNUAL_6", "ANNUAL_12"];

const defaultPlans: PlanCardModel[] = [
    {
        planCode: "TRIAL_7D",
        title: "Free Trial",
        priceLabel: "Free",
        billingLabel: "for 7 days",
        theme: "light",
        features: ["Trial access for evaluation", "Core fleet dashboard", "Route and student management", "Driver and bus workflows"],
    },
    {
        planCode: "MONTHLY_1",
        title: "Monthly",
        priceLabel: "₹1",
        billingLabel: "per bus / month",
        theme: "light",
        features: ["Real-time bus tracking", "Student notifications", "Delay alerts", "Route and driver management"],
    },
    {
        planCode: "QUARTERLY_3",
        title: "Quarterly",
        priceLabel: "₹750",
        billingLabel: "per bus / 3 months",
        theme: "light",
        features: ["Location refresh optimization", "Personalized notifications", "Route visibility controls", "Priority support"],
    },
    {
        planCode: "SEMIANNUAL_6",
        title: "Half-Yearly",
        priceLabel: "₹1500",
        billingLabel: "per bus / 6 months",
        highlight: "Recommended",
        theme: "accent",
        features: ["Advanced dashboard", "Live fleet monitoring", "Driver activity tracking", "Route performance monitoring"],
    },
    {
        planCode: "ANNUAL_12",
        title: "Annual",
        priceLabel: "₹2500",
        billingLabel: "per bus / 12 months",
        theme: "dark",
        features: ["Lowest cost per month", "Dedicated onboarding support", "Institution branding", "Premium customer support"],
    },
];

const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
        if (typeof window === "undefined") {
            resolve(false);
            return;
        }

        if ((window as RazorpayWindow).Razorpay) {
            resolve(true);
            return;
        }

        const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existing) {
            existing.addEventListener("load", () => resolve(true), { once: true });
            existing.addEventListener("error", () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

const normalizePlanSummary = (input: unknown): RazorpaySummary | null => {
    if (!input || typeof input !== "object") return null;

    const obj = input as {
        currentPlan?: CurrentPlan;
        usage?: PlanUsage;
        data?: { currentPlan?: CurrentPlan; usage?: PlanUsage };
    };

    if (obj.data && typeof obj.data === "object") return obj.data;
    return { currentPlan: obj.currentPlan, usage: obj.usage };
};

const normalizeRazorpayOrder = (input: unknown): RazorpayOrderResponse | null => {
    if (!input || typeof input !== "object") return null;

    const obj = input as {
        order?: { orderId?: string; amount?: number; currency?: string };
        keyId?: string;
        data?: { order?: { orderId?: string; amount?: number; currency?: string }; keyId?: string };
    };

    if (obj.data && typeof obj.data === "object") return obj.data as RazorpayOrderResponse;

    if (obj.order && typeof obj.order === "object") {
        return {
            order: {
                orderId: obj.order.orderId ?? "",
                amount: obj.order.amount ?? 0,
                currency: obj.order.currency ?? "INR",
            },
            keyId: obj.keyId ?? "",
        };
    }

    return {
        order: {
            orderId: "",
            amount: 0,
            currency: "INR",
        },
        keyId: obj.keyId ?? "",
    };
};

const extractPlans = (input: unknown): PlanCardModel[] => {
    const items = Array.isArray(input)
        ? input
        : input && typeof input === "object"
            ? ((input as { plans?: unknown; data?: unknown }).plans ?? (input as { plans?: unknown; data?: unknown }).data)
            : undefined;

    if (!Array.isArray(items) || items.length === 0) return defaultPlans;

    const mapped = items
        .map((item, index) => {
            if (!item || typeof item !== "object") return null;

            const rawPlanCode = (item as { planCode?: unknown }).planCode ?? (item as { code?: unknown }).code;
            const planCode = typeof rawPlanCode === "string" && planOrder.includes(rawPlanCode as PlanCode) ? (rawPlanCode as PlanCode) : planOrder[index] ?? null;
            if (!planCode) return null;

            const fallback = defaultPlans.find((plan) => plan.planCode === planCode);
            const title =
                typeof (item as { name?: unknown }).name === "string"
                    ? ((item as { name?: string }).name as string)
                    : typeof (item as { title?: unknown }).title === "string"
                        ? ((item as { title?: string }).title as string)
                        : fallback?.title ?? planCode;
            const priceValue = (item as { price?: unknown }).price ?? (item as { amount?: unknown }).amount;
            const labelValue = (item as { billingLabel?: unknown }).billingLabel ?? (item as { intervalLabel?: unknown }).intervalLabel ?? (item as { durationLabel?: unknown }).durationLabel;
            const features = Array.isArray((item as { features?: unknown }).features)
                ? (((item as { features?: unknown }).features as unknown[]).filter((feature) => typeof feature === "string") as string[])
                : fallback?.features ?? [];

            const highlightValue = (item as { highlight?: unknown }).highlight;

            return {
                planCode,
                title,
                priceLabel:
                    typeof priceValue === "string"
                        ? priceValue
                        : typeof priceValue === "number"
                            ? `₹${priceValue}`
                            : fallback?.priceLabel ?? "",
                billingLabel:
                    typeof labelValue === "string" && labelValue.trim() ? labelValue : fallback?.billingLabel ?? "",
                highlight:
                    typeof highlightValue === "string" && highlightValue.trim() ? highlightValue : fallback?.highlight,
                theme: fallback?.theme ?? "light",
                features,
            };
        })
        .filter(Boolean) as PlanCardModel[];

    return mapped.sort((left, right) => planOrder.indexOf(left.planCode) - planOrder.indexOf(right.planCode));
};

export default function PlansPage() {
    const { toggle } = useSidebar();
    const [plans, setPlans] = useState<PlanCardModel[]>(defaultPlans);
    const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
    const [usage, setUsage] = useState<PlanUsage | null>(null);
    const [activePlans, setActivePlans] = useState<CurrentPlan[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [busCounts, setBusCounts] = useState<Record<Exclude<PlanCode, "TRIAL_7D">, string>>({
        MONTHLY_1: "20",
        QUARTERLY_3: "20",
        SEMIANNUAL_6: "20",
        ANNUAL_12: "20",
    });
    const [loading, setLoading] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<PlanCode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const refreshPlanState = async () => {
        const [currentRes, summaryRes] = await Promise.all([getCurrentPlan(), getPlanSummary()]);
        const current = normalizePlanSummary(currentRes.data);
        const summary = normalizePlanSummary(summaryRes.data);
        setCurrentPlan(summary?.currentPlan ?? current?.currentPlan ?? null);
        setUsage(summary?.usage ?? null);
        setActivePlans(summary?.activePlans ?? []);
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const [plansRes, currentRes, summaryRes] = await Promise.allSettled([getPlans(), getCurrentPlan(), getPlanSummary()]);

                if (!mounted) return;

                if (plansRes.status === "fulfilled") {
                    setPlans(extractPlans(plansRes.value.data));
                }

                if (currentRes.status === "fulfilled") {
                    const current = normalizePlanSummary(currentRes.value.data);
                    setCurrentPlan(current?.currentPlan ?? null);
                }

                if (summaryRes.status === "fulfilled") {
                    const summary = normalizePlanSummary(summaryRes.value.data);
                    setCurrentPlan(summary?.currentPlan ?? null);
                    setUsage(summary?.usage ?? null);
                    setActivePlans(summary?.activePlans ?? []);
                }

                const historyRes = await getPlanHistory();
                const historyJson = historyRes.data as { history?: PaymentHistoryItem[]; data?: { history?: PaymentHistoryItem[] } };
                setPaymentHistory(Array.isArray(historyJson.history) ? historyJson.history : Array.isArray(historyJson.data?.history) ? historyJson.data.history : []);
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

    const handleTrialActivation = async () => {
        await activatePlan({ planCode: "TRIAL_7D" } satisfies ActivatePlanPayload);
        await refreshPlanState();
    };

    const handlePaidPlanPurchase = async (planCode: Exclude<PlanCode, "TRIAL_7D">) => {
        const busCount = Number(busCounts[planCode] || 0);
        if (!Number.isFinite(busCount) || busCount <= 0) {
            throw new Error("Please enter a valid bus count before continuing.");
        }

        const orderPayload: RazorpayOrderPayload = { planCode, busCount };
        const orderRes = await createRazorpayOrder(orderPayload);
        const orderData = normalizeRazorpayOrder(orderRes.data);

        if (!orderData?.order?.orderId || !orderData?.keyId || !orderData?.order?.amount || !orderData?.order?.currency) {
            throw new Error("Razorpay order details are incomplete.");
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            throw new Error("Unable to load Razorpay checkout.");
        }

        const RazorpayCtor = (window as RazorpayWindow).Razorpay;
        if (!RazorpayCtor) {
            throw new Error("Razorpay checkout could not be initialized.");
        }

        const options: RazorpayOptions = {
            key: orderData.keyId,
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: "Where Are You Admin",
            description: `${planCode} plan purchase`,
            order_id: orderData.order.orderId,
            theme: { color: "#111827" },
            handler: (response) => {
                void (async () => {
                    try {
                        const paymentId = response.razorpay_payment_id;
                        const signature = response.razorpay_signature;

                        if (!paymentId || !signature) {
                            throw new Error("Payment verification data is missing.");
                        }

                        const verifyPayload: RazorpayVerifyPayload = {
                            orderId: orderData.order.orderId,
                            paymentId,
                            signature,
                        };

                        await verifyRazorpayPayment(verifyPayload);
                        await refreshPlanState();
                        setMessage("Payment verified and plan activated successfully.");
                    } catch (err) {
                        const text = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as Error)?.message ?? "Payment verification failed.";
                        setError(text);
                    } finally {
                        setLoadingPlan(null);
                    }
                })();
            },
            modal: {
                ondismiss: () => {
                    setLoadingPlan(null);
                },
            },
        };

        const razorpay = new RazorpayCtor(options);
        razorpay.on("payment.failed", (response) => {
            setError(response.error?.description ?? "Payment failed.");
            setLoadingPlan(null);
        });
        razorpay.open();
    };

    const handlePlanAction = async (plan: PlanCardModel) => {
        setError(null);
        setMessage(null);
        setLoadingPlan(plan.planCode);

        try {
            if (plan.planCode === "TRIAL_7D") {
                await handleTrialActivation();
                setMessage("Trial activated successfully.");
                return;
            }

            await handlePaidPlanPurchase(plan.planCode);
        } catch (err) {
            const text = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (err as Error)?.message ?? "Failed to start plan activation.";
            setError(text);
            setLoadingPlan(null);
        }
    };

    const formatMoney = (paise?: number) => {
        if (typeof paise !== "number" || Number.isNaN(paise)) return "-";
        return `₹${(paise / 100).toFixed(paise % 100 === 0 ? 0 : 2)}`;
    };

    const formatHistoryStatus = (status?: string) => {
        const normalized = String(status ?? "").toLowerCase();
        if (normalized === "paid" || normalized === "success" || normalized === "successful") return "successful";
        if (normalized === "failed") return "failure";
        return "pending";
    };

    const activePlanCards = activePlans.length > 0 ? activePlans : currentPlan ? [currentPlan] : [];

    return (
        <div className="flex h-full flex-col overflow-hidden bg-slate-50">
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
                                        Activate a free trial or purchase a paid plan to unlock admin access for buses, users, drivers, routes, and stops.
                                    </p>
                                </div>
                            </div>

                            <Card className="border-white/10 bg-white/5 p-4 text-white shadow-none backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-300">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-white/60">Plan status</p>
                                        <p className="text-lg font-semibold">{currentPlan?.status ?? "No active plan"}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                        <Card className="border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active plan</p>
                                    </div>
                                    <h2 className="mt-2 text-2xl font-black text-slate-950">{currentPlan?.planName ?? "No active plan"}</h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                        {currentPlan?.description ?? "Activate a plan to unlock the admin features and bus limits for your organization."}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${currentPlan?.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                        {currentPlan?.status ?? "inactive"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory(true)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        aria-label="Open payment history"
                                        title="Payment history"
                                    >
                                        <History className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    { label: "Plan code", value: currentPlan?.planCode ?? "-" },
                                    { label: "Duration", value: currentPlan?.durationDays ? `${currentPlan.durationDays} days` : "-" },
                                    { label: "Price / bus", value: currentPlan?.pricePerBus === 0 ? "Free" : currentPlan?.pricePerBus ? `₹${currentPlan.pricePerBus}` : "-" },
                                    { label: "Bus limit", value: currentPlan?.busLimit ?? "-" },
                                    { label: "Current buses", value: currentPlan?.currentBusCount ?? usage?.currentBusCount ?? "-" },
                                    { label: "Remaining slots", value: currentPlan?.remainingBusSlots ?? "-" },
                                    { label: "Starts at", value: currentPlan?.startsAt ? new Date(currentPlan.startsAt).toLocaleString() : "-" },
                                    { label: "Ends at", value: currentPlan?.endsAt ? new Date(currentPlan.endsAt).toLocaleString() : usage?.activePlanExpiresAt ? new Date(usage.activePlanExpiresAt).toLocaleString() : "-" },
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
                                    <h3 className="text-lg font-bold text-slate-950">{usage?.hasActivePlan ? "Active plan enabled" : "No active plan"}</h3>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 text-sm text-slate-600">
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>Activation source</span>
                                    <span className="font-semibold text-slate-950">{currentPlan?.activationSource ?? "-"}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span>Expires at</span>
                                    <span className="font-semibold text-slate-950">
                                        {currentPlan?.endsAt ? new Date(currentPlan.endsAt).toLocaleString() : usage?.activePlanExpiresAt ? new Date(usage.activePlanExpiresAt).toLocaleString() : "-"}
                                    </span>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
                                    Paid plans are activated through Razorpay checkout and verified before admin features are unlocked.
                                </div>
                            </div>
                        </Card>
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h2 className="text-xl font-black text-slate-950">More Active Plan Details</h2>
                            <p className="mt-1 text-sm text-slate-500">Same format as the main active plan, for any additional active subscriptions.</p>
                        </div>
                        <div className="grid gap-4 p-6 xl:grid-cols-2">
                            {activePlanCards.map((plan, index) => (
                                <Card key={`${plan.planName ?? plan.planCode ?? "plan"}-${index}`} className="border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active plan</p>
                                            </div>
                                            <h3 className="mt-2 text-2xl font-black text-slate-950">{plan.planName ?? currentPlan?.planName ?? "No active plan"}</h3>
                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                                {plan.description ?? currentPlan?.description ?? "Activate a plan to unlock the admin features and bus limits for your organization."}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${plan.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                            {plan.status ?? "inactive"}
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {[
                                            { label: "Plan code", value: plan.planCode ?? currentPlan?.planCode ?? "-" },
                                            { label: "Duration", value: plan.durationDays ? `${plan.durationDays} days` : currentPlan?.durationDays ? `${currentPlan.durationDays} days` : "-" },
                                            { label: "Price / bus", value: plan.pricePerBus === 0 ? "Free" : plan.pricePerBus ? `₹${plan.pricePerBus}` : currentPlan?.pricePerBus === 0 ? "Free" : currentPlan?.pricePerBus ? `₹${currentPlan.pricePerBus}` : "-" },
                                            { label: "Bus limit", value: plan.busLimit ?? currentPlan?.busLimit ?? "-" },
                                            { label: "Current buses", value: plan.currentBusCount ?? currentPlan?.currentBusCount ?? usage?.currentBusCount ?? "-" },
                                            { label: "Remaining slots", value: plan.remainingBusSlots ?? currentPlan?.remainingBusSlots ?? "-" },
                                            { label: "Starts at", value: plan.startsAt ? new Date(plan.startsAt).toLocaleString() : currentPlan?.startsAt ? new Date(currentPlan.startsAt).toLocaleString() : "-" },
                                            { label: "Ends at", value: plan.endsAt ? new Date(plan.endsAt).toLocaleString() : currentPlan?.endsAt ? new Date(currentPlan.endsAt).toLocaleString() : usage?.activePlanExpiresAt ? new Date(usage.activePlanExpiresAt).toLocaleString() : "-" },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                                                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {showHistory && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Payment history"
                            onClick={() => setShowHistory(false)}
                        >
                            <div
                                className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment history</p>
                                        <p className="text-sm text-slate-500">Scroll to review successful, failure, and pending payments.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowHistory(false)}
                                        className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="max-h-[75vh] overflow-y-auto p-6">
                                    <div className="space-y-3">
                                        {paymentHistory.map((item, index) => {
                                            const status = formatHistoryStatus(item.status)
                                            const reason = status === "failure" ? item.failureReason : status === "pending" ? item.pendingReason : undefined
                                            const dateValue = item.paidAt ?? item.createdAt

                                            return (
                                                <div key={`${item.planName ?? "payment"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-950">{item.planName ?? "-"}</p>
                                                            <p className="text-sm text-slate-600">No buses: {item.busCount ?? "-"}</p>
                                                            <p className="text-sm text-slate-600">Amount: {formatMoney(item.amount)}</p>
                                                        </div>
                                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${status === "successful" ? "bg-emerald-50 text-emerald-700" : status === "failure" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
                                                        <p>Time/date: {dateValue ? new Date(dateValue).toLocaleString() : "-"}</p>
                                                        <p>Reason: {reason ?? "-"}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {loading ? (
                            <Card className="col-span-full flex items-center justify-center gap-2 border-slate-200 bg-white p-8 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading plans...
                            </Card>
                        ) : (
                            plans.map((plan) => {
                                const active = currentPlan?.planCode === plan.planCode;
                                const paidPlan = plan.planCode !== "TRIAL_7D";
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
                                                <p className={`mt-1 text-4xl font-black tracking-tight ${plan.theme === "dark" ? "text-white" : "text-slate-950"}`}>{plan.priceLabel}</p>
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

                                            {paidPlan && (
                                                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                                                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bus count</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={busCounts[plan.planCode as Exclude<PlanCode, "TRIAL_7D">] ?? ""}
                                                        onChange={(event) =>
                                                            setBusCounts((current) => ({
                                                                ...current,
                                                                [plan.planCode as Exclude<PlanCode, "TRIAL_7D">]: event.target.value,
                                                            }))
                                                        }
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-orange-400"
                                                        placeholder="Enter number of buses"
                                                    />
                                                </div>
                                            )}

                                            <Button
                                                onClick={() => handlePlanAction(plan)}
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
                                                        {paidPlan ? "Buy Plan" : "Activate Trial"}
                                                        <ArrowRight className="h-4 w-4" />
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
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
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
                                    <p className="text-sm text-slate-500">Paid plans are verified through Razorpay before unlocking admin management screens.</p>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
}
