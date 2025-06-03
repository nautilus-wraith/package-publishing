# Package Publishing Workflows

This repository contains reusable GitHub Actions workflows for publishing packages to various package registries with built-in typosquatting protection.

## Available Workflows

- [NPM Package Publishing](.github/workflows/publish-npm.yml)
- [PyPI Package Publishing](.github/workflows/publish-pypi.yml)
- [Cargo Package Publishing](.github/workflows/publish-cargo.yml)
- [Go Package Publishing](.github/workflows/publish-go.yml)

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

3. **Package Publishing**
   - Builds and tests the package
   - Publishes to the respective registry
   - Supports package provenance where available

4. **Security Requirements**
   - All workflows require signed tags for releases
   - Tags must point to commits on the main branch
   - Package provenance is enabled by default where supported

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

The workflow will automatically verify the tag signature and ensure it points to a commit on the main branch before proceeding with the package publication.


