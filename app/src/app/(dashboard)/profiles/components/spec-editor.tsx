"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpecApi,
  listSpecsApi,
  getSpecApi,
  updateSpecApi,
  deleteSpecApi,
  type ProfileSpec,
} from "@/apis/profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pen, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  profileId?: string;
};

export default function SpecEditor({ profileId }: Props) {
  const [selectedSpec, setSelectedSpec] = useState<ProfileSpec | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSpecName, setNewSpecName] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  // Fetch all specs
  const { data: specs = [], isLoading: isLoadingSpecs } = useQuery({
    queryKey: ["specs", profileId],
    queryFn: () => listSpecsApi(profileId!),
    enabled: !!profileId,
  });

  // Auto-select first spec when loading
  useEffect(() => {
    if (specs.length > 0 && !selectedSpec) {
      setSelectedSpec(specs[0]);
      setContent(specs[0].content);
    }
  }, [specs, selectedSpec]);

  // Create spec mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profileId || !newSpecName.trim()) return;
      return createSpecApi(profileId, {
        name: newSpecName,
        content: "# New Spec\n\nStart writing your spec here...",
      });
    },
    onSuccess: (newSpec) => {
      queryClient.invalidateQueries({ queryKey: ["specs", profileId] });
      if (newSpec) {
        setSelectedSpec(newSpec);
        setContent(newSpec.content);
      }
      setNewSpecName("");
      setIsCreatingNew(false);
    },
  });

  // Delete spec mutation
  const deleteMutation = useMutation({
    mutationFn: async (specId: string) => {
      if (!profileId) return;
      return deleteSpecApi(profileId, specId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specs", profileId] });
      setSelectedSpec(null);
      setContent("");
    },
  });

  // Rename spec mutation
  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!profileId || !selectedSpec) return;
      return updateSpecApi(profileId, selectedSpec.id, { name: newName });
    },
    onSuccess: (updatedSpec) => {
      queryClient.invalidateQueries({ queryKey: ["specs", profileId] });
      if (updatedSpec) setSelectedSpec(updatedSpec);
      setEditingName(null);
    },
  });

  // Save content mutation (debounced)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profileId || !selectedSpec) return;
      return updateSpecApi(profileId, selectedSpec.id, { content });
    },
    onSuccess: (updatedSpec) => {
      if (updatedSpec) setSelectedSpec(updatedSpec);
      queryClient.invalidateQueries({ queryKey: ["specs", profileId] });
    },
  });

  // Auto-save content
  useEffect(() => {
    if (selectedSpec && content !== selectedSpec.content) {
      const timer = setTimeout(() => {
        saveMutation.mutate();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, selectedSpec]);

  const handleSelectSpec = (spec: ProfileSpec) => {
    setSelectedSpec(spec);
    setContent(spec.content);
    setEditingName(null);
  };

  const handleDeleteSpec = (specId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this spec? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate(specId);
    }
  };

  const handleRenameSpec = (newName: string) => {
    if (newName.trim() && newName !== selectedSpec?.name) {
      renameMutation.mutate(newName);
    } else {
      setEditingName(null);
    }
  };

  if (!profileId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Profile not found
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-[300px_1fr] gap-2 p-2">
      {/* Left Panel - Spec List */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Specs</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreatingNew(true)}
            disabled={isCreatingNew}
            className="h-8 w-8 p-0"
          >
            <Plus size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Create New Spec Form */}
          {isCreatingNew && (
            <div className="border-b p-3 space-y-2 bg-muted/50">
              <input
                type="text"
                placeholder="Spec name..."
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => createMutation.mutate()}
                  disabled={!newSpecName.trim() || createMutation.isPending}
                  className="flex-1 h-8"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setNewSpecName("");
                  }}
                  className="flex-1 h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Spec List */}
          {isLoadingSpecs ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Loading specs...
            </div>
          ) : specs.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No specs yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {specs.map((spec) => (
                <div
                  key={spec.id}
                  className={cn(
                    "group relative p-2 rounded-md cursor-pointer transition-colors",
                    selectedSpec?.id === spec.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  )}
                >
                  {editingName === spec.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={spec.name}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameSpec(e.currentTarget.value);
                          } else if (e.key === "Escape") {
                            setEditingName(null);
                          }
                        }}
                        onBlur={(e) => handleRenameSpec(e.currentTarget.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSelectSpec(spec)}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {spec.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(spec.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingName(spec.id);
                          }}
                          className="p-1 hover:bg-accent rounded transition-colors"
                          title="Rename"
                        >
                          <Pen size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpec(spec.id);
                          }}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Right Panel - Markdown Editor */}
      <Card className="flex flex-col overflow-hidden">
        {selectedSpec ? (
          <>
            <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold text-sm">{selectedSpec.name}</h3>
              <span className="text-xs text-muted-foreground">
                {selectedSpec.updated_at
                  ? `Updated ${new Date(
                      selectedSpec.updated_at
                    ).toLocaleDateString()}`
                  : "Never updated"}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your spec in Markdown..."
              className="flex-1 p-4 resize-none border-none outline-none font-mono text-sm bg-background"
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a spec to edit or create a new one
          </div>
        )}
      </Card>
    </div>
  );
}
