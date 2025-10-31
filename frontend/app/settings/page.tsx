"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionsList } from "@/components/connections/ConnectionsList";
import { SettingsHeader } from "@/components/settings/SettingsHeader";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      {/* Header */}
      <SettingsHeader />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Description */}
          <div className="mb-8">
            <p className="text-gray-400">
              Configure your SentientFlow workspace
            </p>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="connections" className="space-y-6">
            <TabsList>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="general" disabled>
                General
              </TabsTrigger>
              <TabsTrigger value="workflows" disabled>
                Workflows
              </TabsTrigger>
              <TabsTrigger value="advanced" disabled>
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* Connections Tab */}
            <TabsContent value="connections" className="space-y-4">
              <ConnectionsList />
            </TabsContent>

            {/* Placeholder for other tabs */}
            <TabsContent value="general">
              <div className="text-gray-400">General settings coming soon...</div>
            </TabsContent>

            <TabsContent value="workflows">
              <div className="text-gray-400">Workflow settings coming soon...</div>
            </TabsContent>

            <TabsContent value="advanced">
              <div className="text-gray-400">Advanced settings coming soon...</div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
