import React from 'react';
import { Modal } from '../common/Modal';
import { Database, Key, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function SetupGuideModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  const envSnippet = `VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here
VITE_APPWRITE_DATABASE_ID=devflow_db
VITE_APPWRITE_TABLE_PROJECTS=projects
VITE_APPWRITE_TABLE_TASKS=tasks
VITE_APPWRITE_TABLE_AUTOMATION_RULES=automation_rules
VITE_APPWRITE_TABLE_ACTIVITY_LOGS=activity_logs
VITE_APPWRITE_TABLE_NOTIFICATIONS=notifications`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appwrite Backend Configuration Guide" maxWidth="max-w-2xl">
      <div className="space-y-5 text-sm text-slate-300 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <h4 className="flex items-center gap-2 font-medium text-slate-100 text-sm mb-2">
            <Key className="w-4 h-4 text-indigo-400" /> 1. Create Project in Appwrite Console
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 ml-1">
            <li>Go to <a href="https://cloud.appwrite.io" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Appwrite Cloud</a> (or your self-hosted console).</li>
            <li>Create a new project named <strong>DevFlow</strong>.</li>
            <li>Under <strong>Settings</strong> &gt; <strong>Integrations</strong>, add a <strong>Web App</strong> platform with hostname: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">localhost</code>.</li>
            <li>Copy your <strong>Project ID</strong>.</li>
          </ol>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-medium text-slate-100 text-sm mb-2">
            <Database className="w-4 h-4 text-cyan-400" /> 2. Automatic Idempotent Schema Setup
          </h4>
          <p className="text-xs text-slate-300 mb-2">
            DevFlow includes an automated schema script. Generate an API Key in Appwrite Console (&gt; Project Settings &gt; View API Keys) with permissions for <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">databases.write</code>, <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">collections.write</code>, and <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">attributes.write</code>, then run in terminal:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
            <span>node scripts/setup-appwrite-schema.js</span>
            <Terminal className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Or create the 5 collections manually as specified in <code className="text-slate-300">DATABASE_SCHEMA.md</code>.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="flex items-center gap-2 font-medium text-slate-100 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 3. Set Environment Variables in .env
            </h4>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Template'}
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            {envSnippet}
          </pre>
          <p className="text-xs text-amber-300/90 mt-2 bg-amber-950/40 p-2.5 rounded border border-amber-800/40">
            <strong>Security Rule:</strong> Never put server API keys in your <code className="font-mono text-amber-200">.env</code> with <code className="font-mono text-amber-200">VITE_</code> prefixes. The frontend operates solely via authenticated client sessions and row-level permissions.
          </p>
        </div>
      </div>
    </Modal>
  );
}
