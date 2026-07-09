"use client";

import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseResumeApi, updateProfile } from "@/apis/profile";
import {
    sendAgentMessage,
    type AgentResponse,
    type Proposal,
} from "@/apis/chat";
import { getConversationThreads, getThreadMessages } from "@/apis/conversation-thread";
import { Chat, type ChatMessage, type ChatProposal } from "@/components/basic/chat";
import { CandidateFormValues, CandidatePayload } from "../profile/compose/types";
import { ProfileEditorContext } from "./profile-editor-context";
import Header from "./header";
import SpecEditor from "./spec-editor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FormEditPanel from "./form-edit-panel";
import type { SectionId } from "./profile-sections";
import { plainTextToLexicalJson } from "@/resume-engine/lexical-json/plain-text-to-lexical-json";
import { useProposalReview } from "@/resume-engine/diff/use-proposal-review";
import { reconcileProposal } from "@/resume-engine/diff/reconcile-proposal";
import type { TemplateDocument } from "@/resume-engine/types/template";
import type { ThemeDocument } from "@/resume-engine/types/theme";
import type { ResumeData } from "@/resume-engine/types/resume-data";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type Props = {
    templateDoc: TemplateDocument;
    themeDoc: ThemeDocument;
    onSubmit?: (payload: CandidatePayload) => void;
    isDataLoading?: boolean;
    isDataSaving?: boolean;
    onPreviewClick?: () => void;
    profileId?: string;
};


// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function ProfileEditor({
    templateDoc,
    themeDoc,
    isDataLoading,
    onPreviewClick,
    profileId
}: Props) {
    const [activeSection, setActiveSection] = useState<SectionId>("basic");
    const [mode, setMode] = useState<"form" | "spec">("form");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isChattingLoading, setIsChattingLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [activeReview, setActiveReview] = useState<{ messageId: string; proposalId: string; proposedFields: Record<string, unknown> } | null>(null);
    const review = useProposalReview();
    const sessionIdRef = useRef<string | null>(null);
    const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queryClient = useQueryClient();

    const showStatus = (type: "success" | "error", message: string) => {
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        setImportStatus({ type, message });
        statusTimerRef.current = setTimeout(() => setImportStatus(null), 4000);
    };

    const { register, setValue, watch } = useFormContext<CandidateFormValues>();

    // experiences/projects items need tech_stack present or ExperienceBuilder/
    // ProjectBuilder crash on undefined — same defaulting fillForm below uses
    // for resume-parsed data, applied here for AI-proposed field values too.
    const normalizeFieldValue = (field: string, value: unknown): unknown => {
        if (field === "projects" || field === "experiences") {
            return ((value as any[]) || []).map((item) => ({ ...item, tech_stack: item.tech_stack || [] }));
        }
        return value;
    };

    // Resume parsing — the parser returns plain-text fields (LLM-extracted,
    // same convention as the interview agent's proposals), so descriptions
    // are converted to Lexical JSON the same way buildProposalDiff does.
    const fillForm = (data: any) => {
        if (data.title) setValue("title", data.title);
        if (data.name) setValue("name", data.name);
        if (data.email) setValue("email", data.email);
        if (data.phone) setValue("phone", data.phone);
        if (data.location) setValue("location", data.location);
        if (data.summary) setValue("summary", plainTextToLexicalJson(data.summary));
        if (data.website) setValue("website", data.website);
        setValue("skills", data.skills || []);
        setValue(
            "projects",
            (data.projects || []).map((p: any) => ({
                ...p,
                tech_stack: p.tech_stack || [],
                description: plainTextToLexicalJson(p.description),
            }))
        );
        setValue(
            "experiences",
            (data.experiences || []).map((e: any) => ({
                ...e,
                tech_stack: e.tech_stack || [],
                description: plainTextToLexicalJson(e.description),
            }))
        );
        setValue(
            "educations",
            (data.educations || []).map((edu: any) => ({
                ...edu,
                description: plainTextToLexicalJson(edu.description),
            }))
        );
        setValue("links", data.links || []);
    };

    // Fetch all conversation threads for the profile
    const { data: threads = [] } = useQuery({
      queryKey: ["conversation-threads", profileId],
      queryFn: () => getConversationThreads(profileId!),
      enabled: !!profileId,
    });

    // Auto-select the most recent thread when threads are first loaded
    useEffect(() => {
      if (threads.length > 0 && activeSessionId === null) {
        const mostRecentThread = threads[0]; // Already sorted by created_at DESC from server
        setActiveSessionId(mostRecentThread.thread_id);
        sessionIdRef.current = mostRecentThread.thread_id;
      }
    }, [threads]); // Only depend on threads, not activeSessionId

    // Fetch message history for the active thread
    const { data: threadMessagesData, isLoading: isChatHistoryLoading } = useQuery({
      queryKey: ["thread-messages", profileId, activeSessionId],
      queryFn: () => getThreadMessages(profileId!, activeSessionId!),
      enabled: !!profileId && !!activeSessionId,
    });

    // Initialize chat messages with fetched history — each turn (one candidate
    // message plus everything up to the next one) becomes a user bubble and,
    // if the agent said anything or proposed a change, an assistant bubble.
    useEffect(() => {
      if (threadMessagesData?.messages) {
        const mappedMessages: ChatMessage[] = threadMessagesData.messages.flatMap(
          (turn, index) => {
            const turnMessages: ChatMessage[] = [];
            if (turn.user_message) {
              turnMessages.push({
                id: `turn-${index}-user`,
                role: "user",
                content: turn.user_message,
              });
            }
            if (turn.assistant_message || turn.proposals.length > 0) {
              turnMessages.push({
                id: `turn-${index}-assistant`,
                role: "assistant",
                content: turn.assistant_message,
                proposals: turn.proposals.map(buildProposalDiff),
              });
            }
            return turnMessages;
          }
        );
        setChatMessages(mappedMessages);
      } else {
        setChatMessages([]);
      }
    }, [threadMessagesData]);


    const handleNewChat = () => {
        setActiveSessionId(null);
        sessionIdRef.current = null;
        setChatMessages([]);
    };

    // Diffs each proposed field against the form's current live value —
    // never against a snapshot ai-server might have read earlier, so the
    // diff can't go stale relative to what's actually on screen.
    const buildProposalDiff = (proposal: Proposal): ChatProposal => {
        const currentValues = watch();
        return {
            id: proposal.id,
            status: "pending",
            fields: Object.entries(proposal.proposed_fields).map(([field, after]) => ({
                field,
                before: (currentValues as Record<string, unknown>)[field],
                after,
            })),
        };
    };

    const applyAgentResponse = (response: AgentResponse) => {
        if (response.session_id) {
            sessionIdRef.current = response.session_id;
            setActiveSessionId(response.session_id);
            // Invalidate threads query to refresh the dropdown
            queryClient.invalidateQueries({ queryKey: ["conversation-threads", profileId] });
        }

        const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}-response`,
            role: "assistant",
            content: response.result,
            proposals: response.proposals.map(buildProposalDiff),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
    };

    const setProposalStatus = (
        messageId: string,
        proposalId: string,
        status: ChatProposal["status"]
    ) => {
        setChatMessages((prev) =>
            prev.map((m) =>
                m.id !== messageId
                    ? m
                    : {
                        ...m,
                        proposals: m.proposals?.map((p) =>
                            p.id === proposalId ? { ...p, status } : p
                        ),
                    }
            )
        );
    };

    const handleSendMessage = async (message: string, mode?: string) => {
        if (!profileId) {
            console.error("Profile ID not available");
            return;
        }

        // Add user message to chat
        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: message,
        };
        setChatMessages((prev) => [...prev, userMessage]);
        setIsChattingLoading(true);

        try {
            const response = await sendAgentMessage({
                candidate_id: profileId,
                message: message,
                session_id: sessionIdRef.current || undefined,
            });
            applyAgentResponse(response);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}-error`,
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
            };
            setChatMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsChattingLoading(false);
        }
    }

    // Opens (or refocuses) the canvas diff review for one proposal — actual
    // accept/reject now happens per-field/per-entry on the canvas itself
    // (see resume-engine/registry/diff-overlay.tsx), not here.
    const handleReviewProposal = (messageId: string, proposalId: string) => {
        const proposal = chatMessages
            .find((m) => m.id === messageId)
            ?.proposals?.find((p) => p.id === proposalId);
        if (!proposal) return;

        const proposedFields = Object.fromEntries(
            proposal.fields.map((f) => [f.field, f.after])
        );

        if (activeReview?.proposalId !== proposalId) {
            review.reset();
        }
        setActiveReview({ messageId, proposalId, proposedFields });
        setProposalStatus(messageId, proposalId, "reviewing");
    };

    // The single reconciliation + write, fired once when the candidate is
    // done setting accept/reject decisions across the whole proposal — see
    // resume-engine/diff/reconcile-proposal.ts and design.md Decision 5.
    const handleFinishReview = async () => {
        if (!profileId || !activeReview) return;
        const { messageId, proposalId, proposedFields } = activeReview;
        const currentValues = watch() as Record<string, unknown>;
        const { patch, outcome } = reconcileProposal(proposedFields, currentValues, review.decisions);

        setProposalStatus(messageId, proposalId, "submitting");

        try {
            if (Object.keys(patch).length > 0) {
                // Same write path (and same candidate-owned auth) manual edits
                // already use — ai-server never performs this write itself.
                await updateProfile(profileId, patch);
                Object.entries(patch).forEach(([field, value]) => {
                    setValue(field as keyof CandidateFormValues, normalizeFieldValue(field, value) as never);
                });
            }
            // The write (or the decision that nothing needed writing) is the
            // source of truth for "done" — flip the UI here, independent of
            // whether informing the agent below succeeds.
            setProposalStatus(messageId, proposalId, "done");
            setActiveReview(null);
            review.reset();

            const response = await sendAgentMessage({
                candidate_id: profileId,
                session_id: sessionIdRef.current || undefined,
                proposal_outcome: { proposal_id: proposalId, decisions: outcome },
            });
            applyAgentResponse(response);
        } catch (error) {
            console.error("Failed to save reviewed proposal:", error);
            // The write didn't actually happen — go back to reviewing rather
            // than silently discarding the candidate's decisions.
            setProposalStatus(messageId, proposalId, "reviewing");
            showStatus("error", "Failed to save your reviewed changes. Please try again.");
        }
    };


    // Submit

    const projects = watch("projects");
    const experiences = watch("experiences");
    const educations = watch("educations");
    const links = watch("links");
    const summary = watch("summary");
    const skills = watch("skills");
    const templateId = watch("template_id");
    const themeId = watch("theme_id");
    const values = watch();


    // Click stepper item to show section
    const showSection = (id: string) => {
        setActiveSection(id as SectionId);
    };

    const parseResumeMutation = useMutation({
        mutationFn: parseResumeApi,
        onSuccess: async (data: any) => {
            fillForm(data);
            if (profileId) {
                try {
                    await updateProfile(profileId, data);
                    showStatus("success", "Resume imported successfully");
                } catch {
                    showStatus("error", "Resume parsed but failed to save — changes will auto-save shortly");
                }
            }
        },
        onError: () => {
            showStatus("error", "Failed to import resume");
        },
    });

    return (
        <ProfileEditorContext.Provider
            value={{
                register,
                setValue,
                projects,
                experiences,
                educations,
                links,
                summary,
                skills,
                templateId,
                themeId,
                isParsing: parseResumeMutation.isPending,
                isLoading: isDataLoading || false,
            }}
        >
            <div className={`grid gap-1 h-screen ${["form"].includes(mode) ? "grid-cols-3 grid-rows-[60px_1fr]" : "grid-cols-1 grid-rows-[60px_1fr]"}`}>

                <div className="col-span-3">
                    <Header
                        parseResume={parseResumeMutation}
                        mode={mode}
                        setMode={setMode}
                        importStatus={importStatus}
                        templateDoc={templateDoc}
                        themeDoc={themeDoc}
                        values={values as ResumeData}
                    />
                </div>
                {mode === "form" && (
                    <div className="col-span-2 min-h-0 p-2 max-h-full flex">
                        <FormEditPanel
                            activeSection={activeSection}
                            onSelectSection={showSection}
                            values={values}
                            templateDoc={templateDoc}
                            themeDoc={themeDoc}
                            onPreviewClick={onPreviewClick}
                            setValue={setValue}
                            activeReview={activeReview ? { proposedFields: activeReview.proposedFields, diffHost: review.diffHost } : null}
                            onFinishReview={handleFinishReview}
                            />
                    </div>
                )}
                {mode === "form" && (<div className="col-span-1 min-h-0 p-2">
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b">
                            {threads.length > 0 ? (
                                <select
                                    value={activeSessionId ?? ""}
                                    onChange={(e) => setActiveSessionId(e.target.value)}
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                >
                                    {threads.map((thread) => (
                                        <option key={thread.thread_id} value={thread.thread_id}>
                                            {new Date(thread.created_at).toLocaleDateString()} {new Date(thread.created_at).toLocaleTimeString()}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-sm text-muted-foreground flex-1">No sessions yet</span>
                            )}
                            <Button size="sm" variant="outline" onClick={handleNewChat}>
                                + New Chat
                            </Button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <Chat
                                messages={chatMessages}
                                isStreaming={isChattingLoading || isChatHistoryLoading}
                                onSend={handleSendMessage}
                                onReviewProposal={handleReviewProposal}
                                placeholder="Ask about your profile..."
                                className="h-full p-2"
                            />
                        </div>
                    </Card>
                </div>)}
                {mode === "spec" && (
                    <div className="col-span-1 min-h-0 p-2">
                        <SpecEditor profileId={profileId} />
                    </div>
                )}
            </div>
        </ProfileEditorContext.Provider>
    );
}
