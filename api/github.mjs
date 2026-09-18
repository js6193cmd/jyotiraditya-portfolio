const USERNAME = 'js6193cmd';

function headers() {
  const base = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Jyotiraditya-Portfolio',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (process.env.GITHUB_TOKEN) base.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return base;
}

function cleanRepo(repo) {
  return {
    name: String(repo?.name || ''),
    description: repo?.description ? String(repo.description) : '',
    url: String(repo?.html_url || ''),
    language: repo?.language ? String(repo.language) : '',
    stars: Number(repo?.stargazers_count || 0),
    forks: Number(repo?.forks_count || 0),
    updatedAt: String(repo?.pushed_at || repo?.updated_at || ''),
    fork: Boolean(repo?.fork),
    archived: Boolean(repo?.archived)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const requestHeaders = headers();
    const [userResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${USERNAME}`, { headers: requestHeaders, signal: AbortSignal.timeout(10_000) }),
      fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`, { headers: requestHeaders, signal: AbortSignal.timeout(10_000) })
    ]);

    if (!userResponse.ok || !reposResponse.ok) {
      throw new Error(`GitHub API ${userResponse.status}/${reposResponse.status}`);
    }

    const [user, reposRaw] = await Promise.all([userResponse.json(), reposResponse.json()]);
    const repos = (Array.isArray(reposRaw) ? reposRaw : [])
      .map(cleanRepo)
      .filter((repo) => repo.name && repo.url && !repo.fork && !repo.archived)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({
      user: {
        login: String(user?.login || USERNAME),
        name: user?.name ? String(user.name) : 'Jyotiraditya Singh',
        bio: user?.bio ? String(user.bio) : '',
        avatarUrl: user?.avatar_url ? String(user.avatar_url) : '',
        profileUrl: user?.html_url ? String(user.html_url) : `https://github.com/${USERNAME}`,
        publicRepos: Number(user?.public_repos || 0),
        followers: Number(user?.followers || 0),
        following: Number(user?.following || 0)
      },
      repos,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('github_error', error);
    return res.status(503).json({ error: 'GitHub preview unavailable' });
  }
}
