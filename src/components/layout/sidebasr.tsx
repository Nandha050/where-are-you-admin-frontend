"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Bus,
    Users,
    Map,
    UserCircle,
    Bell,
    Settings,
    X,
} from "lucide-react";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/Dashboard" },
    { label: "Bus Management", icon: Bus, href: "/Dashboard/buses" },
    { label: "Live Tracking", icon: UserCircle, href: "/Dashboard/live-tracking" },
    { label: "Route Planning", icon: Map, href: "/Dashboard/route-planning" },
    { label: "Driver Registry", icon: Users, href: "/Dashboard/drivers" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:relative z-30 lg:z-auto inset-y-0 left-0",
                    "h-full bg-white border-r border-gray-100 flex flex-col",
                    "transition-all duration-300 ease-in-out",
                    // Mobile: slide in/out
                    "w-65",
                    isOpen
                        ? "translate-x-0 shadow-2xl lg:shadow-none"
                        : "-translate-x-full lg:translate-x-0",
                    // Desktop: collapse to icon-only
                    isOpen ? "lg:w-65" : "lg:w-17"
                )}
            >
                {/* Logo */}
                <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-100 min-h-17">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Bus className="w-5 h-5 text-white" />
                    </div>
                    <span
                        className={cn(
                            "text-lg font-bold text-blue-600 whitespace-nowrap transition-all duration-200",
                            isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                        )}
                    >
                        BusTrack Pro
                    </span>
                    {/* Close button — mobile only */}
                    <button
                        onClick={onClose}
                        className="ml-auto lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(({ label, icon: Icon, href }) => {
                        const active =
                            href === "/Dashboard"
                                ? pathname === href
                                : pathname?.startsWith(href);

                        return (
                        <Link
                            key={label}
                            href={href}
                            title={!isOpen ? label : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                                active
                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium",
                                !isOpen && "justify-center px-0"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-5 h-5 shrink-0",
                                    active ? "text-blue-600" : "text-gray-400"
                                )}
                            />
                            <span
                                className={cn(
                                    "whitespace-nowrap transition-all duration-200",
                                    isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                                )}
                            >
                                {label}
                            </span>
                        </Link>
                    )})}

                    {/* System section */}
                    <div className="pt-4 pb-1">
                        {isOpen && (
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">
                                System
                            </p>
                        )}
                        <button
                            title={!isOpen ? "Notifications" : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors",
                                !isOpen && "justify-center px-0"
                            )}
                        >
                            <Bell className="w-5 h-5 text-gray-400 shrink-0" />
                            <span
                                className={cn(
                                    "flex-1 text-left whitespace-nowrap transition-all duration-200",
                                    isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                                )}
                            >
                                Notifications
                            </span>
                            {isOpen && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                    4
                                </span>
                            )}
                        </button>
                        <button
                            title={!isOpen ? "Settings" : undefined}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors",
                                !isOpen && "justify-center px-0"
                            )}
                        >
                            <Settings className="w-5 h-5 text-gray-400 shrink-0" />
                            <span
                                className={cn(
                                    "whitespace-nowrap transition-all duration-200",
                                    isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                                )}
                            >
                                Settings
                            </span>
                        </button>
                    </div>
                </nav>

                {/* User Profile */}
                <div className="px-2 py-4 border-t border-gray-100">
                    <div
                        className={cn(
                            "flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors",
                            !isOpen && "justify-center px-0"
                        )}
                    >
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            AR
                        </div>
                        <div
                            className={cn(
                                "flex-1 min-w-0 transition-all duration-200",
                                isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                            )}
                        >
                            <p className="text-sm font-semibold text-gray-900 truncate">Alex Rivera</p>
                            <p className="text-xs text-gray-400 truncate">Super Admin</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}