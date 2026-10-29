import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Unlink,
  Link2,
  Lock,
  Globe,
  Star,
  GitFork,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { githubService } from '../../services/githubService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Alert } from '../common/Alert';
import { Spinner } from '../common/Spinner';

function GitHubIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function GitHubView() {
  const { projects, linkProjectRepository, unlinkProjectRepository } = useProjects();

  const [connection, setConnection] = useState({
    isConnected: false,
    user: null,
    rateLimit: null,
    error: null,
  });
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all | linked

  // Linking state
  const [linkingRepo, setLinkingRepo] = useState(null); // repo fullName
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Expanded items for Commits & PRs
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [repoCommits, setRepoCommits] = useState({});
  const [repoPRs, setRepoPRs] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Setup help guide modal
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Check connection on mount
  const checkStatus = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const status = await githubService.getConnectionStatus();
      setConnection(status);
    } catch (err) {
      setConnection({
        isConnected: false,
        user: null,
        rateLimit: null,
        error: err.message,
      });
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Load repositories when connected
  const fetchRepositories = useCallback(async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const res = await githubService.listRepositories();
      setRepositories(res.repositories);
      if (res.rateLimit) {
        setConnection((prev) => ({ ...prev, rateLimit: res.rateLimit }));
      }
    } catch (err) {
      setRepoError(err.message || 'Failed to fetch repositories.');
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    if (connection.isConnected) {
      fetchRepositories();
    }
  }, [connection.isConnected, fetchRepositories]);

  const handleConnect = () => {
    try {
      githubService.connect();
    } catch (err) {
      setRepoError(err.message || 'Failed to initiate GitHub OAuth session.');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect your GitHub account? In-memory tokens will be cleared.')) {
      githubService.disconnect();
      setConnection({
        isConnected: false,
        user: null,
        rateLimit: null,
        error: null,
      });
      setRepositories([]);
      setSuccessMessage('Disconnected from GitHub.');
    }
  };

  const handleLink = async (repoFullName) => {
    if (!selectedProjectId) {
      alert('Please select a DevFlow project to link.');
      return;
    }
    setIsLinking(true);
    try {
      await linkProjectRepository(selectedProjectId, repoFullName);
      setSuccessMessage(`Successfully linked "${repoFullName}" to project.`);
      setLinkingRepo(null);
      setSelectedProjectId('');
    } catch (err) {
      setRepoError(err.message || 'Failed to link repository.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (projectId) => {
    if (window.confirm('Unlink this repository from the project?')) {
      try {
        await unlinkProjectRepository(projectId);
        setSuccessMessage('Repository unlinked from project.');
      } catch (err) {
        setRepoError(err.message || 'Failed to unlink repository.');
      }
    }
  };

  // Toggle commits & PRs inspection
  const toggleExpand = async (repoFullName) => {
    if (expandedRepo === repoFullName) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repoFullName);

    // Fetch details if not cached yet
    if (!repoCommits[repoFullName] || !repoPRs[repoFullName]) {
      setLoadingDetails(true);
      try {
        const [commits, prs] = await Promise.allSettled([
          githubService.getRecentCommits(repoFullName, 5),
          githubService.getRecentPullRequests(repoFullName, 'all', 5),
        ]);

        if (commits.status === 'fulfilled') {
          setRepoCommits((prev) => ({ ...prev, [repoFullName]: commits.value }));
        }
        if (prs.status === 'fulfilled') {
          setRepoPRs((prev) => ({ ...prev, [repoFullName]: prs.value }));
        }
      } catch (err) {
        console.error('Failed to load repo details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  // Filter linked projects
  const linkedProjects = projects.filter((p) => p.githubRepo && p.githubRepo.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 shrink-0">
              <GitHubIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">GitHub Integration</h2>
                {connection.isConnected ? (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium">
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Link GitHub repositories to DevFlow projects to track commits, pull requests, and automated workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connection.isConnected ? (
              <div className="flex items-center gap-3">
                {connection.user && (
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    {connection.user.avatarUrl && (
                      <img
                        src={connection.user.avatarUrl}
                        alt={connection.user.login}
                        className="w-5 h-5 rounded-full border border-slate-700"
                      />
                    )}
                    <span className="font-semibold text-slate-200">@{connection.user.login}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleDisconnect} id="btn-github-disconnect">
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowSetupGuide(true)}>
                  <Info className="w-4 h-4" /> Setup Instructions
                </Button>
                <Button variant="primary" size="sm" onClick={handleConnect} id="btn-github-connect">
                  <GitHubIcon className="w-4 h-4 mr-1.5" /> Connect GitHub
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Rate Limit Info Bar */}
        {connection.rateLimit && connection.rateLimit.remaining !== null && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              API Rate Limit: <strong className="text-slate-200">{connection.rateLimit.remaining}</strong> / {connection.rateLimit.limit} remaining
            </span>
            {connection.rateLimit.resetTime && (
              <span className="text-[11px] text-slate-500">
                Resets at {connection.rateLimit.resetTime}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {successMessage && <Alert variant="success" message={successMessage} />}
      {repoError && <Alert variant="error" message={repoError} />}
      {connection.error && <Alert variant="warning" message={connection.error} />}

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            id="tab-all-repos"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Your Repositories
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 font-mono">
              {repositories.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('linked')}
            id="tab-linked-projects"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'linked'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Linked DevFlow Projects
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 font-mono">
              {linkedProjects.length}
            </span>
          </button>
        </div>

        {connection.isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRepositories}
            isLoading={loadingRepos}
            id="btn-refresh-repos"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        )}
      </div>

      {/* Tab 1: All Repositories */}
      {activeTab === 'all' && (
        <>
          {checkingAuth ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : !connection.isConnected ? (
            <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
                <GitHubIcon className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-slate-100">Connect to GitHub</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Authenticate securely via Appwrite OAuth to view your repositories, inspect recent commits, and link them to DevFlow projects.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="primary" onClick={handleConnect} id="btn-connect-cta">
                  <GitHubIcon className="w-4 h-4 mr-2" /> Connect with GitHub
                </Button>
                <Button variant="outline" onClick={() => setShowSetupGuide(true)}>
                  Configuration Guide
                </Button>
              </div>
            </div>
          ) : loadingRepos ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Spinner size="md" />
              <span>Fetching authorized repositories from GitHub API...</span>
            </div>
          ) : repositories.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No Repositories Found"
              description="No repositories were returned for your GitHub account. Check permissions or create a repository on GitHub."
            />
          ) : (
            <div className="space-y-3">
              {repositories.map((repo) => {
                const linkedProject = projects.find((p) => p.githubRepo === repo.fullName);
                const isExpanded = expandedRepo === repo.fullName;
                const commits = repoCommits[repo.fullName] || [];
                const prs = repoPRs[repo.fullName] || [];

                return (
                  <div
                    key={repo.id}
                    id={`repo-${repo.id}`}
                    className="glass-card rounded-xl border border-slate-800/80 p-5 space-y-3 transition-colors hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5"
                          >
                            <span>{repo.fullName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>

                          <Badge variant={repo.isPrivate ? 'default' : 'cyan'}>
                            {repo.isPrivate ? (
                              <span className="flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" /> Public
                              </span>
                            )}
                          </Badge>

                          {linkedProject && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Linked to: <strong>{linkedProject.name}</strong>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {repo.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                            {repo.defaultBranch}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            {repo.stars}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="w-3.5 h-3.5 text-slate-500" />
                            {repo.forks}
                          </span>
                          <span className="text-slate-500">{repo.language}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:self-center">
                        {linkedProject ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlink(linkedProject.$id)}
                            className="text-rose-400 hover:text-rose-300 hover:border-rose-700"
                            id={`btn-unlink-${repo.id}`}
                          >
                            <Unlink className="w-3.5 h-3.5 mr-1" /> Unlink
                          </Button>
                        ) : linkingRepo === repo.fullName ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedProjectId}
                              onChange={(e) => setSelectedProjectId(e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">Select project...</option>
                              {projects
                                .filter((p) => !p.githubRepo)
                                .map((p) => (
                                  <option key={p.$id} value={p.$id}>
                                    {p.name}
                                  </option>
                                ))}
                            </select>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleLink(repo.fullName)}
                              isLoading={isLinking}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLinkingRepo(null);
                                setSelectedProjectId('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLinkingRepo(repo.fullName);
                              setSelectedProjectId(projects.find((p) => !p.githubRepo)?.$id || '');
                            }}
                            id={`btn-link-${repo.id}`}
                          >
                            <Link2 className="w-3.5 h-3.5 mr-1" /> Link to Project
                          </Button>
                        )}

                        <button
                          onClick={() => toggleExpand(repo.fullName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse activity' : 'View commits and PRs'}
                          id={`btn-expand-${repo.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Activity Details: Commits & PRs */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800/60 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Recent Commits */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                            Recent Commits
                          </h4>
                          {loadingDetails && commits.length === 0 ? (
                            <div className="py-4 flex justify-center text-xs text-slate-500">
                              <Spinner size="sm" />
                            </div>
                          ) : commits.length === 0 ? (
                            <p className="text-xs text-slate-500">No commits found.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {commits.map((c) => (
                                <div
                                  key={c.fullSha}
                                  className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-200 truncate">{c.message}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {c.authorName} &bull;{' '}
                                      {c.date ? new Date(c.date).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[10px] text-indigo-400 hover:underline shrink-0 bg-slate-800 px-1.5 py-0.5 rounded"
                                  >
                                    {c.sha}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Pull Requests */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                            Recent Pull Requests
                          </h4>
                          {loadingDetails && prs.length === 0 ? (
                            <div className="py-4 flex justify-center text-xs text-slate-500">
                              <Spinner size="sm" />
                            </div>
                          ) : prs.length === 0 ? (
                            <p className="text-xs text-slate-500">No pull requests found.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {prs.map((pr) => (
                                <div
                                  key={pr.id}
                                  className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                                          pr.state === 'open'
                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                                        }`}
                                      >
                                        {pr.state}
                                      </span>
                                      <p className="font-medium text-slate-200 truncate">{pr.title}</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      #{pr.number} by {pr.author} &bull;{' '}
                                      {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                  <a
                                    href={pr.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 hover:text-slate-200 shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Linked DevFlow Projects */}
      {activeTab === 'linked' && (
        <>
          {linkedProjects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="No Projects Linked to GitHub"
              description="Link a GitHub repository to a project to monitor code activity directly alongside your tasks."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedProjects.map((project) => (
                <div
                  key={project.$id}
                  className="glass-card rounded-xl border border-slate-800 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{project.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{project.description}</p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'success' : 'default'}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitHubIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-mono text-cyan-300 truncate">
                        {project.githubRepo}
                      </span>
                    </div>
                    <a
                      href={`https://github.com/${project.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-200"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-slate-800/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(project.$id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-slate-800 text-xs"
                    >
                      <Unlink className="w-3 h-3 mr-1" /> Unlink Project
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-700/80 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GitHubIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">Configuring GitHub OAuth in Appwrite</h3>
              </div>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                To enable one-click GitHub login and OAuth session creation in DevFlow:
              </p>

              <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                <li>
                  Go to <strong>GitHub Developer Settings</strong> &rarr; <strong>OAuth Apps</strong> &rarr; <strong>New OAuth App</strong>.
                </li>
                <li>
                  Set <strong>Application Name</strong> to <code>DevFlow</code>.
                </li>
                <li>
                  Set <strong>Homepage URL</strong> to your DevFlow app URL (e.g. <code>http://localhost:5173</code>).
                </li>
                <li>
                  Set <strong>Authorization callback URL</strong> to your Appwrite OAuth endpoint:
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[11px] text-cyan-300 mt-1 select-all">
                    https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/github/&#123;YOUR_PROJECT_ID&#125;
                  </div>
                </li>
                <li>
                  Copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong> from GitHub.
                </li>
                <li>
                  In <strong>Appwrite Console</strong>, navigate to <strong>Auth</strong> &rarr; <strong>Settings</strong> &rarr; <strong>OAuth2 Providers</strong> &rarr; <strong>GitHub</strong>.
                </li>
                <li>
                  Paste your <strong>Client ID</strong> and <strong>Client Secret</strong>, toggle it <strong>ON</strong>, and click <strong>Save</strong>.
                </li>
              </ol>

              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-200">
                <strong>Security:</strong> The client secret remains safely stored on Appwrite Server and is never bundled in frontend code or client-side storage.
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="primary" size="sm" onClick={() => setShowSetupGuide(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
