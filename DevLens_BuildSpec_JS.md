# DevLens — Complete Build Specification (JavaScript)
> Hand this file to Cursor / Windsurf / any AI IDE and say: "Build this project exactly as specified."

---

## 1. Project Overview

**What it is:** A Next.js web app where a user pastes a GitHub username, and the app fetches their public repos, sends them to Gemini AI, and returns a structured portfolio analysis — scoring each project, identifying skill gaps, and giving job-readiness percentages by role.

**Problem it solves:** Freshers and students have no way to know if their GitHub is strong enough to get interviews. This acts as a free senior developer reviewer.

**Tech Stack:**
- Framework: Next.js 14 (App Router)
- Language: JavaScript (no TypeScript)
- Styling: Tailwind CSS
- Auth: NextAuth.js (GitHub OAuth)
- Database: MongoDB Atlas (Mongoose)
- AI: Google Gemini API (gemini-1.5-flash, free tier)
- Deployment: Vercel

---

## 2. Complete Folder Structure

```
devlens/
├── app/
│   ├── layout.jsx                  # Root layout with SessionProvider
│   ├── page.jsx                    # Landing page with username input form
│   ├── dashboard/
│   │   └── page.jsx                # Shows all past analyses for logged-in user
│   ├── analyze/
│   │   └── [username]/
│   │       └── page.jsx            # Analysis result page
│   ├── share/
│   │   └── [id]/
│   │       └── page.jsx            # Public read-only result page (no auth)
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.js        # NextAuth handler
│       ├── analyze/
│       │   └── route.js            # POST: fetch GitHub + call Gemini + save to DB
│       ├── analyses/
│       │   └── route.js            # GET: return all analyses for current user
│       ├── share/
│       │   └── [id]/
│       │       └── route.js        # GET: return single analysis by shareId (public)
│       └── generate-readme/
│           └── route.js            # POST: generate README for a single repo
├── lib/
│   ├── github.js                   # GitHub API fetch helpers
│   ├── gemini.js                   # Gemini API call + response parser
│   ├── mongodb.js                  # MongoDB connection singleton
│   └── utils.js                    # generateShareId, formatDate helpers
├── models/
│   └── Analysis.js                 # Mongoose schema
├── components/
│   ├── ScoreCard.jsx               # Overall score display component
│   ├── RepoCard.jsx                # Per-repo breakdown card
│   ├── SkillsSection.jsx           # Skills visible + gap display
│   ├── RoleReadiness.jsx           # Role readiness progress bars
│   ├── ShareButton.jsx             # Copy shareable link button
│   └── GenerateReadmeButton.jsx    # Trigger README generation for a repo
├── .env.local                      # Environment variables (see Section 3)
├── next.config.js
├── tailwind.config.js
└── package.json
```

> Note: No `types/` folder needed — we are using plain JavaScript with no type annotations.

---

## 3. Environment Variables (.env.local)

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/devlens

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_random_32_char_string

# GitHub OAuth (create at github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

# Gemini (get free key at aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key
```

---

## 4. Data Shape Reference (comments only — no types file needed)

The Gemini API will return JSON in this shape. Keep this as a comment in `lib/gemini.js` for reference:

```js
/*
  AnalysisResult shape returned by Gemini:
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
```

---

## 5. MongoDB Model (models/Analysis.js)

```js
import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema({
  userId:          { type: String, required: true },
  githubUsername:  { type: String, required: true },
  result:          { type: Object, required: true },
  isPublic:        { type: Boolean, default: false },
  shareId:         { type: String, unique: true, sparse: true },
  createdAt:       { type: Date, default: Date.now }
});

// Compound index: fast lookup of all analyses by user, newest first
AnalysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);
```

---

## 6. MongoDB Connection (lib/mongodb.js)

```js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Singleton pattern — prevents multiple connections in dev hot-reload
let cached = global.mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  global.mongoose = cached;
  return cached.conn;
}
```

---

## 7. GitHub Fetch Helper (lib/github.js)

```js
export async function fetchUserRepos(username) {
  // Fetch top 10 repos sorted by last updated
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );

  if (!res.ok) throw new Error(`GitHub user "${username}" not found`);
  const repos = await res.json();

  // For each repo, try to fetch the README (silently skip if missing)
  const reposWithReadme = await Promise.all(
    repos.map(async (repo) => {
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/readme`,
          { headers: { Accept: 'application/vnd.github.v3.raw' } }
        );
        const readme = readmeRes.ok ? await readmeRes.text() : undefined;
        return { ...repo, readme };
      } catch {
        return repo;
      }
    })
  );

  return reposWithReadme;
}
```

---

## 8. Gemini Integration (lib/gemini.js)

```js
export async function analyzePortfolio(repos) {
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!res.ok) throw new Error('Gemini API call failed');

  const data = await res.json();
  const raw = data.candidates[0].content.parts[0].text;

  // Strip any accidental markdown fences before parsing
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateReadme(repoName, description, language) {
  const prompt = `
Write a professional GitHub README.md for a project with these details:
- Name: ${repoName}
- Description: ${description}
- Primary language: ${language}

Include: project description, features list, tech stack, installation steps, usage, and license section.
Return only the markdown content, no extra commentary.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
```

---

## 9. Utility Helpers (lib/utils.js)

```js
import { nanoid } from 'nanoid';

// Generate a short unique ID for shareable links (e.g. "V1StGXR8_Z5jdHi6B")
export function generateShareId() {
  return nanoid(18);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
```

---

## 10. API Routes

### POST /api/analyze (app/api/analyze/route.js)

```js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { fetchUserRepos } from '@/lib/github';
import { analyzePortfolio } from '@/lib/gemini';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';
import { generateShareId } from '@/lib/utils';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  try {
    // 1. Fetch GitHub repos
    const repos = await fetchUserRepos(username);

    // 2. Call Gemini
    const result = await analyzePortfolio(repos);

    // 3. Save to MongoDB
    await connectDB();
    const analysis = await Analysis.create({
      userId: session.user.email,
      githubUsername: username,
      result,
      shareId: generateShareId(),
    });

    return NextResponse.json({ analysisId: analysis._id, result, shareId: analysis.shareId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### GET /api/analyses (app/api/analyses/route.js)

```js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  // .lean() strips Mongoose overhead — returns plain JSON objects, ~80% less RAM
  const analyses = await Analysis.find({ userId: session.user.email })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(analyses);
}
```

### GET /api/share/[id] (app/api/share/[id]/route.js)

```js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Analysis from '@/models/Analysis';

export async function GET(req, { params }) {
  await connectDB();
  const analysis = await Analysis.findOne({ shareId: params.id }).lean();
  if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(analysis);
}
```

### POST /api/generate-readme (app/api/generate-readme/route.js)

```js
import { NextResponse } from 'next/server';
import { generateReadme } from '@/lib/gemini';

export async function POST(req) {
  const { repoName, description, language } = await req.json();
  const readme = await generateReadme(repoName, description ?? '', language ?? 'JavaScript');
  return NextResponse.json({ readme });
}
```

### NextAuth Config (app/api/auth/[...nextauth]/route.js)

```js
import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 11. Pages

### Landing Page (app/page.jsx)

**UI Requirements:**
- Centered layout, clean minimal design
- Large heading: "Is your GitHub ready for interviews?"
- Single text input for GitHub username
- "Analyze" button — on submit, calls POST /api/analyze then redirects to /analyze/[username]
- If user is not logged in, show "Sign in with GitHub" button instead
- Show loading spinner while analysis is running (it takes 3-5 seconds)

### Dashboard Page (app/dashboard/page.jsx)

**UI Requirements:**
- Protected route — redirect to home if not logged in
- Heading: "Your past analyses"
- List of cards, each showing: GitHub username, overall score badge, date, "View" button, "Copy share link" button
- Empty state: "No analyses yet. Go analyze your first profile."

### Analysis Result Page (app/analyze/[username]/page.jsx)

**UI Requirements:**
- Fetch the latest analysis for this username from /api/analyses (filter by username client-side)
- Display all components: ScoreCard, RepoCard list, SkillsSection, RoleReadiness
- "Share" button copies the public share URL to clipboard
- "Save to dashboard" button (analysis is already saved, just navigate to /dashboard)

### Public Share Page (app/share/[id]/page.jsx)

**UI Requirements:**
- No auth required — public page
- Fetch from GET /api/share/[id]
- Show a "View only" banner at the top: "This is a shared DevLens analysis"
- Same layout as analysis result page but without edit/save buttons
- Show "Analyze your own GitHub →" CTA at the bottom

---

## 12. Components

### ScoreCard.jsx
- Props: `{ score, strengths, weaknesses }`
- Big circular score display (e.g. "7/10")
- Color: green if ≥7, amber if 4-6, red if ≤3
- Two columns below: strengths (green checkmarks) and weaknesses (red crosses)

### RepoCard.jsx
- Props: `{ repo }` where repo = `{ name, score, feedback, missing }`
- Repo name with score badge
- Feedback text
- "Missing" chips (e.g. red pill for "No README", "No live demo")
- "Generate README" button — calls POST /api/generate-readme and shows result in an expandable section below the card

### SkillsSection.jsx
- Props: `{ visible, gap }`
- Two rows of pill badges
- Visible skills: green background
- Gap skills: grey background with dashed border and "+" prefix

### RoleReadiness.jsx
- Props: `{ roleReadiness }` where roleReadiness = `{ fullstack, frontend, backend }`
- Three progress bars with role labels and percentage
- Color: same as ScoreCard (green/amber/red by value)

### ShareButton.jsx
- Props: `{ shareId }`
- On click: copies `window.location.origin + "/share/" + shareId` to clipboard
- Shows "Copied!" feedback for 2 seconds

---

## 13. Package.json Dependencies

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "tailwindcss": "^3",
    "mongoose": "^8",
    "next-auth": "^4",
    "nanoid": "^5"
  }
}
```

> Note: No `typescript` or `@types/*` packages needed.

---

## 14. Exact Prompts to Give Your AI IDE

Use these prompts **in order**. Each builds on the previous.

---

### Prompt 1 — Project Scaffolding
```
Create a new Next.js 14 project called "devlens" using plain JavaScript (no TypeScript), with Tailwind CSS and the App Router. Use .jsx for all React files and .js for all other files. No tsconfig.json, no .ts files anywhere.
Set up the folder structure: app/, lib/, models/, components/.
Install these packages: mongoose, next-auth, nanoid.
Create the .env.local file with placeholder values for: MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GEMINI_API_KEY.
```

---

### Prompt 2 — DB Layer
```
Using plain JavaScript (no TypeScript, no type annotations):
1. Create lib/mongodb.js — singleton MongoDB connection using Mongoose with a global cached connection pattern to prevent multiple connections during hot reload
2. Create models/Analysis.js — Mongoose schema with fields: userId (String, required), githubUsername (String, required), result (Object, required), isPublic (Boolean, default false), shareId (String, unique, sparse), createdAt (Date, default Date.now). Add compound index on { userId: 1, createdAt: -1 }.
```

---

### Prompt 3 — GitHub and Gemini Helpers
```
Using plain JavaScript (no TypeScript, no type annotations):

Create lib/github.js with a fetchUserRepos(username) function that:
- Calls the GitHub REST API to fetch the user's top 10 repos sorted by updated date
- For each repo, makes a second API call to fetch the README content as raw text
- Returns an array with repo metadata plus a readme field
- Throws a clear error message if the user is not found

Create lib/gemini.js with:
1. analyzePortfolio(repos) — sends repo data to Gemini 1.5 Flash with the structured JSON prompt from the spec, strips any markdown fences from the response, parses and returns the result object
2. generateReadme(repoName, description, language) — returns a markdown string

Create lib/utils.js with generateShareId() using nanoid(18) and formatDate() formatted for Indian locale (en-IN).
```

---

### Prompt 4 — API Routes
```
Using plain JavaScript (no TypeScript):
Create all API routes as specified:
1. app/api/auth/[...nextauth]/route.js — NextAuth with GitHub provider, export authOptions
2. app/api/analyze/route.js — POST: check session, fetch GitHub repos, call Gemini, save Analysis to MongoDB with a shareId, return result and shareId
3. app/api/analyses/route.js — GET: return all analyses for the logged-in user sorted newest first, use .lean() for performance
4. app/api/share/[id]/route.js — GET: public route, find analysis by shareId field, no auth required
5. app/api/generate-readme/route.js — POST: call generateReadme from gemini.js, return markdown
```

---

### Prompt 5 — Components
```
Using plain JavaScript with .jsx files and Tailwind CSS:
1. components/ScoreCard.jsx — props: { score, strengths, weaknesses }. Circular score display, color-coded green/amber/red, strengths and weaknesses in two columns
2. components/RepoCard.jsx — props: { repo }. Repo name, score badge, feedback text, missing items as red pills, "Generate README" button that calls /api/generate-readme and shows result in an expandable section
3. components/SkillsSection.jsx — props: { visible, gap }. Green pills for visible skills, grey dashed pills with "+" for gaps
4. components/RoleReadiness.jsx — props: { roleReadiness }. Three color-coded progress bars
5. components/ShareButton.jsx — props: { shareId }. Copies share URL to clipboard, shows "Copied!" for 2 seconds
Make them clean, minimal, and mobile responsive.
```

---

### Prompt 6 — Pages
```
Using plain JavaScript with .jsx files and Tailwind CSS:
1. app/page.jsx — landing page: centered hero, GitHub username input, "Analyze" button with loading spinner, show "Sign in with GitHub" if not logged in
2. app/dashboard/page.jsx — protected: redirect to home if no session, list of past analysis cards with view/share buttons, empty state message
3. app/analyze/[username]/page.jsx — fetch latest analysis for this username, render ScoreCard, RepoCard list, SkillsSection, RoleReadiness, ShareButton
4. app/share/[id]/page.jsx — public page, fetch from /api/share/[id], show "View only" banner, render all result components, show "Analyze your own GitHub →" CTA

Create app/layout.jsx wrapping the whole app with NextAuth SessionProvider.
```

---

### Prompt 7 — Final Polish
```
1. Add skeleton loader placeholders on the dashboard and analysis pages while data is loading
2. Add friendly error messages — if GitHub username not found show "User not found. Check the username and try again."
3. Add a simple navbar in app/layout.jsx with: "DevLens" logo on the left, "Dashboard" link and "Sign out" button on the right (only show when logged in)
4. Make sure all API routes return proper JSON error responses with correct HTTP status codes
5. Test that the share page works without being logged in
```

---

## 15. What to Say in Interviews About This Project

| Interviewer asks | Your answer |
|---|---|
| "What problem does it solve?" | "Freshers have no way to know if their GitHub is interview-ready. I built a tool that acts as a senior dev reviewer — it reads your public repos and gives you a scored breakdown with specific gaps." |
| "How does the AI integration work?" | "I call Gemini 1.5 Flash with a carefully structured prompt that instructs it to return only JSON. On the backend I parse and validate that JSON before storing it in MongoDB." |
| "What did you learn?" | "Prompt engineering — getting an AI to return consistent structured JSON requires very specific instructions. I also learned the Next.js App Router pattern and how server-side sessions work with NextAuth." |
| "Why MongoDB over PostgreSQL?" | "The core data is a deeply nested AI-generated JSON object — varying arrays, nested objects. MongoDB stores it natively. PostgreSQL would require either a jsonb column or 4-5 normalized tables, which was overkill for this." |
| "What would you add next?" | "A diff view between two analyses over time so users can track improvement, and a recruiter mode where you paste a GitHub URL and get a quick 30-second summary." |

---

## 16. Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel project, connect repo
- [ ] Add all env variables in Vercel dashboard
- [ ] Update `NEXTAUTH_URL` to your Vercel URL (e.g. `https://devlens.vercel.app`)
- [ ] Update GitHub OAuth app callback URL to `https://your-app.vercel.app/api/auth/callback/github`
- [ ] Verify MongoDB Atlas Network Access allows `0.0.0.0/0` for Vercel
- [ ] Test the full flow: sign in → analyze → share link

---

*Built by Nisarg Shah — DevLens v1.0*
