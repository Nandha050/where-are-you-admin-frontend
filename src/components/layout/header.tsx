"use client";

import { Search, HelpCircle, MessageSquare, ChevronDown, Menu } from "lucide-react";
import type { ReactNode } from "react";

interface HeaderProps {
    onToggleSidebar: () => void;
    rightContent?: ReactNode;
    searchPlaceholder?: string;
}

export function Header({
    onToggleSidebar,
    rightContent,
    searchPlaceholder = "Search buses, drivers or routes...",
}: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10">
            {/* Hamburger toggle */}
            <button
                onClick={onToggleSidebar}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                aria-label="Toggle sidebar"
            >
                <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md min-w-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all"
                    />
                </div>
            </div>

            {/* Right Controls */}
            {rightContent ? (
                <div className="ml-auto flex items-center gap-2">{rightContent}</div>
            ) : (
                <div className="flex items-center gap-2 ml-auto">
                    <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                        <HelpCircle className="w-4.5 h-4.5 text-gray-500" />
                    </button>
                    <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors relative">
                        <MessageSquare className="w-4.5 h-4.5 text-gray-500" />
                    </button>

                    {/* Org Dropdown — hidden on small screens */}
                    <button className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 max-w-50 lg:max-w-none">
                        <span className="text-sm font-medium text-gray-700 truncate">Metropolitan Transit Auth.</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>
                </div>
            )}
        </header>
    );
}