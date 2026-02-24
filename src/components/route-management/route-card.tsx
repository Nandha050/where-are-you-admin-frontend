"use client";

import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface Route {
    id: string;
    name: string;
    number: string;
    stops: number;
    distance: string;
    isLive?: boolean;
}

interface RouteCardProps {
    route: Route;
    isSelected: boolean;
    onClick: () => void;
}

export function RouteCard({ route, isSelected, onClick }: RouteCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 rounded-xl border transition-all duration-150",
                isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className={cn("text-sm font-semibold", isSelected ? "text-blue-900" : "text-gray-900")}>
                    {route.name}{" "}
                    <span className={cn("font-normal", isSelected ? "text-blue-600" : "text-gray-500")}>
                        ({route.number})
                    </span>
                </p>
                {route.isLive && (
                    <span className="shrink-0 inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {route.stops} Stops
                </span>
                <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {route.distance}
                </span>
            </div>
        </button>
    );
}
