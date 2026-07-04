"use client";

import { ProfileReview } from "@/apis/profile";
import { AlertCircle, CheckCircle, TrendingUp, RotateCw } from "lucide-react";
import { useState } from "react";
import { AIActionPopup } from "./ai-action-popup";

interface ReviewPanelProps {
    review: ProfileReview | null;
    isLoading?: boolean;
    error?: string | null;
    onRefresh?: () => void;
    profileId?: string;
}

const ReviewPanel = ({ review, isLoading, error, onRefresh, profileId }: ReviewPanelProps) => {
    const [activeTab, setActiveTab] = useState<"overview" | "actions">("overview");
    const [selectedAction, setSelectedAction] = useState<number | null>(null);

    if (isLoading) {
        return (
            <div className="w-auto border-l overflow-y-auto bg-card shrink-0">
                <div className="p-5 flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                        <div className="inline-block w-6 h-6 border-2 border-current border-r-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Generating review...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-auto border-l overflow-y-auto bg-card shrink-0">
                <div className="p-5">
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!review) {
        return null
    }

    return (
        <div className="w-full border-l bg-card shrink-0 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {activeTab === "overview" ? (
                    <div className="p-5 space-y-6">
                        {/* Overall Score */}
                        <div className="rounded-lg bg-primary/10 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Overall Score</p>
                                    <p className="text-3xl font-bold text-primary">{review.overall_score}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">ATS Compatibility</p>
                                    <p className="text-sm font-medium">{review.ats_compatibility}</p>
                                </div>
                            </div>
                        </div>

                        {/* Skills Analysis */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Skills Analysis</h3>
                            {review.skills_analysis.matched.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-green-700 mb-1">Matched Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                        {review.skills_analysis.matched.slice(0, 5).map((skill, i) => (
                                            <span key={i} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {review.skills_analysis.missing.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-red-700 mb-1">Missing Skills</p>
                                    <div className="flex flex-wrap gap-1">
                                        {review.skills_analysis.missing.slice(0, 5).map((skill, i) => (
                                            <span key={i} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section Scores */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Section Scores</h3>
                            <div className="space-y-2">
                                {review.section_reviews.map((section, i) => (
                                    <div key={i} className="rounded bg-muted p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-medium">{section.section}</p>
                                            <p className="text-xs font-bold text-primary">{section.score}/100</p>
                                        </div>
                                        <div className="w-full bg-muted-foreground/20 rounded-full h-1.5">
                                            <div
                                                className="bg-primary rounded-full h-1.5"
                                                style={{ width: `${section.score}%` }}
                                            />
                                        </div>
                                        {section.suggestions.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                💡 {section.suggestions[0]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strengths */}
                        {review.strengths.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <h3 className="font-semibold text-sm">Strengths</h3>
                                </div>
                                <ul className="space-y-1">
                                    {review.strengths.map((strength, i) => (
                                        <li key={i} className="text-xs text-muted-foreground">
                                            • {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Quick Wins */}
                        {review.quick_wins.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    <h3 className="font-semibold text-sm">Quick Wins</h3>
                                </div>
                                <ul className="space-y-1">
                                    {review.quick_wins.map((win, i) => (
                                        <li key={i} className="text-xs text-muted-foreground">
                                            • {win}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Red Flags */}
                        {review.red_flags.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                    <h3 className="font-semibold text-sm">Red Flags</h3>
                                </div>
                                <ul className="space-y-1">
                                    {review.red_flags.map((flag, i) => (
                                        <li key={i} className="text-xs text-muted-foreground">
                                            • {flag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="rounded-md bg-muted p-3 border border-border">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {review.summary}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-3">
                        {/* Actions Tab Content */}
                        {review.actions && review.actions.length > 0 && (
                            <div className="space-y-2">
                                {review.actions.map((action, i) => (
                                    <div key={i} className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-purple-900">{action.title}</p>
                                                <p className="text-xs text-purple-700 mt-1">{action.description}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <span className={`inline-block text-xs px-2 py-0.5 rounded ${
                                                    action.priority === "high" ? "bg-red-200 text-red-800" :
                                                    action.priority === "medium" ? "bg-yellow-200 text-yellow-800" :
                                                    "bg-gray-200 text-gray-800"
                                                }`}>
                                                    {action.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedAction(i)}
                                            disabled={!profileId}
                                            className="w-full text-xs py-1.5 px-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded transition-colors flex items-center justify-center gap-1"
                                        >
                                            Let's do it
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedAction !== null && review.actions && (
                <AIActionPopup
                    isOpen={selectedAction !== null}
                    onClose={() => setSelectedAction(null)}
                    action={review.actions[selectedAction]}
                    profileId={profileId || ""}
                />
            )}
        </div>
    );
};

export default ReviewPanel;