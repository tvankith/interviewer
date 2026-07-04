"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchQuestionBank, searchQuestionBank, QuestionBankListParams } from "@/apis/question_bank";
import QuestionBankItemCard from "./question-bank-item";
import List from "@/components/basic/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

export default function QuestionBankPage() {
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [experienceLevel, setExperienceLevel] = useState("");
    const [mineOnly, setMineOnly] = useState(false);

    const isSearching = search.trim().length > 0;

    const listParams: QuestionBankListParams = {
        role: role || undefined,
        difficulty: difficulty || undefined,
        experience_level: experienceLevel || undefined,
        mine_only: mineOnly || undefined,
    };

    const listQuery = useQuery({
        queryKey: ["question-bank", listParams],
        queryFn: () => fetchQuestionBank(listParams),
        enabled: !isSearching,
    });

    const searchQuery = useQuery({
        queryKey: ["question-bank-search", search, role, experienceLevel],
        queryFn: () =>
            searchQuestionBank({
                q: search.trim(),
                k: 20,
                role: role || undefined,
                experience_level: experienceLevel || undefined,
            }),
        enabled: isSearching,
    });

    const { data, isLoading, error } = isSearching ? searchQuery : listQuery;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Question Bank</h1>
                <Button onClick={() => router.push("/question-bank/add")}>
                    Add Question
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <Input
                    className="w-64"
                    placeholder="Semantic search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Input
                    className="w-44"
                    placeholder="Filter by role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                />

                <Select
                    value={difficulty}
                    onValueChange={(val) => setDifficulty(val === "all" ? "" : val)}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All difficulties</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={experienceLevel}
                    onValueChange={(val) => setExperienceLevel(val === "all" ? "" : val)}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                    </SelectContent>
                </Select>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={mineOnly}
                        onChange={(e) => setMineOnly(e.target.checked)}
                        className="w-4 h-4"
                    />
                    Mine only
                </label>
            </div>

            {isLoading && <div>Loading questions...</div>}
            {error && <div className="text-red-500">Failed to load questions</div>}

            {!isLoading && !error && (
                <List
                    data={data || []}
                    renderItem={(item) => (
                        <QuestionBankItemCard key={item.id} item={item} />
                    )}
                    emptyState={<div>No questions found</div>}
                />
            )}
        </div>
    );
}
