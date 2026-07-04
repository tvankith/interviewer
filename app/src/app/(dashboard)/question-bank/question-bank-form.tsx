"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Field,
    FieldLabel,
    FieldContent,
} from "@/components/ui/field";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

import DynamicList from "@/components/basic/dynamic-list";
import { FormSubmitButton } from "@/components/basic/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormValues = {
    question_text: string;
    topic: string;
    role: string;
    ideal_answer: string;
};

type Props = {
    onSubmit: (payload: any) => void;
    isLoading?: boolean;
};

export default function QuestionBankForm({ onSubmit, isLoading }: Props) {
    const { register, handleSubmit } = useForm<FormValues>();

    const [difficulty, setDifficulty] = useState("medium");
    const [experienceLevel, setExperienceLevel] = useState("");
    const [skillTags, setSkillTags] = useState<string[]>([]);
    const [expectedSignals, setExpectedSignals] = useState<string[]>([]);

    const submitHandler: SubmitHandler<FormValues> = (data) => {
        onSubmit({
            question_text: data.question_text,
            topic: data.topic || undefined,
            role: data.role || undefined,
            ideal_answer: data.ideal_answer || undefined,
            difficulty: difficulty || undefined,
            experience_level: experienceLevel || undefined,
            skill_tags: skillTags.filter(Boolean),
            expected_signals: expectedSignals.filter(Boolean),
            source: "manual",
        });
    };

    return (
        <div className="mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add Question</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <Field>
                        <FieldLabel htmlFor="question_text">Question</FieldLabel>
                        <FieldContent>
                            <Textarea
                                id="question_text"
                                rows={3}
                                placeholder="Enter the interview question..."
                                {...register("question_text", { required: true })}
                            />
                        </FieldContent>
                    </Field>

                    {/* Topic */}
                    <Field>
                        <FieldLabel htmlFor="topic">Topic</FieldLabel>
                        <FieldContent>
                            <Input
                                id="topic"
                                placeholder="e.g. System Design, Algorithms"
                                {...register("topic")}
                            />
                        </FieldContent>
                    </Field>

                    {/* Role */}
                    <Field>
                        <FieldLabel htmlFor="role">Role</FieldLabel>
                        <FieldContent>
                            <Input
                                id="role"
                                placeholder="e.g. backend engineer"
                                {...register("role")}
                            />
                        </FieldContent>
                    </Field>

                    {/* Difficulty */}
                    <Field>
                        <FieldLabel>Difficulty</FieldLabel>
                        <FieldContent>
                            <Select defaultValue="medium" onValueChange={setDifficulty}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </FieldContent>
                    </Field>

                    {/* Experience Level */}
                    <Field>
                        <FieldLabel>Experience Level</FieldLabel>
                        <FieldContent>
                            <Select onValueChange={setExperienceLevel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="junior">Junior</SelectItem>
                                    <SelectItem value="mid">Mid</SelectItem>
                                    <SelectItem value="senior">Senior</SelectItem>
                                </SelectContent>
                            </Select>
                        </FieldContent>
                    </Field>

                    {/* Skill Tags */}
                    <DynamicList
                        label="Skill Tags"
                        values={skillTags}
                        setValues={setSkillTags}
                    />

                    {/* Ideal Answer */}
                    <Field>
                        <FieldLabel htmlFor="ideal_answer">Ideal Answer</FieldLabel>
                        <FieldContent>
                            <Textarea
                                id="ideal_answer"
                                rows={4}
                                placeholder="Describe the ideal answer..."
                                {...register("ideal_answer")}
                            />
                        </FieldContent>
                    </Field>

                    {/* Expected Signals */}
                    <DynamicList
                        label="Expected Signals"
                        values={expectedSignals}
                        setValues={setExpectedSignals}
                    />
                    <FormSubmitButton
                        isLoading={isLoading}
                        onClick={handleSubmit(submitHandler)}
                        text="Add Question"
                        loadingText="Adding..."
                    />
                </CardContent>
            </Card>
        </div>
    );
}

