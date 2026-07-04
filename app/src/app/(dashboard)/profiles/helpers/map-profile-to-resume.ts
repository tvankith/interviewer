export type ResumeExperience = {
    role?: string;
    company?: string;
    location?: string;
    start?: string; // "Jan 2022"
    end: string;   // "Present" | "Dec 2023"
    description?: string;
    tech_stack?: string[]
};

export type ResumeEducation = {
    institute: string;
    course: string;
    start?: string;
    end?: string;
    description?: string
};

export type ResumeProject = {
    name?: string;
    description?: string;
    technologies?: string[];
    link?: string;
};


export type Resume = {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    website?: string;
    skills?: string[];
    skills_text?: string;
    experience?: ResumeExperience[];
    education?: ResumeEducation[];
    projects?: ResumeProject[];
    links?: {
        label: string;
        url: string;
    }[];
};

type ProfileProject = {
    name?: string;
    tech_stack: string[];
    description?: string;
};

type ProfileExperience = {
    role?: string;
    company?: string;
    end_date?: string;
    start_date?: string;
    tech_stack: string[];
    description?: string;
};

type ProfileEducation = {
    institute?: string;
    course?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
};

type ProfileLink = {
    url: string;
    social_media: string;
};

export type Profile = {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    website?: string;
    projects?: ProfileProject[];
    experiences?: ProfileExperience[];
    educations?: ProfileEducation[];
    links?: ProfileLink[];
    skills_text?: string;
    skills?: string[];
};


export function mapProfileToResume(profile: Profile): Resume {
    // Detect empty HTML like:
    // <p></p>, <p><br></p>, <p><b></b></p>, <div><strong></strong></div>
    const isEmptyRichText = (value?: string): boolean => {
      if (!value) return true;
  
      // Remove tags
      const text = value
        .replace(/<br\s*\/?>/gi, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<[^>]*>/g, "")
        .trim();
  
      return text.length === 0;
    };
  
    const cleanRichText = (value?: string): string => {
      return isEmptyRichText(value) ? "" : value!;
    };
  
    return {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      website: profile.website,

      summary: cleanRichText(profile.summary),

      skills_text: cleanRichText(profile.skills_text),
      skills: profile.skills,

      links: (profile.links || []).map((l: ProfileLink) => ({
        label: l.social_media,
        url: l.url,
      })),

      education: (profile.educations || []).map(
        (edu: ProfileEducation): ResumeEducation => ({
          institute: edu.institute || "",
          course: edu.course || "",
          start: edu.start_date,
          end: edu.end_date,
          description: edu.description
        })
      ),

      experience: (profile.experiences || []).map(
        (exp: ProfileExperience): ResumeExperience => ({
          role: exp.role,
          company: exp.company,
          start: exp.start_date,
          end: exp.end_date || "Present",
          description: cleanRichText(exp.description),
          tech_stack: exp.tech_stack,
        })
      ),

      projects: (profile.projects || []).map(
        (proj: ProfileProject): ResumeProject => ({
          name: proj.name,
          description: cleanRichText(proj.description),
          technologies: proj.tech_stack || [],
        })
      ),
    };
  }