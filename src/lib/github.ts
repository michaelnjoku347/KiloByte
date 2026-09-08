export type RepoRef = {
  owner: string
  repo: string
  branch?: string
  path: string
}

export type GithubInspect = {
  ref: Required<RepoRef>
  name: string
  description: string
  stars: number
  topics: string[]
  htmlUrl: string
  playUrl: string
  pagesUrl: string
  entry: string
}

const API = 'https://api.github.com'

export function parseGithubInput(input: string): RepoRef {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Paste a GitHub URL or owner/repo.')
  const url = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*))?)?/i,
  )
  if (url) {
    const owner = url[1]
    const repo = url[2].replace(/\.git$/i, '')
    const branch = url[3]
    let path = (url[4] ?? '').replace(/\/+$/, '')
    if (path.endsWith('index.html')) path = path.replace(/\/?index\.html$/i, '')
    return { owner, repo, branch, path }
  }
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)(?:\/(.*))?$/)
  if (short) {
    return {
      owner: short[1],
      repo: short[2].replace(/\.git$/i, ''),
      path: (short[3] ?? '').replace(/\/+$/, ''),
    }
  }
  throw new Error('Use owner/repo or a github.com URL.')
}

export function jsdelivrUrl(ref: Required<RepoRef>, entry = 'index.html'): string {
  const folder = ref.path ? `${ref.path.replace(/\/+$/, '')}/` : ''
  return `https://cdn.jsdelivr.net/gh/${ref.owner}/${ref.repo}@${ref.branch}/${folder}${entry}`
}

export function pagesUrl(ref: Required<RepoRef>): string {
  const folder = ref.path ? `${ref.path.replace(/\/+$/, '')}/` : ''
  return `https://${ref.owner}.github.io/${ref.repo}/${folder}`
}

type ContentItem = { name: string; type: string; path: string }

async function githubJson<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`
  const res = await fetch(url, { headers })
  if (res.status === 404) throw new Error('Repo or path not found. Is it public?')
  if (res.status === 403) throw new Error('GitHub rate limit. Add a personal token in Create, or wait.')
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  return (await res.json()) as T
}

async function listDir(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string,
): Promise<ContentItem[]> {
  const suffix = path ? `/${path}` : ''
  const data = await githubJson<ContentItem[] | ContentItem>(
    `${API}/repos/${owner}/${repo}/contents${suffix}?ref=${encodeURIComponent(branch)}`,
    token,
  )
  return Array.isArray(data) ? data : [data]
}

function findEntry(items: ContentItem[]): string | undefined {
  const names = items.filter((i) => i.type === 'file').map((i) => i.name)
  const html = names.find((n) => n.toLowerCase() === 'index.html') ?? names.find((n) => n.endsWith('.html'))
  return html
}

export async function inspectGithub(input: string, token?: string): Promise<GithubInspect> {
  const parsed = parseGithubInput(input)
  const repo = await githubJson<{
    name: string
    description: string | null
    stargazers_count: number
    default_branch: string
    html_url: string
    topics?: string[]
    homepage?: string | null
  }>(`${API}/repos/${parsed.owner}/${parsed.repo}`, token)

  const branch = parsed.branch ?? repo.default_branch
  const tryPaths = parsed.path ? [parsed.path] : ['', 'dist', 'docs', 'public', 'game', 'src']
  let path = parsed.path
  let entry = 'index.html'
  let found = false
  for (const candidate of tryPaths) {
    try {
      const items = await listDir(parsed.owner, parsed.repo, candidate, branch, token)
      const hit = findEntry(items)
      if (hit) {
        path = candidate
        entry = hit
        found = true
        break
      }
    } catch {
      /* try next folder */
    }
  }
  if (!found) {
    throw new Error('No index.html (or other .html) in that repo. Point the path at your game folder.')
  }

  const ref = { owner: parsed.owner, repo: parsed.repo, branch, path }
  return {
    ref,
    name: repo.name,
    description: repo.description ?? '',
    stars: repo.stargazers_count,
    topics: repo.topics ?? [],
    htmlUrl: repo.html_url,
    playUrl: jsdelivrUrl(ref, entry),
    pagesUrl: repo.homepage || pagesUrl(ref),
    entry,
  }
}
