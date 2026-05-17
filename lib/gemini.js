/*
  AnalysisResult shape returned by AI:
  {
    overallScore: number,        // 1-10
    strengths: string[],
    weaknesses: string[],
    repos: [
      {
        name: string,
        score: number,           // 1-10
        feedback: string,
        missing: string[]        // e.g. ["README", "live demo", "tests"]
      }
    ],
    skillsVisible: string[],
    skillsGap: string[],
    roleReadiness: {
      fullstack: number,         // 0-100
      frontend: number,
      backend: number
    }
  }

  AnalysisDocument shape stored in MongoDB:
  {
    _id: string,
    userId: string,
    githubUsername: string,
    result: AnalysisResult,
    isPublic: boolean,
    shareId: string,
    createdAt: Date
  }
*/

// ---------- MOCK MODE ----------
// Set USE_MOCK_GEMINI=true in .env.local to skip real API calls during development.
const USE_MOCK = process.env.USE_MOCK_GEMINI === 'true';

function getMockAnalysis(repos) {
  return {
    overallScore: 6,
    strengths: [
      "Shows full-stack capability with React + Node.js",
      "Has a deployed project with real-world use case",
      "Uses version control consistently"
    ],
    weaknesses: [
      "Only 2 public repositories — too few to showcase range",
      "No test suites or CI/CD pipelines visible",
      "Missing detailed README with setup instructions in some repos"
    ],
    repos: repos.map((r, i) => ({
      name: r.name,
      score: 7 - i,
      feedback: `${r.name} shows decent effort but could benefit from better documentation, a live demo link, and unit tests to demonstrate code quality.`,
      missing: ["tests", "live demo", "CI/CD pipeline"]
    })),
    skillsVisible: ["JavaScript", "React", "Node.js", "MongoDB", "Express", "REST APIs"],
    skillsGap: ["TypeScript", "Testing (Jest/Vitest)", "Docker", "System Design", "GraphQL"],
    roleReadiness: {
      fullstack: 52,
      frontend: 60,
      backend: 45
    }
  };
}

function getMockReadme(repoName, description, language) {
  return `# ${repoName}\n\n${description || 'A project built with ' + language}\n\n## Features\n- Feature 1\n- Feature 2\n\n## Tech Stack\n- ${language}\n\n## Installation\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n## License\nMIT`;
}
// ---------- END MOCK MODE ----------

// Helper to call Groq API (OpenAI-compatible)
async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('Groq API error:', res.status, errBody);
    throw new Error(`Groq API call failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function analyzePortfolio(repos) {
  if (USE_MOCK) {
    console.log('[MOCK] Returning fake analysis');
    return getMockAnalysis(repos);
  }

  // Prepare a trimmed summary to avoid hitting token limits
  const repoSummary = repos.map(r => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    topics: r.topics,
    hasReadme: !!r.readme,
    readmePreview: r.readme?.slice(0, 600) ?? null,
  }));

  const prompt = `
You are a senior software engineer reviewing a fresher's GitHub portfolio for job readiness.
Analyze the following repos carefully and respond ONLY with valid JSON.
Do NOT include markdown code fences, preamble, or any text outside the JSON object.

Repos data:
${JSON.stringify(repoSummary, null, 2)}

Return exactly this JSON shape, no deviations:
{
  "overallScore": <integer 1-10>,
  "strengths": ["<specific strength>", "..."],
  "weaknesses": ["<specific weakness>", "..."],
  "repos": [
    {
      "name": "<repo name>",
      "score": <integer 1-10>,
      "feedback": "<2-3 sentence specific feedback>",
      "missing": ["<e.g. README>", "<e.g. live demo>", "<e.g. tests>"]
    }
  ],
  "skillsVisible": ["<skill>", "..."],
  "skillsGap": ["<skill they should add>", "..."],
  "roleReadiness": {
    "fullstack": <integer 0-100>,
    "frontend": <integer 0-100>,
    "backend": <integer 0-100>
  }
}`;

  const raw = await callGroq(prompt);

  // Strip any accidental markdown fences before parsing
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateReadme(repoName, description, language) {
  if (USE_MOCK) {
    console.log('[MOCK] Returning fake README');
    return getMockReadme(repoName, description, language);
  }

  const prompt = `
Write a professional GitHub README.md for a project with these details:
- Name: ${repoName}
- Description: ${description}
- Primary language: ${language}

Include: project description, features list, tech stack, installation steps, usage, and license section.
Return only the markdown content, no extra commentary.`;

  return await callGroq(prompt);
}

export async function deepAnalyzeRepo(repoName, files, repoMeta) {
  if (USE_MOCK) {
    console.log('[MOCK] Returning fake deep analysis');
    return {
      codeQualityScore: 8,
      architecture: "Looks like a modern React stack with functional components.",
      feedback: "The codebase is relatively clean with good separation of concerns. However, some files lack proper error handling.",
      improvements: ["Add input sanitization", "Implement strict types/prop validation", "Extract magic strings to constants"],
      securityOrPerformance: ["Consider memoizing heavy computations", "Ensure dependencies are audited for vulnerabilities"]
    };
  }

  const prompt = `
You are a senior software engineer conducting a deep code review of a GitHub repository named "${repoName}".
I am providing the top 5 most important files from this repo (truncated to 80 lines max each).

Repository Metadata: ${JSON.stringify(repoMeta)}

Files Content:
${JSON.stringify(files.map(f => ({ path: f.path, content: f.content })))}

Analyze the code quality, architecture, and identify any issues.
Respond ONLY with valid JSON in this exact shape, no deviations or markdown formatting:
{
  "codeQualityScore": <integer 1-10>,
  "architecture": "<1-2 sentences describing the patterns/architecture used>",
  "feedback": "<2-3 sentences of overall code review feedback>",
  "improvements": ["<specific actionable improvement 1>", "<improvement 2>"],
  "securityOrPerformance": ["<issue/suggestion 1>", "<issue/suggestion 2>"]
}
`;

  const raw = await callGroq(prompt);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateRecruiterReport(username, jd, githubData) {
  if (USE_MOCK) {
    console.log('[MOCK] Returning fake recruiter report');
    return {
      matchSummary: "Moderate Match for Junior Full Stack Role",
      matchScore: 78,
      verifiedSignals: ["React application architecture", "REST API implementation", "JWT authentication"],
      maturitySignals: ["Multi-service project structure detected", "Deployment configuration present"],
      standoutProject: "Society Management System appears to be the most production-oriented project due to role management.",
      riskMissingSignals: ["Limited testing evidence", "No CI/CD workflows detected"],
      interviewFocusAreas: ["State management decisions", "API security considerations"],
      confidenceNotes: "This report is generated from public repositories and reflects observable engineering signals, not a definitive measure of skill."
    };
  }

  const prompt = `
You are an AI assistant acting as a technical screener for a recruiter.
You are evaluating a candidate's GitHub profile against a Job Description.

Job Description:
${jd}

Candidate's Extracted GitHub Data:
${JSON.stringify(githubData)}

IMPORTANT PRODUCT PRINCIPLES:
1. Never make absolute claims like "Candidate is excellent". Use probabilistic, evidence-backed language (e.g., "Evidence suggests", "Candidate appears to").
2. Do not invent skills. Only list skills found in the provided evidence.
3. Distinguish between verified evidence and inferred patterns.

Return a JSON object EXACTLY matching this structure, with no markdown formatting outside the JSON:
{
  "matchSummary": "<A 1-2 sentence executive summary of the match, e.g., 'Moderate Match for Junior Full Stack Role'>",
  "matchScore": <integer 0-100 representing percentage>,
  "verifiedSignals": ["<signal 1>", "<signal 2>"],
  "maturitySignals": ["<signal 1>", "<signal 2>"],
  "standoutProject": "<1 sentence identifying the most relevant project and why>",
  "riskMissingSignals": ["<risk 1>", "<risk 2>"],
  "interviewFocusAreas": ["<area 1>", "<area 2>"],
  "confidenceNotes": "<A brief note about the confidence of this assessment based on public data>"
}
`;

  const raw = await callGroq(prompt);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
