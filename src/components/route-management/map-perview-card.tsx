"use client";

import { Maximize2, Layers, Settings } from "lucide-react";

export function MapPreviewCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Map Preview */}
            <div className="relative h-64 bg-linear-to-br from-blue-100 via-teal-50 to-green-100 overflow-hidden">
                {/* Map Placeholder with pattern */}
                <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Map Markers */}
                <div className="absolute top-8 left-12">
                    <div className="w-8 h-8 bg-purple-500 rounded-full border-4 border-white shadow-lg"></div>
                </div>
                <div className="absolute top-24 right-20">
                    <div className="w-6 h-6 bg-blue-500 rounded-full border-3 border-white shadow-lg"></div>
                </div>
                <div className="absolute bottom-12 left-24">
                    <div className="w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg"></div>
                </div>

                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-200 shadow-lg">
                        <p className="text-sm font-medium text-gray-900">Interactive Map Preview</p>
                    </div>
                </div>

                {/* Floating Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="p-2.5 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 transition-colors">
                        <Maximize2 className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-2.5 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 transition-colors">
                        <Layers className="w-4 h-4 text-gray-700" />
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Route Metadata */}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Route Code
                            </p>
                            <p className="text-base font-semibold text-gray-900">DT-101-EXP</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Total Duration
                            </p>
                            <p className="text-base font-semibold text-gray-900">45 mins</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Operational Hours
                            </p>
                            <p className="text-base font-semibold text-gray-900">05:00 - 23:00</p>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                        <Settings className="w-4 h-4" />
                        Route Settings
                    </button>
                </div>
            </div>
        </div>
    );
}