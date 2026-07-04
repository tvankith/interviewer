"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

type Props = {
    register: any;
    watch: any;
    saveMutation: UseMutationResult<any, Error, void, unknown>;
};

export default function TargetRole({ register, watch, saveMutation }: Props) {
    const targetRole = watch("target_role") || "";
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSave = () => {
        saveMutation.mutate(undefined, {
            onSuccess: () => {
                setSaveMessage({ type: "success", text: "Target role saved successfully!" });
                setTimeout(() => setSaveMessage(null), 3000);
            },
            onError: (error: any) => {
                setSaveMessage({ type: "error", text: error.message || "Failed to save target role" });
                setTimeout(() => setSaveMessage(null), 3000);
            },
        });
    };

    return (
        <div className="flex justify-center items-start p-4 min-h-full">
            <div className="w-full max-w-2xl bg-white rounded-md shadow-md p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground mb-2">Target Role</h2>
                    <p className="text-sm text-muted-foreground">Define the role you are aiming for</p>
                </div>
                <textarea
                    {...register("target_role")}
                    placeholder="Enter the target role you are aiming for. Be specific about the position, required skills, experience level, and industry preferences..."
                    className="w-full p-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-vertical min-h-80 font-sans text-sm text-foreground placeholder-muted-foreground"
                />
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        {targetRole ? `${targetRole.length} characters` : "No content yet"}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !targetRole.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saveMutation.isPending ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                Save Target Role
                            </>
                        )}
                    </button>
                </div>
                {saveMessage && (
                    <div
                        className={`mt-4 p-3 rounded-md text-sm ${
                            saveMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                        }`}
                    >
                        {saveMessage.text}
                    </div>
                )}
            </div>
        </div>
    );
}
