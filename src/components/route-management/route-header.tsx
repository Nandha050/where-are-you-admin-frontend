"use client";

import { Bell, Plus, Search, Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";

export function RouteManagementHeader() {
    const { toggle } = useSidebar();
    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10">
            {/* Hamburger toggle */}
            <button
                onClick={toggle}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                aria-label="Toggle sidebar"
            >
                <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Title */}
            <div className="shrink-0">
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Route Management</h1>
                <p className="text-xs text-gray-400">Manage and preview bus routes</p>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 shrink-0" />

            {/* Search */}
            <div className="flex-1 max-w-md min-w-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search routes, stops, or IDs..."
                        className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all"
                    />
                </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2 ml-auto">
                <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors relative">
                    <Bell className="w-4.5 h-4.5 text-gray-500" />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </button>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Route</span>
                </button>
            </div>
        </header>
    );
}