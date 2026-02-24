"use client";

import { Flag, Plus } from "lucide-react";

interface Stop {
    id: string;
    number: number;
    name: string;
    subtitle: string;
    isTerminal?: boolean;
    isEnd?: boolean;
}

const stops: Stop[] = [
    {
        id: "1",
        number: 1,
        name: "Central Station (Terminal A)",
        subtitle: "Arrival: T+0m • Departure: T+5m",
        isTerminal: true,
    },
    {
        id: "2",
        number: 2,
        name: "Broadway & 5th Avenue",
        subtitle: "Travel time: 12m • Distance: 3.2km",
    },
    {
        id: "3",
        number: 3,
        name: "Business District Plaza",
        subtitle: "Travel time: 8m • Distance: 2.1km",
    },
    {
        id: "4",
        number: 4,
        name: "Harbor View (End Terminal)",
        subtitle: "Total Route Time: 45m",
        isEnd: true,
    },
];

export function StopTimeline() {
    return (
        <div className="space-y-0">
            {stops.map((stop, index) => (
                <div key={stop.id} className="relative">
                    <div className="flex gap-6">
                        {/* Timeline Left Side */}
                        <div className="relative flex flex-col items-center">
                            {/* Number Circle or Icon */}
                            {stop.isEnd ? (
                                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center z-10">
                                    <Flag className="w-5 h-5 text-white" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm z-10">
                                    {String(stop.number).padStart(2, '0')}
                                </div>
                            )}

                            {/* Connecting Line */}
                            {index < stops.length - 1 && (
                                <div className="absolute top-10 bottom-0 w-0.5 bg-gray-300" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                            )}
                        </div>

                        {/* Stop Card */}
                        <div className="flex-1 pb-8">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                                <h3 className="font-semibold text-gray-900 mb-1">{stop.name}</h3>
                                <p className="text-sm text-gray-600">{stop.subtitle}</p>
                            </div>

                            {/* Insert Stop Button */}
                            {stop.number === 3 && (
                                <button className="flex items-center gap-2 mt-4 ml-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                    <Plus className="w-4 h-4" />
                                    Insert stop between 03 and 04
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}