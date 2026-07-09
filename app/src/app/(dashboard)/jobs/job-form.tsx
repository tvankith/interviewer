"use client";

import React, { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";

import SkillsBuilder from "@/components/basic/skill-builder";
import DynamicList from "@/components/basic/dynamic-list";

import { FormSubmitButton } from "@/components/basic/form-submit-button";
import JobDescriptionField from "@/components/basic/job-description-field";
import { API_URL } from "@/config";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SkillGroup = {
  category?: string;
  skills: string[];
};

type FormValues = {
  jobDescription: string;
  role: string;
  company: string;
  experience_level: string;
  difficulty_level: string;
};

type Props = {
  mode: "create" | "edit";
  initialData?: any;
  onSubmit: (payload: any) => void;
  isLoading?: boolean;
};

export const parseJD = async (data: { jd_text: string }) => {
  const res = await fetch(`${API_URL}/api/job/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create interview");
  return res.json();
};


export default function JobForm({
  mode,
  initialData,
  onSubmit,
  isLoading,
}: Props) {
  const { register, handleSubmit, reset, setValue, watch } =
    useForm<FormValues>({
      defaultValues: {
        difficulty_level: "medium",
      },
    });

  const [skills, setSkills] = useState<SkillGroup[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  /** ---------------- Hydrate ---------------- */
  useEffect(() => {
    if (!initialData) return;

    reset(initialData);

    setSkills(
      initialData.primary_skills_by_category
        ? Object.entries(
          initialData.primary_skills_by_category
        ).map(([category, skills]: any) => ({
          category,
          skills,
        }))
        : []
    );

    setResponsibilities(initialData.responsibilities || []);
    setRequirements(initialData.requirements || []);
    setFocusAreas(
      initialData.evaluation_focus_areas || []
    );
  }, [initialData, reset]);

  /** ---------------- Submit ---------------- */
  const submitHandler: SubmitHandler<FormValues> = (data) => {
    const skillsDict = skills.reduce((acc: any, curr) => {
      if (curr.category) {
        acc[curr.category] = curr.skills.filter(Boolean);
      }
      return acc;
    }, {});

    const payload = {
      ...data,
      raw_description: data.jobDescription || "",
      primary_skills_by_category: skillsDict,
      responsibilities,
      requirements,
      evaluation_focus_areas: focusAreas,
    };

    onSubmit(payload);
  };

  const jd = watch("jobDescription");

  const handleDraft = () => {
    parseMutation.mutate({
      jd_text: jd,
    });
  };

  const parseMutation = useMutation({
    mutationFn: parseJD,
    onSuccess: (data) => {
      // autofill form
      setValue("role", data.role || "");
      setValue("company", data.company || "");
      setValue("experience_level", data.experience_level || "");
      setValue("difficulty_level", data.difficulty_level || "medium");

      // skills (convert dict → array)
      if (data.primary_skills_by_category) {
        const formatted = Object.entries(
          data.primary_skills_by_category
        ).map(([category, skills]: any) => ({
          category,
          skills,
        }));
        setSkills(formatted);
      }

      setResponsibilities(data.responsibilities || []);
      setRequirements(data.requirements || []);
      setFocusAreas(data.evaluation_focus_areas || []);
    },
  });

  /** ---------------- UI ---------------- */
  return (
    <div className={`mx-auto p-6`}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Job" : "Edit Job"}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Job Description */}
          <JobDescriptionField
            register={register}
            onDraft={handleDraft}
          />

          {/* OR Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">
              OR
            </span>
            <Separator className="flex-1" />
          </div>

          {/* Role */}
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <FieldContent>
              <Input
                id="role"
                {...register("role")}
                disabled={!!jd}
              />
            </FieldContent>
          </Field>

          {/* Company */}
          <Field>
            <FieldLabel htmlFor="company">Company</FieldLabel>
            <FieldContent>
              <Input
                id="company"
                {...register("company")}
                disabled={!!jd}
              />
            </FieldContent>
          </Field>

          {/* Experience */}
          <Field>
            <FieldLabel htmlFor="experience_level">
              Experience Level
            </FieldLabel>
            <FieldContent>
              <Input
                id="experience_level"
                {...register("experience_level")}
                disabled={!!jd}
              />
            </FieldContent>
          </Field>

          {/* Difficulty */}
          <Field>
            <FieldLabel>Difficulty</FieldLabel>
            <FieldContent>
              <Select
                defaultValue={
                  initialData?.difficulty_level || "medium"
                }
                onValueChange={(val) =>
                  setValue("difficulty_level", val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">
                    Medium
                  </SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          {/* Skills */}
          <Field>
            <FieldLabel>Skills</FieldLabel>
            <FieldContent>
              <SkillsBuilder
                value={skills}
                onChange={(skills) => {
                  setSkills(skills)
                }}
              />
            </FieldContent>
          </Field>

          {/* Dynamic Lists */}
          <DynamicList
            label="Responsibilities"
            values={responsibilities}
            setValues={setResponsibilities}
          />
          <DynamicList
            label="Requirements"
            values={requirements}
            setValues={setRequirements}
          />
          <DynamicList
            label="Focus Areas"
            values={focusAreas}
            setValues={setFocusAreas}
          />
          <FormSubmitButton
            isLoading={isLoading}
            onClick={handleSubmit(submitHandler)}
            text={
              mode === "create"
                ? "Create Job"
                : "Update Job"
            }
            loadingText={
              mode === "create"
                ? "Creating..."
                : "Updating..."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

