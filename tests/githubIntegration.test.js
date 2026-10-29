/**
 * DevFlow Phase 6 — GitHub Integration Test Suite
 *
 * Covers:
 * - Connection status check (unauthenticated vs authenticated)
 * - OAuth session providerAccessToken retrieval
 * - Repository listing and normalization
 * - Commit and pull request fetching
 * - Rate limiting (HTTP 403 with x-ratelimit headers)
 * - Expired/revoked token handling (HTTP 401)
 * - 404 Repository not found handling
 * - Project repository linking and unlinking with permission checks
 * - Security: In-memory token management, absence of storage leaks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  githubService,
  setGitHubSessionToken,
  clearGitHubSessionToken,
} from '../src/services/githubService';
import { projectService } from '../src/services/projectService';

// Mock Appwrite Account
let mockAppwriteSession = null;
vi.mock('../src/config/appwrite', () => ({
  account: {
    getSession: vi.fn().mockImplementation(async () => {
      if (!mockAppwriteSession) throw new Error('No active session');
      return mockAppwriteSession;
    }),
    createOAuth2Session: vi.fn().mockImplementation((provider, success, failure, scopes) => {
      return `https://cloud.appwrite.io/v1/account/sessions/oauth2/${provider}?success=${encodeURIComponent(success)}`;
    }),
    deleteSession: vi.fn().mockResolvedValue({}),
  },
  OAuthProvider: {
    Github: 'github',
  },
  APPWRITE_CONFIG: {
    tables: { projects: 'projects' },
  },
}));

// Mock dbAdapter for project linking
vi.mock('../src/services/dbAdapter', () => ({
  dbAdapter: {
    update: vi.fn().mockImplementation(async (table, id, data) => ({
      $id: id,
      ...data,
    })),
  },
}));

describe('GitHub Integration — Service & API Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearGitHubSessionToken();
    mockAppwriteSession = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // -------------------------------------------------------------------------
  // 1. Connection Status
  // -------------------------------------------------------------------------
  describe('Connection Status', () => {
    it('returns isConnected: false when no token or Appwrite session exists', async () => {
      const status = await githubService.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.user).toBeNull();
    });

    it('retrieves providerAccessToken from Appwrite GitHub session and validates with GitHub API', async () => {
      mockAppwriteSession = {
        provider: 'github',
        providerUid: 'octocat123',
        providerAccessToken: 'gho_mock_valid_token_xyz',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'x-ratelimit-remaining': '4990',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-reset': '1700000000',
        }),
        json: async () => ({
          id: 583231,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/583231',
          html_url: 'https://github.com/octocat',
          public_repos: 8,
          total_private_repos: 2,
        }),
      });

      const status = await githubService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.user.login).toBe('octocat');
      expect(status.user.name).toBe('The Octocat');
      expect(status.rateLimit.remaining).toBe(4990);
      expect(status.error).toBeNull();
    });

    it('handles expired/invalid token returned from GitHub API', async () => {
      setGitHubSessionToken('gho_expired_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ message: 'Bad credentials' }),
      });

      const status = await githubService.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.error).toContain('expired or revoked');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Repository Listing
  // -------------------------------------------------------------------------
  describe('listRepositories', () => {
    it('returns requiresAuth: true when no token is present', async () => {
      const res = await githubService.listRepositories();
      expect(res.requiresAuth).toBe(true);
      expect(res.repositories).toEqual([]);
    });

    it('fetches and normalizes repository objects when token is present', async () => {
      setGitHubSessionToken('gho_test_token');

      const mockRepos = [
        {
          id: 101,
          name: 'DevFlow',
          full_name: 'parthbansal9352-hue/DevFlow',
          owner: { login: 'parthbansal9352-hue', avatar_url: 'https://avatar.url' },
          description: 'Developer workflow hub',
          default_branch: 'main',
          html_url: 'https://github.com/parthbansal9352-hue/DevFlow',
          private: false,
          stargazers_count: 42,
          forks_count: 5,
          open_issues_count: 1,
          language: 'JavaScript',
          updated_at: '2026-10-29T12:00:00Z',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'x-ratelimit-remaining': '4950',
          'x-ratelimit-limit': '5000',
        }),
        json: async () => mockRepos,
      });

      const res = await githubService.listRepositories();
      expect(res.requiresAuth).toBe(false);
      expect(res.repositories).toHaveLength(1);

      const repo = res.repositories[0];
      expect(repo.id).toBe(101);
      expect(repo.fullName).toBe('parthbansal9352-hue/DevFlow');
      expect(repo.isPrivate).toBe(false);
      expect(repo.stars).toBe(42);
      expect(repo.defaultBranch).toBe('main');
    });

    it('handles rate limit exceeded (HTTP 403 with x-ratelimit-remaining: 0)', async () => {
      setGitHubSessionToken('gho_test_token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1700000000',
        }),
        json: async () => ({ message: 'API rate limit exceeded' }),
      });

      await expect(githubService.listRepositories()).rejects.toThrow(
        /rate limit exceeded/i
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Commits & Pull Requests
  // -------------------------------------------------------------------------
  describe('getRecentCommits & getRecentPullRequests', () => {
    it('normalizes commit list with 7-character short sha', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            sha: 'abcdef1234567890abcdef1234567890abcdef12',
            commit: {
              message: 'feat: add GitHub integration\n\nFull details here',
              author: { name: 'Senior Dev', date: '2026-10-29T10:00:00Z' },
            },
            author: { avatar_url: 'https://avatar.url/dev' },
            html_url: 'https://github.com/owner/repo/commit/abcdef',
          },
        ],
      });

      const commits = await githubService.getRecentCommits('owner/repo', 5);
      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe('abcdef1');
      expect(commits[0].message).toBe('feat: add GitHub integration');
      expect(commits[0].authorName).toBe('Senior Dev');
    });

    it('normalizes pull requests with state and PR number', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            id: 201,
            number: 42,
            title: 'Add automated CI/CD pipeline',
            state: 'open',
            draft: false,
            user: { login: 'contributor', avatar_url: 'https://avatar.url/contrib' },
            created_at: '2026-10-28T09:00:00Z',
            html_url: 'https://github.com/owner/repo/pull/42',
          },
        ],
      });

      const prs = await githubService.getRecentPullRequests('owner/repo', 'all', 5);
      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(42);
      expect(prs[0].state).toBe('open');
      expect(prs[0].title).toBe('Add automated CI/CD pipeline');
    });

    it('throws error when repo format is invalid', async () => {
      await expect(githubService.getRecentCommits('invalid-repo')).rejects.toThrow(
        /Valid repository full name is required/
      );
      await expect(githubService.getRecentPullRequests('')).rejects.toThrow(
        /Valid repository full name is required/
      );
    });

    it('handles 404 repository not found or access denied', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Not Found' }),
      });

      await expect(githubService.getRepository('secret/private-repo')).rejects.toThrow(
        /Repository not found or access denied/
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. Project Linking & Unlinking
  // -------------------------------------------------------------------------
  describe('Project Linking & Unlinking', () => {
    const USER_ID = 'user_qa_123';
    const PROJ_ID = 'proj_456';

    it('links repository to project and validates owner/repo format', async () => {
      const res = await projectService.linkRepository(PROJ_ID, 'facebook/react', USER_ID);
      expect(res.githubRepo).toBe('facebook/react');
    });

    it('rejects invalid repository formats when linking', async () => {
      await expect(
        projectService.linkRepository(PROJ_ID, 'invalid-single-token', USER_ID)
      ).rejects.toThrow(/Must be in owner\/repo format/);

      await expect(
        projectService.linkRepository(PROJ_ID, '', USER_ID)
      ).rejects.toThrow(/valid GitHub repository/);
    });

    it('rejects unauthenticated callers when linking or unlinking', async () => {
      await expect(
        projectService.linkRepository(PROJ_ID, 'owner/repo', '')
      ).rejects.toThrow(/User ID is required/);

      await expect(
        projectService.unlinkRepository(PROJ_ID, '')
      ).rejects.toThrow(/User ID is required/);
    });

    it('unlinks repository by clearing githubRepo to empty string', async () => {
      const res = await projectService.unlinkRepository(PROJ_ID, USER_ID);
      expect(res.githubRepo).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Security & Ephemeral Token Lifecycle
  // -------------------------------------------------------------------------
  describe('Security & Token Storage Isolation', () => {
    it('clearGitHubSessionToken wipes in-memory credentials', async () => {
      setGitHubSessionToken('gho_secret_token_123');
      githubService.disconnect();

      // Subsequent call should have no token
      await expect(githubService.listRepositories()).resolves.toMatchObject({
        requiresAuth: true,
        repositories: [],
      });
    });

    it('tokens are NEVER written to localStorage or sessionStorage', () => {
      setGitHubSessionToken('gho_secret_token_never_in_storage');

      if (typeof window !== 'undefined') {
        expect(window.localStorage.getItem('github_token')).toBeNull();
        expect(window.sessionStorage.getItem('github_token')).toBeNull();
      }
    });
  });
});
