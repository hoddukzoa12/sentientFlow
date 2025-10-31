"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConnectionsStore } from "@/lib/store/connections-store";
import type { Connection } from "@/lib/api/client";

interface ConnectionFormData {
  provider: "openai" | "anthropic" | "gemini" | "grok";
  name: string;
  api_key: string;
}

interface ConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: Connection; // For editing
}

export function ConnectionModal({
  open,
  onOpenChange,
  connection,
}: ConnectionModalProps) {
  const { createConnection, updateConnection } = useConnectionsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ConnectionFormData>({
    defaultValues: {
      provider: connection?.provider || "openai",
      name: connection?.name || "",
      api_key: "", // Never pre-fill API key for security
    },
  });

  const onSubmit = async (data: ConnectionFormData) => {
    setIsSubmitting(true);

    try {
      if (connection) {
        // Update existing connection
        await updateConnection(connection.id, {
          name: data.name,
          api_key: data.api_key || undefined,
        });
      } else {
        // Create new connection
        await createConnection({
          provider: data.provider,
          name: data.name,
          api_key: data.api_key,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save connection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {connection ? "Edit Connection" : "New Connection"}
          </DialogTitle>
          <DialogDescription>
            {connection
              ? "Update your connection details"
              : "Add a new LLM provider connection"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Provider Select */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!!connection} // Can't change provider when editing
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic" disabled>
                        Anthropic (Not supported yet)
                      </SelectItem>
                      <SelectItem value="gemini" disabled>
                        Gemini (Not supported yet)
                      </SelectItem>
                      <SelectItem value="grok" disabled>
                        Grok (Not supported yet)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose your LLM provider (currently OpenAI only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Connection Name */}
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: "Connection name is required",
                minLength: {
                  value: 1,
                  message: "Name must be at least 1 character",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., My OpenAI Key"
                      {...field}
                      className="bg-black border-gray-800"
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Key */}
            <FormField
              control={form.control}
              name="api_key"
              rules={
                connection
                  ? {} // Optional when editing
                  : {
                      required: "API key is required",
                      minLength: {
                        value: 10,
                        message: "API key must be at least 10 characters",
                      },
                    }
              }
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        connection ? "Leave blank to keep current key" : "sk-..."
                      }
                      {...field}
                      className="bg-black border-gray-800 font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    {connection
                      ? "Only provide a new key if you want to update it"
                      : "Your API key will be encrypted and stored securely"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : connection
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
