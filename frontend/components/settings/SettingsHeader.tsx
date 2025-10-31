"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function SettingsHeader() {
  const router = useRouter();

  return (
    <header className="h-16 bg-black border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-400" />
        </button>

        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </div>

      {/* Right section - empty for Settings */}
      <div className="flex items-center gap-2">
        {/* Reserved for future actions */}
      </div>
    </header>
  );
}
