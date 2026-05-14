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
