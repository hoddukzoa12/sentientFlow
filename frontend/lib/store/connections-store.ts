/**
 * Connections Store
 *
 * Manages LLM provider connections (OpenAI, Anthropic, Gemini, Grok).
 * Similar to n8n's Credentials system - users can create multiple connections
 * per provider and set one as active.
 */

import { create } from "zustand";
import { api, Connection, ConnectionCreate, ConnectionUpdate } from "@/lib/api/client";

type Provider = "openai" | "anthropic" | "gemini" | "grok";

interface ConnectionsState {
  // Data
  connections: Connection[];
  activeConnections: Map<Provider, Connection>; // Provider -> Active connection
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConnections: () => Promise<void>;
  createConnection: (data: ConnectionCreate) => Promise<void>;
  updateConnection: (id: string, data: ConnectionUpdate) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  activateConnection: (id: string) => Promise<void>;
  getActiveConnection: (provider: Provider) => Connection | undefined;
  clearError: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  connections: [],
  activeConnections: new Map(),
  isLoading: false,
  error: null,

  /**
   * Fetch all connections from backend
   */
  fetchConnections: async () => {
    set({ isLoading: true, error: null });

    try {
      const connections = await api.connections.list();

      // Build active connections map
      const activeMap = new Map<Provider, Connection>();
      connections.forEach((conn) => {
        if (conn.is_active) {
          activeMap.set(conn.provider, conn);
        }
      });

      set({
        connections,
        activeConnections: activeMap,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch connections",
        isLoading: false,
      });
    }
  },

  /**
   * Create a new connection
   */
  createConnection: async (data: ConnectionCreate) => {
    set({ isLoading: true, error: null });

    try {
      const newConnection = await api.connections.create(data);

      set((state) => {
        const updatedConnections = [...state.connections, newConnection];
        const updatedActiveMap = new Map(state.activeConnections);

        // If this is the first connection for this provider, set as active
        if (newConnection.is_active) {
          updatedActiveMap.set(newConnection.provider, newConnection);
        }

        return {
          connections: updatedConnections,
          activeConnections: updatedActiveMap,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create connection",
        isLoading: false,
      });
      throw error; // Re-throw for UI handling
    }
  },

  /**
   * Update a connection
   */
  updateConnection: async (id: string, data: ConnectionUpdate) => {
    set({ isLoading: true, error: null });

    try {
      const updatedConnection = await api.connections.update(id, data);

      set((state) => ({
        connections: state.connections.map((conn) =>
          conn.id === id ? updatedConnection : conn
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update connection",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Delete a connection
   */
  deleteConnection: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await api.connections.delete(id);

      set((state) => {
        const deletedConn = state.connections.find((c) => c.id === id);
        const updatedConnections = state.connections.filter((c) => c.id !== id);
        const updatedActiveMap = new Map(state.activeConnections);

        // If deleted connection was active, remove from map
        if (deletedConn?.is_active) {
          updatedActiveMap.delete(deletedConn.provider);
        }

        return {
          connections: updatedConnections,
          activeConnections: updatedActiveMap,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete connection",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Activate a connection (sets it as the active connection for its provider)
   */
  activateConnection: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const activatedConnection = await api.connections.activate(id);

      set((state) => {
        const provider = activatedConnection.provider;

        // Deactivate all connections for this provider
        const updatedConnections = state.connections.map((conn) =>
          conn.provider === provider
            ? { ...conn, is_active: conn.id === id }
            : conn
        );

        // Update active connections map
        const updatedActiveMap = new Map(state.activeConnections);
        updatedActiveMap.set(provider, activatedConnection);

        return {
          connections: updatedConnections,
          activeConnections: updatedActiveMap,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to activate connection",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Get the active connection for a provider (cached)
   */
  getActiveConnection: (provider: Provider) => {
    return get().activeConnections.get(provider);
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),
}));
