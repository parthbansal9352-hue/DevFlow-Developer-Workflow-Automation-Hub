/**
 * DevFlow GitHub Integration Service
 *
 * Handles GitHub OAuth connection, repository listing, commits, and pull requests.
 *
 * ## Security Architecture:
 * - Confidential tokens are kept ONLY in ephemeral memory (_sessionToken) or in the
 *   Appwrite Server-managed session (providerAccessToken).
 * - NEVER written to localStorage, sessionStorage, VITE_ variables, or public databases.
 * - Least-privilege scopes requested: 'read:user repo' (or 'read:user public_repo').
 * - All credentials sanitized in logs and error messages.
 * - Handles rate limits (403), revoked authorization (401), and pagination.
 */

import { account, OAuthProvider } from '../config/appwrite';

const GITHUB_API_BASE = 'https://api.github.com';

// In-memory token storage (ephemeral, wiped on refresh/logout, never saved to storage)
let _sessionToken = null;

/**
 * Exposed for testing or session initialization.
 * @param {string|null} token
 */
export function setGitHubSessionToken(token) {
  _sessionToken = token || null;
}

/**
 * Exposed for testing or logout.
 */
export function clearGitHubSessionToken() {
  _sessionToken = null;
}

/**
 * Helper to build standard GitHub request headers.
 */
function buildHeaders(token = _sessionToken) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parses GitHub API error responses, extracting rate limits and human-readable messages.
 */
function parseGitHubResponseError(status, data, headers) {
  const remaining = headers?.get('x-ratelimit-remaining');
  const resetEpoch = headers?.get('x-ratelimit-reset');

  if (status === 401) {
    return new Error('GitHub authorization expired or revoked. Please reconnect your account.');
  }

  if (status === 403) {
    if (remaining === '0' && resetEpoch) {
      const resetTime = new Date(parseInt(resetEpoch, 10) * 1000).toLocaleTimeString();
      return new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}.`);
    }
    return new Error(data?.message || 'Access forbidden by GitHub permissions or organization policy.');
  }

  if (status === 404) {
    return new Error('Repository not found or access denied.');
  }

  return new Error(data?.message || `GitHub API request failed with status ${status}`);
}

export const githubService = {
  /**
   * Check connection status against Appwrite active session and GitHub API.
   * If the user logged in with GitHub OAuth, Appwrite stores providerAccessToken on the session.
   * @returns {Promise<{isConnected: boolean, user: object|null, rateLimit: object|null, error: string|null}>}
   */
  async getConnectionStatus() {
    // 1. Try to obtain token from current Appwrite session if not already in memory
    if (!_sessionToken) {
      try {
        const session = await account.getSession({ sessionId: 'current' });
        if (session && session.provider === 'github' && session.providerAccessToken) {
          _sessionToken = session.providerAccessToken;
        }
      } catch {
        // Unauthenticated in Appwrite or session lacks provider token
      }
    }

    if (!_sessionToken) {
      return {
        isConnected: false,
        user: null,
        rateLimit: null,
        error: null,
      };
    }

    // 2. Validate token against GitHub /user endpoint
    try {
      const res = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: buildHeaders(_sessionToken),
      });

      const remaining = res.headers.get('x-ratelimit-remaining');
      const limit = res.headers.get('x-ratelimit-limit');
      const reset = res.headers.get('x-ratelimit-reset');

      const rateLimit = {
        remaining: remaining ? parseInt(remaining, 10) : null,
        limit: limit ? parseInt(limit, 10) : null,
        resetTime: reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : null,
      };

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        _sessionToken = null; // Invalidate broken token
        return {
          isConnected: false,
          user: null,
          rateLimit,
          error: parseGitHubResponseError(res.status, errData, res.headers).message,
        };
      }

      const userData = await res.json();
      return {
        isConnected: true,
        user: {
          id: userData.id,
          login: userData.login,
          name: userData.name || userData.login,
          avatarUrl: userData.avatar_url,
          htmlUrl: userData.html_url,
          publicRepos: userData.public_repos,
          totalPrivateRepos: userData.total_private_repos || 0,
        },
        rateLimit,
        error: null,
      };
    } catch (err) {
      return {
        isConnected: false,
        user: null,
        rateLimit: null,
        error: err.message || 'Network failure while contacting GitHub.',
      };
    }
  },

  /**
   * Initiate Appwrite OAuth2 flow with GitHub.
   * Redirects browser to GitHub authorization screen.
   * @param {string} [successUrl]
   * @param {string} [failureUrl]
   */
  connect(successUrl, failureUrl) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const sUrl = successUrl || `${origin}?github_auth=success`;
    const fUrl = failureUrl || `${origin}?github_auth=failure`;

    // Least-privilege scopes: read user profile, read and write repos the user authorizes
    const scopes = ['read:user', 'repo'];

    return account.createOAuth2Session(OAuthProvider.Github, sUrl, fUrl, scopes);
  },

  /**
   * Disconnect GitHub integration: clears in-memory credentials.
   */
  disconnect() {
    clearGitHubSessionToken();
  },

  /**
   * List repositories the authenticated user is authorized to view.
   * If not authenticated, fetches public repositories for an owner or returns empty array.
   *
   * @param {object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.perPage=30]
   * @param {string} [options.visibility='all'] - 'all' | 'public' | 'private'
   * @param {string} [options.customToken] - Optional token override for testing
   * @returns {Promise<{repositories: Array, totalCount?: number, rateLimit: object}>}
   */
  async listRepositories({ page = 1, perPage = 30, visibility = 'all', customToken = null } = {}) {
    const token = customToken || _sessionToken;

    let url = `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=${perPage}&page=${page}`;
    if (visibility && visibility !== 'all') {
      url += `&visibility=${visibility}`;
    }

    // If no token, we can fallback to default public repo or empty list
    if (!token) {
      return {
        repositories: [],
        rateLimit: null,
        requiresAuth: true,
      };
    }

    const res = await fetch(url, { headers: buildHeaders(token) });

    const remaining = res.headers.get('x-ratelimit-remaining');
    const limit = res.headers.get('x-ratelimit-limit');
    const reset = res.headers.get('x-ratelimit-reset');

    const rateLimit = {
      remaining: remaining ? parseInt(remaining, 10) : null,
      limit: limit ? parseInt(limit, 10) : null,
      resetTime: reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : null,
    };

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw parseGitHubResponseError(res.status, errData, res.headers);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return { repositories: [], rateLimit };

    const repositories = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login,
      ownerAvatar: repo.owner?.avatar_url,
      description: repo.description || 'No description provided.',
      defaultBranch: repo.default_branch || 'main',
      url: repo.html_url,
      isPrivate: Boolean(repo.private),
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      language: repo.language || 'Plain Text',
      updatedAt: repo.updated_at,
    }));

    return { repositories, rateLimit, requiresAuth: false };
  },

  /**
   * Fetch details for a specific repository.
   * Works for both public repos (unauthenticated) and private repos (when token available).
   *
   * @param {string} fullName - e.g. "owner/repo"
   * @param {string} [customToken]
   */
  async getRepository(fullName, customToken = null) {
    if (!fullName || typeof fullName !== 'string' || !fullName.includes('/')) {
      throw new Error('Valid repository full name is required (e.g. owner/repo).');
    }

    const token = customToken || _sessionToken;
    const res = await fetch(`${GITHUB_API_BASE}/repos/${fullName.trim()}`, {
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw parseGitHubResponseError(res.status, errData, res.headers);
    }

    const repo = await res.json();
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login,
      ownerAvatar: repo.owner?.avatar_url,
      description: repo.description || 'No description provided.',
      defaultBranch: repo.default_branch || 'main',
      url: repo.html_url,
      isPrivate: Boolean(repo.private),
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      language: repo.language || 'Plain Text',
      updatedAt: repo.updated_at,
    };
  },

  /**
   * Fetch recent commits for a repository.
   *
   * @param {string} fullName - e.g. "owner/repo"
   * @param {number} [limit=5]
   * @param {string} [customToken]
   * @returns {Promise<Array<{sha: string, fullSha: string, message: string, authorName: string, authorAvatar?: string, date: string, url: string}>>}
   */
  async getRecentCommits(fullName, limit = 5, customToken = null) {
    if (!fullName || typeof fullName !== 'string' || !fullName.includes('/')) {
      throw new Error('Valid repository full name is required (e.g. owner/repo).');
    }

    const token = customToken || _sessionToken;
    const res = await fetch(`${GITHUB_API_BASE}/repos/${fullName.trim()}/commits?per_page=${limit}`, {
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw parseGitHubResponseError(res.status, errData, res.headers);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      sha: (item.sha || '').substring(0, 7),
      fullSha: item.sha,
      message: (item.commit?.message || '').split('\n')[0],
      authorName: item.commit?.author?.name || item.author?.login || 'Committer',
      authorAvatar: item.author?.avatar_url,
      date: item.commit?.author?.date || item.commit?.committer?.date || '',
      url: item.html_url,
    }));
  },

  /**
   * Fetch pull requests for a repository.
   *
   * @param {string} fullName - e.g. "owner/repo"
   * @param {string} [state='all'] - 'open' | 'closed' | 'all'
   * @param {number} [limit=5]
   * @param {string} [customToken]
   * @returns {Promise<Array<{id: number, number: number, title: string, state: string, isDraft: boolean, author: string, authorAvatar?: string, createdAt: string, url: string}>>}
   */
  async getRecentPullRequests(fullName, state = 'all', limit = 5, customToken = null) {
    if (!fullName || typeof fullName !== 'string' || !fullName.includes('/')) {
      throw new Error('Valid repository full name is required (e.g. owner/repo).');
    }

    const token = customToken || _sessionToken;
    const res = await fetch(`${GITHUB_API_BASE}/repos/${fullName.trim()}/pulls?state=${state}&per_page=${limit}`, {
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw parseGitHubResponseError(res.status, errData, res.headers);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state, // open, closed
      isDraft: Boolean(pr.draft),
      author: pr.user?.login || 'Contributor',
      authorAvatar: pr.user?.avatar_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      url: pr.html_url,
    }));
  },
};
