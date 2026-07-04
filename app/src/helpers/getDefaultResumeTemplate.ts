const getDefaultResumeTemplate = async (): Promise<string> => {
  try {
    const response = await fetch(
      `${process.env.API_SERVER_URL}/api/resume-templates/default`,
    );
    if (!response.ok) return "";
    const data = await response.json();
    return data?.content?.html ?? "";
  } catch (err) {
    return "";
  }
};

export default getDefaultResumeTemplate;
