"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
    isOpen: boolean;
    toggle: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
    isOpen: true,
    toggle: () => { },
});

export function useSidebar() {
    return useContext(SidebarContext);
}
