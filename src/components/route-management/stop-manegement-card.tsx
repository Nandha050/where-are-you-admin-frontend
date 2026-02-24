"use client";

import { ArrowUpDown, Plus } from "lucide-react";
import { StopTimeline } from "./stop-timeline";

export function StopManagementCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Stop Management</h2>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                        <ArrowUpDown className="w-4 h-4" />
                        Reorder
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Stop
                    </button>
                </div>
            </div>

            {/* Stop Timeline */}
            <div className="p-6">
                <StopTimeline />
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                    Discard Changes
                </button>
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Save Route Configuration
                </button>
            </div>
        </div>
    );
}