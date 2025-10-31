"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "./ConnectionCard";
import { ConnectionModal } from "./ConnectionModal";
import { useConnectionsStore } from "@/lib/store/connections-store";
import type { Connection } from "@/lib/api/client";

export function ConnectionsList() {
  const { connections, isLoading, error, fetchConnections } =
    useConnectionsStore();
  const [showModal, setShowModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<
    Connection | undefined
  >();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConnection(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading connections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-400">Failed to load connections</div>
        <div className="text-sm text-gray-500">{error}</div>
        <Button onClick={() => fetchConnections()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Connections</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your LLM provider API keys
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Connection
        </Button>
      </div>

      {/* Connections Grid */}
      {connections.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-800 rounded-lg">
          <div className="text-center space-y-4">
            <div className="text-gray-400">No connections yet</div>
            <div className="text-sm text-gray-500">
              Add your first LLM provider connection to get started
            </div>
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </Button>
          </div>
        </div>
      ) : (
        // Connections Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Connection Modal */}
      <ConnectionModal
        open={showModal}
        onOpenChange={handleCloseModal}
        connection={editingConnection}
      />
    </div>
  );
}
