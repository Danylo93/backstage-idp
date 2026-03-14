import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function runGit(args, options = {}) {
  const gitArgs = options.authHeader
    ? ['-c', `http.extraHeader=${options.authHeader}`, ...args]
    : args;

  return execFileSync('git', gitArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function ensureRequired(value, name) {
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }

  return value;
}

const args = parseArgs(process.argv.slice(2));

const repoUrl = ensureRequired(args['repo-url'], 'repo-url');
const valuesPath = ensureRequired(args['values-path'], 'values-path');
const imageTag = ensureRequired(args['image-tag'], 'image-tag');
const branch = args.branch || 'main';
const gitAuthorName = args['git-author-name'] || 'SHIELD Platform CI';
const gitAuthorEmail =
  args['git-author-email'] || 'shield-platform@useargo.com';
const commitMessage =
  args['commit-message'] || `chore(gitops): deploy ${valuesPath} -> ${imageTag}`;
const imageRepository = args['image-repository'];
const token =
  args.token || process.env.AZURE_DEVOPS_GITOPS_PAT || process.env.AZURE_DEVOPS_PAT;

if (!token) {
  throw new Error(
    'Set AZURE_DEVOPS_GITOPS_PAT or AZURE_DEVOPS_PAT before running the GitOps deploy script.',
  );
}

const worktreePath = mkdtempSync(resolve(tmpdir(), 'shield-platform-gitops-'));
const repoName = repoUrl.split('/').pop() || 'argo-gitops';
const repoPath = resolve(worktreePath, repoName);
const authHeader = `AUTHORIZATION: Basic ${Buffer.from(`:${token}`).toString('base64')}`;

try {
  runGit(
    ['clone', '--branch', branch, '--single-branch', repoUrl, repoPath],
    { authHeader },
  );

  const absoluteValuesPath = resolve(repoPath, valuesPath);
  mkdirSync(dirname(absoluteValuesPath), { recursive: true });

  const currentDocument = existsSync(absoluteValuesPath)
    ? YAML.parse(readFileSync(absoluteValuesPath, 'utf8')) ?? {}
    : {};
  const nextDocument = {
    ...currentDocument,
    image: {
      ...(currentDocument.image ?? {}),
      ...(imageRepository ? { repository: imageRepository } : {}),
      tag: imageTag,
    },
  };
  const currentYaml = YAML.stringify(currentDocument);
  const nextYaml = YAML.stringify(nextDocument);

  if (currentYaml === nextYaml) {
    console.log(`No GitOps change detected for ${valuesPath}.`);
    process.exit(0);
  }

  writeFileSync(absoluteValuesPath, nextYaml, 'utf8');
  runGit(['config', 'user.name', gitAuthorName], { cwd: repoPath });
  runGit(['config', 'user.email', gitAuthorEmail], { cwd: repoPath });
  runGit(['add', valuesPath], { cwd: repoPath });
  runGit(['commit', '-m', commitMessage], { cwd: repoPath });
  runGit(['push', 'origin', branch], {
    cwd: repoPath,
    authHeader,
  });

  console.log(`Updated ${valuesPath} with image tag ${imageTag}.`);
} finally {
  rmSync(worktreePath, { recursive: true, force: true });
}
