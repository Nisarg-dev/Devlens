export async function fetchUserRepos(username) {
  // Use a PAT or OAuth token to avoid immediate 60 req/hr rate limiting.
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_CLIENT_SECRET) {
    // Alternatively use a dedicated GITHUB_TOKEN if specified.
    headers.Authorization = `Basic ${Buffer.from(
      process.env.GITHUB_CLIENT_ID + ':' + process.env.GITHUB_CLIENT_SECRET
    ).toString('base64')}`;
  }

  // Fetch top 10 repos sorted by last updated
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`,
    { headers }
  );

  if (!res.ok) throw new Error(`GitHub user "${username}" not found`);
  const repos = await res.json();

  // For each repo, try to fetch the README (silently skip if missing)
  const reposWithReadme = await Promise.all(
    repos.map(async (repo) => {
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/readme`,
          { headers: { ...headers, Accept: 'application/vnd.github.v3.raw' } }
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

/**
 * Fetch key code files from a specific repo for deep analysis.
 * Uses smart sampling: fetches the file tree, picks the most important files,
 * and returns only the first 80 lines of each (to stay within AI token limits).
 *
 * Token budget: ~3-5K tokens per repo (5 files × ~80 lines × ~10 tokens/line)
 */
export async function fetchRepoCodeFiles(username, repoName) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      process.env.GITHUB_CLIENT_ID + ':' + process.env.GITHUB_CLIENT_SECRET
    ).toString('base64')}`;
  }

  // 1. Get the default branch name
  const repoRes = await fetch(
    `https://api.github.com/repos/${username}/${repoName}`,
    { headers }
  );
  if (!repoRes.ok) throw new Error(`Repository "${repoName}" not found`);
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  // 2. Fetch the full file tree (just paths + sizes, no content yet)
  const treeRes = await fetch(
    `https://api.github.com/repos/${username}/${repoName}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error('Failed to fetch repository file tree');
  const tree = await treeRes.json();

  // 3. Smart file selection — prioritize entry points and key files
  const codeExtensions = /\.(js|jsx|ts|tsx|py|go|java|rb|rs|c|cpp|cs|php|swift|kt)$/i;
  const importantPatterns = [
    /^(index|main|app|server|routes?|api)\./i,
    /^src\/(index|main|app|server)\./i,
    /^(package\.json|requirements\.txt|Cargo\.toml|go\.mod|pom\.xml|Gemfile|Dockerfile)$/i,
  ];

  const candidates = tree.tree
    .filter(f => f.type === 'blob' && f.size < 15000 && f.size > 50)
    .filter(f => codeExtensions.test(f.path) || importantPatterns.some(p => p.test(f.path)))
    .sort((a, b) => {
      // Prioritize important-named files, then shallower paths
      const aImportant = importantPatterns.some(p => p.test(a.path.split('/').pop())) ? 0 : 1;
      const bImportant = importantPatterns.some(p => p.test(b.path.split('/').pop())) ? 0 : 1;
      if (aImportant !== bImportant) return aImportant - bImportant;
      return a.path.split('/').length - b.path.split('/').length;
    })
    .slice(0, 5); // max 5 files

  if (candidates.length === 0) return [];

  // 4. Fetch content of selected files (truncated to 80 lines each)
  const files = await Promise.all(
    candidates.map(async (file) => {
      try {
        const contentRes = await fetch(
          `https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`,
          { headers: { ...headers, Accept: 'application/vnd.github.v3.raw' } }
        );
        if (!contentRes.ok) return null;
        const content = await contentRes.text();
        const lines = content.split('\n');
        return {
          path: file.path,
          content: lines.slice(0, 80).join('\n'),
          fullLines: lines.length,
          truncated: lines.length > 80,
        };
      } catch {
        return null;
      }
    })
  );

  return files.filter(Boolean);
}

/**
 * Fetch recruiter-specific metadata.
 * Pulls profile stats, filters to top projects, and extracts deterministic
 * structural signals (presence of CI/CD, Docker, tests) without downloading full files.
 */
export async function fetchRecruiterMetadata(username) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      process.env.GITHUB_CLIENT_ID + ':' + process.env.GITHUB_CLIENT_SECRET
    ).toString('base64')}`;
  }

  // 1. Fetch top repos to filter
  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=15`, { headers });
  if (!res.ok) throw new Error(`GitHub user "${username}" not found`);
  const allRepos = await res.json();

  // 2. Filter out forks and pick top 3
  const validRepos = allRepos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const topRepos = validRepos.slice(0, 3); 

  // 3. Extract structural signals
  const enrichedRepos = await Promise.all(topRepos.map(async (repo) => {
    try {
      const defaultBranch = repo.default_branch || 'main';
      const treeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/git/trees/${defaultBranch}?recursive=1`, { headers });
      const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };
      const files = treeData.tree ? treeData.tree.map(f => f.path.toLowerCase()) : [];

      const signals = {
        hasDocker: files.some(f => f.includes('dockerfile') || f.includes('docker-compose')),
        hasCI: files.some(f => f.includes('.github/workflows') || f.includes('.gitlab-ci') || f.includes('travis.yml')),
        hasTests: files.some(f => f.includes('.test.') || f.includes('.spec.') || f.startsWith('test/') || f.startsWith('tests/')),
        isTypeScript: files.some(f => f.endsWith('.ts') || f.endsWith('.tsx')),
        hasPackageJson: files.some(f => f.endsWith('package.json')),
      };

      let readme = null;
      try {
        const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers: { ...headers, Accept: 'application/vnd.github.v3.raw' }});
        if (readmeRes.ok) readme = await readmeRes.text();
      } catch (e) {}

      return {
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        signals,
        readmePreview: readme ? readme.substring(0, 1500) : null
      };
    } catch (e) {
      return { name: repo.name, error: "Failed to inspect structure" };
    }
  }));

  return {
    profileStats: {
      totalPublicRepos: allRepos.length,
      totalStars: validRepos.reduce((acc, r) => acc + r.stargazers_count, 0),
      languages: [...new Set(validRepos.map(r => r.language).filter(Boolean))]
    },
    topRepos: enrichedRepos
  };
}
