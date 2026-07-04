import type { CandidateProfile } from '../types';

/**
 * Transform CandidateProfile from database format to API response format.
 * Ensures JSON fields are properly typed arrays matching frontend expectations.
 */
export function transformProfile(profile: CandidateProfile) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    title: profile.title,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    website: profile.website,
    // Ensure arrays default to empty arrays if null
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
    educations: Array.isArray(profile.educations) ? profile.educations : [],
    links: Array.isArray(profile.links) ? profile.links : [],
    created_at: profile.created_at.toISOString(),
    deleted_at: profile.deleted_at ? profile.deleted_at.toISOString() : null,
  };
}

export function transformProfiles(profiles: CandidateProfile[]) {
  return profiles.map(transformProfile);
}
