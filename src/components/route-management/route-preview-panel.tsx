"use client";

import { MapPreviewCard } from "./map-perview-card";
import { StopManagementCard } from "./stop-manegement-card";

interface RoutePreviewPanelProps {
    selectedRoute: string;
}

export function RoutePreviewPanel({ selectedRoute }: RoutePreviewPanelProps) {
    return (
        <div className="space-y-6">
            <MapPreviewCard />
            <StopManagementCard />
        </div>
    );
}