"use client";

import { useSidebar } from "@/components/layout/sidebar-context";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboards/stats-card";
import { FleetMap } from "@/components/dashboards/fleet-map";
import { RecentActivity } from "@/components/dashboards/recent-activity";
import { WeeklyTrend } from "@/components/dashboards/weekly-trend";
import { Bus, Users, Map, UserCheck } from "lucide-react";

const statsData = [
    {
        title: "Total Buses",
        value: "124",
        suffix: "/ 150",
        badge: "+5.2%",
        badgeVariant: "green" as const,
        icon: Bus,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
    },
    {
        title: "Online Drivers",
        value: "86",
        badge: "-2.1%",
        badgeVariant: "red" as const,
        icon: UserCheck,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
    },
    {
        title: "Active Routes",
        value: "42",
        badge: "Steady",
        badgeVariant: "neutral" as const,
        icon: Map,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
    },
    {
        title: "Total Users",
        value: "12,540",
        badge: "+12%",
        badgeVariant: "green" as const,
        icon: Users,
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
    },
];

export default function DashboardPage() {
    const { toggle } = useSidebar();

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header onToggleSidebar={toggle} />
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Page Title */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fleet Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time monitoring and operational status for all active units.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    {statsData.map((stat) => (
                        <StatsCard key={stat.title} {...stat} />
                    ))}
                </div>

                {/* Fleet Map + Recent Activity */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                    <div className="xl:col-span-2">
                        <FleetMap />
                    </div>
                    <div>
                        <RecentActivity />
                    </div>
                </div>

                {/* Weekly Trend */}
                <WeeklyTrend />
            </div>
        </div>
    );
}