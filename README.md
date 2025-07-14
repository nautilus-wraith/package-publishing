# Package Publishing Workflows

This repository contains reusable GitHub Actions workflows for publishing packages to various package registries with built-in typosquatting protection.

## Available Workflows

- [NPM Package Publishing](.github/workflows/publish-npm.yml)
- [PyPI Package Publishing](.github/workflows/publish-pypi.yml)
- [Cargo Package Publishing](.github/workflows/publish-cargo.yml)
- [Go Package Publishing](.github/workflows/publish-go.yml)

## Shared Verification Workflow

All package publishing workflows use a shared verification workflow ([verify-release.yml](.github/workflows/verify-release.yml)) that provides:

- **Tag Signature Verification**: Ensures release tags are signed with valid GPG keys
- **Multi-Tier Approval System**: Validates signed approvals from three different tiers
- **Consistent Security**: Same verification process across all package types

Each package publishing workflow then handles its own package-specific validation:
- **Package Configuration**: Validates package.json, pyproject.toml, Cargo.toml, go.mod
- **Typosquatting Protection**: Detects potential typosquatting attempts for each package type
- **Dependency Validation**: Checks dependencies and security vulnerabilities

## Usage

### NPM Package Publishing

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

### PyPI Package Publishing

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
```

### Cargo Package Publishing

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

### Go Package Publishing

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
    secrets:
      GOPROXY_TOKEN: ${{ secrets.GOPROXY_TOKEN }}
```

## Features

All workflows include:

1. **Package Validation**
   - Checks for required fields in package configuration files
   - Validates package structure and dependencies

2. **Typosquatting Protection**
   - Checks for similar package names that could be used for typosquatting
   - Common patterns checked:
     - Hyphen/underscore variations
     - Language-specific prefixes/suffixes
     - Common character substitutions (e.g., a->4, e->3)
   - Warns about potential typosquatters in the workflow logs

3. **Multi-Tier Approval System**
   - Requires signed commit approvals from three different tiers
   - Each tier must have at least one approval before publishing
   - All approvals must be signed with valid GPG keys
   - Approval files are protected by CODEOWNERS

4. **Package Publishing**
   - Builds and tests the package
   - Publishes to the respective registry
   - Supports package provenance where available

5. **Security Requirements**
   - All workflows require signed tags for releases
   - Tags must point to commits on the main branch
   - Package provenance is enabled by default where supported

## Multi-Tier Approval System

The package publishing workflows include a comprehensive approval system that requires signed commits from three different approval tiers before a package can be published.

### Approval Tiers

1. **First Tier (Developers)** - `.github/approvers/first`
   - Contains usernames of developers authorized to approve releases
   - Example: `dev1`, `dev2`, `developer123`

2. **Second Tier (Senior Developers/Tech Leads)** - `.github/approvers/second`
   - Contains usernames of senior developers and technical leads
   - Example: `senior1`, `techlead1`, `architect1`

3. **Security Tier (AppSec)** - `.github/approvers/appsec`
   - Contains usernames of security team members
   - Example: `rkgh4096`, `security1`, `appsec-team`

### How Approval Works

1. **Release Directory Structure**
   - For each release tag (e.g., `v1.0.0`), create a directory: `.github/releases/1.0.0/`
   - Inside this directory, create files named after the approving usernames
   - Example: `.github/releases/1.0.0/rkgh4096` (file content doesn't matter)

2. **Signed Commit Requirements**
   - Each approval file must be committed with a signed commit
   - The commit must be signed by the same user whose username matches the file name
   - The workflow validates the GPG signature and verifies the signer matches the username

3. **Approval Validation Process**
   - The workflow checks that approval files exist for the release tag in the main branch
   - Validates that each approval file was committed with a valid signed commit
   - Verifies the signer matches the username in the file name
   - Confirms each approving user is listed in the appropriate approver tier file (from main branch)
   - Ensures at least one approval from each tier (first, second, appsec)
   - **Validates unique usernames**: Each approval file must have a unique username (no duplicates)
   - **Requires 3 different people**: Each tier must be approved by a different person
   - **Validates commit SHA**: Each approval file must contain exactly the SHA of the commit that the release tag points to on the first non-comment line

4. **Example Approval Flow**
   ```
   Release: v1.0.0
   Required files:
   - .github/releases/1.0.0/dev1 (signed by dev1)
   - .github/releases/1.0.0/senior1 (signed by senior1)  
   - .github/releases/1.0.0/rkgh4096 (signed by rkgh4096)
   ```
   
   **Important**: Each file must have a unique username, and each tier must be approved by a different person.

### Setting Up Approval Files

1. **Create Approver Lists**
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

2. **Create Release Approval Directory**
   ```bash
   # For release v1.0.0
   mkdir -p .github/releases/1.0.0
   
   # Get the commit SHA that the tag will point to
   TAG_COMMIT_SHA=$(git rev-parse HEAD)
   echo "Tag will point to commit: $TAG_COMMIT_SHA"
   
   # Create approval files with just the commit SHA
   # IMPORTANT: Each file must have a unique username and contain only the commit SHA
   echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/dev1
   echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/senior1
   echo "$TAG_COMMIT_SHA" > .github/releases/1.0.0/rkgh4096
   ```
   
   **Approval File Format**:
   - The first non-comment line must contain exactly the commit SHA
   - Comment lines (starting with `#`) are allowed and ignored
   - No additional text is allowed on the same line as the SHA
   - Whitespace around the SHA is automatically trimmed
   
   **Example valid approval files**:
   ```bash
   # This is a comment
   abc123def456...
   
   # Another valid format
   abc123def456...
   ```
   
   **Validation Rules**:
   - ✅ Each file must have a unique username (no duplicates)
   - ✅ Each tier must be approved by a different person
   - ✅ Each file must be committed with a signed commit by the respective user
   - ✅ Each approval file must contain exactly the SHA of the commit that the release tag points to on the first non-comment line
   - ✅ Approvals are validated against the main branch (not the tagged commit)
   - ✅ Comment lines (starting with #) are allowed and ignored

3. **Commit with Signed Commits**
   ```bash
   # Each file must be committed with a signed commit by the respective user
   git add .github/releases/1.0.0/
   git commit -S -m "Add release approvals for v1.0.0"
   git push origin main
   ```

### Protection with CODEOWNERS

The approval files are protected using GitHub's CODEOWNERS feature:

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

1. **`package-approval`** - Used when the unscoped package name is already taken
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

- NPM: `NPM_TOKEN`
- PyPI: `PYPI_TOKEN`
- Cargo: `CARGO_TOKEN`
- Go: `GOPROXY_TOKEN`

## Setting Up Signed Tags

To use these workflows, you must set up GPG signing for your repository. Here's how:

1. **Generate a GPG Key** (if you don't have one):
   ```bash
   # Generate a new GPG key
   gpg --full-generate-key

   # Follow the prompts to create your key
   # Recommended: RSA and RSA, 4096 bits, 0 = key does not expire
   ```

2. **Export Your Public Key**:
   ```bash
   # Replace with your email
   gpg --armor --export your-email@example.com
   ```

3. **Add GPG Key to GitHub**:
   - Go to GitHub Settings → SSH and GPG keys
   - Click "New GPG key"
   - Paste your exported public key

4. **Configure Git to Use Your Key**:
   ```bash
   # Get your key ID
   gpg --list-secret-keys --keyid-format LONG

   # Configure Git to use your key
   git config --global user.signingkey YOUR_KEY_ID
   ```

5. **Enable Branch Protection**:
   - Go to your repository settings
   - Navigate to Branches → Branch protection rules
   - Add a rule for the `main` branch
   - Enable "Require signed commits"
   - Enable "Require signed tags"

6. **Creating Signed Tags**:
   ```bash
   # Create a signed tag
   git tag -s v1.0.0 -m "Release v1.0.0"

   # Push the tag
   git push origin v1.0.0
   ```

7. **Creating GitHub Releases**:
   - Go to your repository's Releases page
   - Click "Create a new release"
   - Choose the signed tag you just pushed
   - Fill in release notes
   - Publish the release

8. **Setting Up Release Approvals**:
   - Create the release approval directory: `.github/releases/1.0.0/` (replace with your version)
   - Add approval files for each tier (see Multi-Tier Approval System section)
   - Ensure each approval file is committed with a signed commit by the respective user
   - Push the approval files to the main branch

The workflow will automatically:
- Verify the tag signature and ensure it points to a commit on the main branch
- Validate that all required approval tiers have signed approvals from the main branch
- Check that approval files were committed with valid GPG signatures
- Verify that each approval file contains exactly the SHA of the commit that the release tag points to on the first non-comment line
- Proceed with package publication only after all validations pass

**What happens if validation fails**:
- If an approval file doesn't contain the exact SHA, the workflow will fail with a detailed error message
- If the SHA in the approval file doesn't match the tag's commit, the workflow will fail
- If approval files or approver lists have changed between approval and release, the workflow will fail
- This ensures that approvals are tied to specific commits and cannot be bypassed


