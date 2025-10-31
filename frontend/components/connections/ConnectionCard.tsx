"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { useConnectionsStore } from "@/lib/store/connections-store";
import type { Connection } from "@/lib/api/client";

interface ConnectionCardProps {
  connection: Connection;
  onEdit: (connection: Connection) => void;
}

export function ConnectionCard({ connection, onEdit }: ConnectionCardProps) {
  const { activateConnection, deleteConnection } = useConnectionsStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleActivate = async () => {
    try {
      await activateConnection(connection.id);
    } catch (error) {
      console.error("Failed to activate connection:", error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteConnection(connection.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete connection:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Format provider name
  const providerName = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    grok: "Grok",
  }[connection.provider];

  return (
    <>
      <Card
        className={`relative ${
          connection.is_active
            ? "border-blue-500 bg-blue-950/10"
            : "border-gray-800"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{connection.name}</CardTitle>
                {connection.is_active && (
                  <Badge
                    variant="outline"
                    className="border-blue-500 text-blue-400"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {providerName}
              </CardDescription>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!connection.is_active && (
                  <>
                    <DropdownMenuItem
                      onClick={handleActivate}
                      className="cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Set as Active
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onEdit(connection)}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="text-xs text-gray-500">
            Created {new Date(connection.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{connection.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
