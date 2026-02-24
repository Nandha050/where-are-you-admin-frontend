"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebasr";
import { SidebarContext } from "@/components/layout/sidebar-context";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <SidebarContext value={{ isOpen, toggle: () => setIsOpen((p) => !p) }}>
            <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
                <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {children}
                </div>
            </div>
        </SidebarContext>
    );
}
