"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bot, Plus, Loader2 } from "lucide-react";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";

export default function Home() {
  const { savedWorkflows, isLoading, fetchWorkflows } = useWorkflowsDbStore();

  // Load workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">SentientFlow</h1>
          </div>
          <Link
            href="/workflow/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Workflow
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : savedWorkflows.length === 0 ? (
          /* Empty State */
          <>
            <div className="text-center py-20">
              <h2 className="text-4xl font-bold mb-4">
                Visual Agent Builder for Sentient Framework
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Build powerful AI agents with a visual interface, no coding
                required.
              </p>
              <Link
                href="/workflow/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-lg"
              >
                <Plus size={24} />
                Create Your First Workflow
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
                <h3 className="text-xl font-semibold mb-2">
                  Visual Interface
                </h3>
                <p className="text-gray-400">
                  Drag and drop nodes to build complex agent workflows visually.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
                <h3 className="text-xl font-semibold mb-2">Code Export</h3>
                <p className="text-gray-400">
                  Export your workflows as Python or TypeScript code for
                  customization.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-gray-800 bg-gray-900">
                <h3 className="text-xl font-semibold mb-2">
                  Real-time Streaming
                </h3>
                <p className="text-gray-400">
                  Built on Sentient Framework with SSE-based real-time
                  streaming.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Workflow List */
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Workflows</h2>
              <span className="text-sm text-gray-400">
                {savedWorkflows.length} workflow{savedWorkflows.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  id={workflow.id}
                  name={workflow.name}
                  description={workflow.description}
                  createdAt={workflow.created_at}
                  updatedAt={workflow.updated_at}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
