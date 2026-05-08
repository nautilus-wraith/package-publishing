# Package Publishing Workflows

This repository contains reusable GitHub Actions workflows for publishing packages to common registries with standardized release verification and built-in typosquatting protections.
It documents the shared verification architecture, package-specific publishing workflows (NPM, PyPI, Cargo, and Go), security controls, multi-tier approvals, and required GitHub setup to run secure release pipelines end to end.

## Index of Content

- [Architecture Overview & Benefits](#architecture-overview--benefits)
- [Available Workflows](#available-workflows)
- [How It Works](#how-it-works)
- [Workflow Usage by Package Type](#workflow-usage-by-package-type)
  - [NPM workflow usage](#npm-workflow-usage)
  - [PyPI workflow usage](#pypi-workflow-usage)
  - [Cargo workflow usage](#cargo-workflow-usage)
  - [Go workflow usage](#go-workflow-usage)
- [Multi-Tier Approval System](#multi-tier-approval-system)
- [GitHub Environment Setup](#github-environment-setup)
- [Required Secrets](#required-secrets)
- [Setting Up Signed Tags](#setting-up-signed-tags)

## Architecture Overview & Benefits

This package publishing system uses a **two-tier architecture** designed for consistency, reusability, and secure package releases across ecosystems.

- **Tier 1: Shared Verification Workflow** (`[verify-release.yml](.github/workflows/verify-release.yml)`)
  - **Standardized Security Gate**: Provides one reusable verification layer for all package workflows.
  - **Tag Signature Verification**: Ensures release tags are signed with valid GPG keys.
  - **Multi-Tier Approval System**: Enforces signed approvals from three different approval tiers.
  - **Consistent Validation Logic**: Applies the same release-security checks across ecosystems.
  - **Package-Agnostic Design**: Keeps verification reusable by avoiding package-specific dependencies.
- **Tier 2: Individual Package Publishing Workflows** (NPM, PyPI, Cargo, Go)
  - **Verification Dependency**: Calls the shared verification workflow before any publish action.
  - **Package-Specific Validation**:
    - **NPM**: Validates `package.json` required fields (name, version, description, main, author, license)
    - **PyPI**: Validates `pyproject.toml` or `setup.py` required fields (name, version, description, authors, license)
    - **Cargo**: Validates `Cargo.toml` required fields (name, version, description, authors, license)
    - **Go**: Validates `go.mod` required declarations (module, go version)
  - **Typosquatting Protection**: Uses common checks (hyphen/underscore variants and character substitutions) plus ecosystem patterns (`-js`/`node-`, `-py`/`python-`, `-rs`/`rust-`, `-go`/`golang-`).
  - **Availability and Ownership Checks**: Verifies package or module availability and ownership before publication.
  - **Security and Integrity Checks**: Runs controls such as `npm audit --production`, Python dependency scanning, `cargo audit --deny warnings`, `govulncheck` (when available), and build/package verification commands.
  - **Approval Gates**: Applies manual approval for NPM name conflicts, ownership/access checks for PyPI/Cargo/Go, GitHub Environment protection, and mandatory pass of all checks.
  - **Publishing Controls**: Supports provenance where available, PyPI dual-registry publishing, NPM scoped/unscoped behavior, and tag-driven Go publishing.

This architecture delivers the main benefits of consistency, maintainability, reusability, clear separation of concerns between shared security and package logic, and flexibility for each ecosystem to apply its own validation rules.

## How It Works

### Step 1: Release Verification (Shared)

When a release is published, the individual package workflow first calls the shared verification workflow:

```yaml
# Example from publish-npm.yml
verify-release:
  uses: ./.github/workflows/verify-release.yml
```

The shared workflow validates:

- ✅ Tag is signed with a valid GPG key
- ✅ Tag points to a commit on the main branch
- ✅ All three approval tiers have signed approvals
- ✅ Approval files contain the correct commit SHA
- ✅ No duplicate approvers across tiers

### Step 2: Package-Specific Validation

After verification passes, the individual workflow handles package-specific tasks:

- **Package Configuration**: Validates package.json, pyproject.toml, Cargo.toml, go.mod
- **Typosquatting Protection**: Detects potential typosquatting attempts for that package type
- **Dependency Validation**: Checks dependencies and security vulnerabilities
- **Package Building**: Builds the package for distribution
- **Registry Publishing**: Publishes to the respective package registry

## Available Workflows

- [NPM Package Publishing](.github/workflows/publish-npm.yml)
- [PyPI Package Publishing](.github/workflows/publish-pypi.yml)
- [Cargo Package Publishing](.github/workflows/publish-cargo.yml)
- [Go Package Publishing](.github/workflows/publish-go.yml)

## Workflow Usage by Package Type

Each subsection below shows how to call the corresponding reusable workflow file and summarizes its key checks.

### NPM workflow usage

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@release-stable
    with:
      node_version: '20.x'  # Optional, defaults to '20.x'
      registry_url: 'https://registry.npmjs.org'  # Optional, defaults to 'https://registry.npmjs.org'
      package_access: 'public'  # Optional, defaults to 'public'
      enable_provenance: true  # Optional, defaults to true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Note**: The NPM workflow includes additional safety checks:

- **Package Name Availability**: If the unscoped package name is already taken on npmjs.org, the workflow will pause and require manual approval before proceeding
- **Scoped vs Unscoped Publishing**: The workflow will always publish the scoped version (e.g., `@your-org/package-name`), and if the unscoped name is available, it will also publish that version
- **Approval Required**: When the unscoped name is taken, you'll need to approve the deployment to continue with scoped-only publishing

### PyPI workflow usage

```yaml
name: Publish to PyPI

on:
  release:
    types: [published]

jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-pypi.yml@release-stable
    with:
      python_version: '3.11'  # Optional, defaults to '3.11'
      registry_url: 'https://pypi.org'  # Optional, defaults to 'https://pypi.org'
      enable_provenance: true  # Optional, defaults to true
    secrets:
      PYPI_TOKEN: ${{ secrets.PYPI_TOKEN }}
      TEST_PYPI_TOKEN: ${{ secrets.TEST_PYPI_TOKEN }}  # Optional, falls back to PYPI_TOKEN if not set
```

**Note**: The PyPI workflow includes comprehensive security features:

- **Package Ownership Validation**: Uses TestPyPI to verify package ownership before publishing
- **Dual-Registry Publishing**: Publishes to both TestPyPI and PyPI for testing and production
- **Automatic Conflict Resolution**: If package name is taken by another user, the workflow exits with clear error messages
- **Provenance Support**: Enables package provenance for enhanced security (when enabled)
- **Token Flexibility**: Supports separate TestPyPI and PyPI tokens, or uses the same token for both

### Cargo workflow usage

```yaml
name: Publish to crates.io

on:
  release:
    types: [published]

jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-cargo.yml@release-stable
    with:
      rust_version: 'stable'  # Optional, defaults to 'stable'
      registry_url: 'https://crates.io'  # Optional, defaults to 'https://crates.io'
    secrets:
      CARGO_TOKEN: ${{ secrets.CARGO_TOKEN }}
```

**Note**: The Cargo workflow includes comprehensive security features:

- **Package Ownership Validation**: Uses dry-run publish to verify package ownership before publishing (crates.io only)
- **Automatic Conflict Resolution**: If package name is taken by another user, the workflow exits with clear error messages
- **Enhanced Security Audits**: Runs `cargo audit --deny warnings` for Rust security vulnerabilities
- **Package Integrity Verification**: Validates package structure and dependencies
- **Clean Build Process**: Ensures fresh builds for each publish job
- **Custom Registry Support**: Supports publishing to custom Cargo registries with automatic configuration and URL validation
- **Build Caching**: Caches Cargo registry and target directories for faster builds

### Go workflow usage

```yaml
name: Publish to pkg.go.dev

on:
  release:
    types: [published]

jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-go.yml@release-stable
    with:
      go_version: '1.22'  # Optional, defaults to '1.22'
      registry_url: 'https://pkg.go.dev'  # Optional, defaults to 'https://pkg.go.dev'
      tag: 'v1.0.0'  # Optional, defaults to release tag
    secrets:
      GOPROXY_TOKEN: ${{ secrets.GOPROXY_TOKEN }}
```

**Note**: The Go workflow includes comprehensive security features:

- **Module Access Validation**: Tests module download access to verify ownership (pkg.go.dev only)
- **Automatic Conflict Resolution**: If module name is taken by another user, the workflow exits with clear error messages
- **Enhanced Security Audits**: Runs `govulncheck` for Go security vulnerabilities (when available)
- **Module Integrity Verification**: Validates go.mod, go.sum, and module dependencies
- **Clean Build Process**: Ensures fresh builds for each publish job
- **Custom Registry Support**: Supports publishing to custom Go registries with URL validation
- **Build Caching**: Caches Go modules and build artifacts for faster builds

## Multi-Tier Approval System

Publishing requires signed approvals from **three different people**, one for each approval tier. Follow the sections below in order: understand the files, create them, verify format and rules, then lock them down with `CODEOWNERS`.

### 1) Approval tiers and required files

**What to do:** Maintain three approver list files under `.github/approvers/`. Each file lists GitHub **usernames** (one per line) who are allowed to sign approvals for that tier. When you cut a release, you will add one approval file per person under `.github/releases/<version>/`, where `<version>` is the release tag **without** the leading `v` (for example tag `v1.0.0` → folder `.github/releases/1.0.0/`). Each approval file is named exactly after the approver’s username and must eventually contain the commit SHA the release tag points to.

The three tiers and their files:

- **First tier (Developers)**: `.github/approvers/first`
  - Developers authorized to approve releases for this tier.
  - Example usernames: `dev1`, `dev2`, `developer123`
- **Second tier (Senior Developers / Tech Leads)**: `.github/approvers/second`
  - Senior developers and technical leads for this tier.
  - Example usernames: `senior1`, `techlead1`, `architect1`
- **Security tier (AppSec)**: `.github/approvers/appsec`
  - Security team members for this tier.
  - Example usernames: `rkgh4096`, `security1`, `appsec-team`

You need **at least one approval file** in the release folder whose signer belongs to each tier, with **three distinct people** total (see section 3 for validation details).

### 2) Setup checklist (recommended order)

**What to do:** (1) Create the tier lists if they do not exist yet. (2) For the release, create the versioned folder, write one file per approver with the tag’s commit SHA. (3) Commit using **signed** commits so the workflow can verify each signer.

**Step 2.1 — Create and populate approver tier files**

Add one GitHub username per line to each tier file. These lists live on `main` and define who may approve for each tier.

```bash
# Add developers to first tier
echo "dev1" >> .github/approvers/first
echo "dev2" >> .github/approvers/first

# Add senior developers to second tier
echo "senior1" >> .github/approvers/second
echo "techlead1" >> .github/approvers/second

# Add security team to appsec tier
echo "rkgh4096" >> .github/approvers/appsec
echo "security1" >> .github/approvers/appsec
```

**Step 2.2 — Create release approval files**

Create `.github/releases/<version>/` using the tag without `v`. Resolve the commit SHA that the release tag will point to (often `HEAD` on `main` at release time). Create **one file per approver**, filename = username, body = that SHA only on the first meaningful line (comments allowed above; see section 3).

```bash
# For release v1.0.0 (directory name uses the tag without the "v" prefix)
mkdir -p .github/releases/1.0.0

# Commit SHA the release tag will point to
TAG_COMMIT_SHA=$(git rev-parse HEAD)
echo "Tag will point to commit: $TAG_COMMIT_SHA"

# One file per approver; content is the commit SHA
echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/dev1
echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/senior1
echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/rkgh4096
```

**Step 2.3 — Commit with signed commits**

Each approval file must land on `main` in a commit **signed by the same user** as the filename (the workflow checks GPG signature vs username). In practice you may add files in separate signed commits per approver, or follow your team’s process as long as the history satisfies the verifier.

```bash
git add .github/releases/1.0.0/
git commit -S -m "Add release approvals for v1.0.0"
git push origin main
```

### 3) Approval file format and validation rules

**Part 3.A — File format**

**What to do:** Each approval file must expose exactly one commit SHA for the workflow to read: put it on the **first non-comment line**. Optional comment lines start with `#`. Do not put extra text on the SHA line; surrounding whitespace on that line is trimmed.

Rules in short:

- **First non-comment line**: Exactly the commit SHA the release tag points to
- **Comments**: Lines starting with `#` are ignored
- **SHA line**: No additional text on the same line as the SHA
- **Whitespace**: Trimmed around the SHA

Example:

```bash
# Approval for release v1.0.0
abc123def456...
```

**Part 3.B — What the workflow validates**

**What it checks:** The verifier reads approver lists and release approval files from `main`. It confirms the release directory exists for that version, each approval file has a valid **signed** commit, the **signer matches the filename**, each signer appears in the correct **tier file**, there is coverage across **first**, **second**, and **appsec**, filenames are **unique**, the three approvals are from **three different people**, and each file’s SHA matches the commit the **release tag** references.

Checklist:

- ✅ Approval files exist under `.github/releases/<version>/` on `main`
- ✅ Each approval file was introduced with a valid signed commit
- ✅ Commit signer matches the approval filename (GitHub username)
- ✅ Each signer is listed in the matching tier file on `main`
- ✅ At least one approval from each tier (first, second, appsec)
- ✅ Unique usernames across approval files (no duplicate filenames)
- ✅ Three distinct people across the three tiers
- ✅ SHA on the first non-comment line matches the tagged release commit
- ✅ Approver lists and approvals are evaluated using `main` (not only the tagged commit)

**Example layout** for tag `v1.0.0` (each file signed by the matching user):

```text
Release: v1.0.0
Required files:
- .github/releases/1.0.0/dev1 (signed by dev1)
- .github/releases/1.0.0/senior1 (signed by senior1)
- .github/releases/1.0.0/rkgh4096 (signed by rkgh4096)
```

### 4) Protect approval configuration with CODEOWNERS

**What to do:** Add rules so only trusted owners (for example AppSec) must review changes to `.github/approvers/*` and `.github/releases/*`. That reduces risk of someone rewriting approver lists or forging approval paths without review.

Example `CODEOWNERS` entries:

```gitignore
# Approval tier files - protected by security team
/.github/approvers/first @rkgh4096 @security1 @appsec-team
/.github/approvers/second @rkgh4096 @security1 @appsec-team  
/.github/approvers/appsec @rkgh4096 @security1 @appsec-team

# Release approval files - protected by security team
/.github/releases/ @rkgh4096 @security1 @appsec-team
```

This ensures that only authorized security team members can modify the approval configuration.

## GitHub Environment Setup

The NPM workflow uses GitHub Environments for additional approval gates. You must configure these environments in your repository settings:

### Required Environments

1. **`package-approval`** — Used when the unscoped package name is already taken
  - **Purpose**: Requires manual approval before proceeding with scoped-only publishing
  - **When triggered**: When `npm view <package-name>` returns a result (package exists)
  - **URL**: Links to the npm package page for review
  - **Manual approval required**: Yes - this environment will pause the workflow and wait for approval

**Note**: The workflow also references an `npm-publish` environment in the publish job, but this is for tracking purposes only and does not require manual approval. The actual approval gates are the signed commit approvals and the package-approval environment.

### Setting Up Environments

1. **Go to Repository Settings**:
  - Navigate to your repository on GitHub
  - Go to Settings → Environments
2. **Create `package-approval` Environment**:
  - Click "New environment"
  - Name: `package-approval`
  - Description: "Approval required when unscoped package name is taken"
  - URL: `https://www.npmjs.com/package/[your-package-name]`
  - **Protection rules** (recommended):
    - ✅ "Required reviewers" - Add team members who can approve package name conflicts
    - ✅ "Wait timer" - Set to 0 minutes (immediate approval)
    - ✅ "Deployment branches" - Restrict to `main` branch only

**Note**: The `npm-publish` environment referenced in the workflow is optional and used for tracking purposes only. It does not require manual approval setup.

### Environment Reviewers

**For `package-approval`**:

- Add team members who can assess package name conflicts
- Typically includes: tech leads, architects, security team

### Example Environment Configuration

```yaml
# package-approval environment
name: package-approval
url: https://www.npmjs.com/package/your-package-name
protection_rules:
  - required_reviewers: [tech-lead-team, security-team]
  - wait_timer: 0
  - deployment_branches: [main]
```

## Required Secrets

Each workflow requires specific secrets to be set in your repository:

- **NPM**: `NPM_TOKEN`
- **PyPI**: `PYPI_TOKEN` (required), `TEST_PYPI_TOKEN` (optional, falls back to PYPI_TOKEN)
- **Cargo**: `CARGO_TOKEN`
- **Go**: `GOPROXY_TOKEN`

**Note**: For PyPI, you can use the same token for both TestPyPI and PyPI, or set separate tokens for each registry. If `TEST_PYPI_TOKEN` is not provided, the workflow will use `PYPI_TOKEN` for both registries.

## Setting Up Signed Tags

These workflows expect **signed Git tags** on releases. Approval commits must also be signed; that process lives in **[Multi-Tier Approval System](#multi-tier-approval-system)**—this section covers **GPG + tag + GitHub Release** only. What runs before any package job starts is described in **[How It Works](#how-it-works)** (Step 1) and implemented in [`verify-release.yml`](.github/workflows/verify-release.yml); failed checks are easiest to debug from that workflow’s job logs.

### 1) Configure GPG signing

1. **Create a GPG key** (skip if you already have one):

```bash
gpg --full-generate-key
# Typical choice: RSA, 4096-bit; expiry per org policy
```

2. **Export your public key**, then add it under your GitHub account (**Settings → SSH and GPG keys → New GPG key**):

```bash
gpg --armor --export your-email@example.com
```

3. **Tell Git which key to sign with** (key ID from `gpg --list-secret-keys --keyid-format LONG`):

```bash
git config --global user.signingkey YOUR_KEY_ID
```

(Optional: `git config --global commit.gpgsign true` if you want every commit signed by default.)

### 2) Enable Branch Protection

On the repository where you publish from, protect the branch releases are tied to (usually `main`):

1. Go to the repository’s **Settings**.
2. Open **Branches**.
3. Under **Branch protection rules**, click **Add branch protection rule** (or edit the existing rule for `main`).
4. For **Branch name pattern**, enter `main` (or your release branch).
5. Enable **Require signed commits**.
6. Enable **Require signed tags**.

Save the rule. Together with signed tags and approval commits, this keeps release-related history consistent with what `verify-release.yml` expects.

### 3) Create and publish the release

1. Tag the release commit and push:

```bash
git tag -s v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

2. On GitHub: **Releases → Create a new release**, select that tag, add notes, and **Publish**. The publish workflows run on `release: types: [published]`.

### 4) Approvals

Add signed approval files on `main` as described in **[Multi-Tier Approval System](#multi-tier-approval-system)** (correct `.github/releases/<version>/` paths and SHAs). Order relative to tagging can follow your team process as long as approvals are valid when the workflow runs.
