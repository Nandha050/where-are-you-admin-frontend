"use client";

import { useState } from "react";
import { RouteListPanel } from "@/components/route-management/route-list-panel";
import { RoutePreviewPanel } from "@/components/route-management/route-preview-panel";

export default function RouteManagementPage() {
    const [selectedRoute, setSelectedRoute] = useState("101");

    return (
        <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                {/* Left Column - Route List */}
                <div className="lg:col-span-4">
                    <RouteListPanel
                        selectedRoute={selectedRoute}
                        onSelectRoute={setSelectedRoute}
                    />
                </div>

                {/* Right Column - Route Preview & Stop Management */}
                <div className="lg:col-span-8">
                    <RoutePreviewPanel selectedRoute={selectedRoute} />
                </div>
            </div>
        </div>
    );
}