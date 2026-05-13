# ✦ DevLens — GitHub Portfolio Analyzer

[![Live Demo](https://img.shields.io/badge/Live_Demo-devlens--omega.vercel.app-indigo?style=for-the-badge)](https://devlens-omega.vercel.app/)

DevLens is a full-stack Next.js application designed to act as an AI-powered senior engineer reviewing your public GitHub repositories. By aggregating your repository data and processing it through an advanced LLM, DevLens provides an instant, structured breakdown of your portfolio's strengths, missing skills, and role readiness.

## 🚀 Live Demo
**Try it here:** [https://devlens-omega.vercel.app/](https://devlens-omega.vercel.app/)

## ✨ Key Features
- **AI-Powered Code Review:** Evaluates public repositories to assess documentation, structure, and code quality.
- **Role Readiness Scoring:** Provides percentage-based scores indicating readiness for Full-Stack, Frontend, or Backend roles.
- **Skill Gap Analysis:** Identifies visible skills and suggests technologies you should learn next.
- **Secure Shareable Links:** Generates cryptographically secure URLs so you can safely share your portfolio review with recruiters or friends.
- **GitHub OAuth:** Secure, read-only authentication to keep a persistent history of your portfolio analyses.

## 🛠️ Tech Stack
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Authentication:** [NextAuth.js v4](https://next-auth.js.org/) (GitHub Provider)
- **Database:** [MongoDB](https://www.mongodb.com/) (Mongoose)
- **AI Provider:** [Groq API](https://groq.com/) 

## 🏗️ Technical Architecture Highlights
This project solves several non-trivial engineering challenges:
1. **Concurrent Data Orchestration:** Instead of querying the GitHub API sequentially for repository READMEs (which would cause massive waterfall delays), DevLens utilizes `Promise.all()` to fire concurrent API requests, significantly reducing load times.
2. **Deterministic LLM Output:** Getting AI to return usable JSON is difficult. DevLens utilizes strict prompt engineering, temperature control (`0.3`), and custom regex sanitizers to force the LLM to output a strict JSON schema that maps cleanly to React components without crashing.
3. **Secure IDOR Prevention:** Rather than exposing internal database primary keys (`_id`), the application generates secondary cryptographically random IDs (`shareId` via `nanoid`) for public routing, preventing Insecure Direct Object Reference vulnerabilities.

## 💻 Local Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/devlens.git
cd devlens
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Environment Variables**
Create a `.env.local` file in the root directory and add the following:
```env
# GitHub OAuth (Create an OAuth App in GitHub Developer Settings)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# NextAuth Configuration
NEXTAUTH_SECRET=generate_a_random_string
NEXTAUTH_URL=http://localhost:3000

# MongoDB Database
MONGODB_URI=your_mongodb_connection_string

# AI Configuration
GROQ_API_KEY=your_groq_api_key

# Optional: Set to true to bypass AI API limits during UI development
USE_MOCK_GEMINI=false
```

4. **Run the development server**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔒 Privacy & Security
DevLens **only requests read-only access** to public profile data during authentication. It does not request write access or access to private repositories. The analysis is performed strictly on publicly available GitHub data via the unauthenticated GitHub REST API.

---
*Built by Nisarg Shah*
