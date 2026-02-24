"use client";

import { useState } from "react";
import { RouteCard } from "./route-card";

interface Route {
    id: string;
    name: string;
    number: string;
    stops: number;
    distance: string;
    isLive?: boolean;
}

const routes: Route[] = [
    {
        id: "101",
        name: "Downtown Express",
        number: "101",
        stops: 12,
        distance: "15.4 km",
        isLive: true,
    },
    {
        id: "204",
        name: "Northside Loop",
        number: "204",
        stops: 8,
        distance: "9.2 km",
    },
    {
        id: "A1",
        name: "Airport Shuttle",
        number: "A1",
        stops: 4,
        distance: "22.8 km",
    },
];

interface RouteListPanelProps {
    selectedRoute: string;
    onSelectRoute: (routeId: string) => void;
}

export function RouteListPanel({ selectedRoute, onSelectRoute }: RouteListPanelProps) {
    const [activeTab, setActiveTab] = useState<"active" | "drafts" | "archived">("active");

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "active"
                            ? "text-blue-600 bg-gray-100 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    Active
                </button>
                <button
                    onClick={() => setActiveTab("drafts")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "drafts"
                            ? "text-blue-600 bg-gray-100 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    Drafts
                </button>
                <button
                    onClick={() => setActiveTab("archived")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "archived"
                            ? "text-blue-600 bg-gray-100 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                >
                    Archived
                </button>
            </div>

            {/* Route List */}
            <div className="p-4 space-y-3">
                {routes.map((route) => (
                    <RouteCard
                        key={route.id}
                        route={route}
                        isSelected={selectedRoute === route.id}
                        onClick={() => onSelectRoute(route.id)}
                    />
                ))}
            </div>
        </div>
    );
}