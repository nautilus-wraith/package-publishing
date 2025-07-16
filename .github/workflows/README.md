# Publishing Workflows

This directory contains reusable GitHub Actions workflows for publishing packages to various package registries with built-in security features and standardized release verification.

## Overview

All workflows follow a consistent architecture:
1. **Shared Release Verification** - Validates signed tags and multi-tier approvals
2. **Package Validation** - Checks package configuration and metadata
3. **Security Scanning** - Runs typosquatting checks and security audits
4. **Ownership Verification** - Validates package ownership before publishing
5. **Registry Publishing** - Publishes to the target registry

## Available Workflows

| Workflow | Package Type | Default Registry | Required Secrets | Optional Secrets |
|----------|--------------|------------------|------------------|------------------|
| `publish-npm.yml` | NPM | npmjs.org | `NPM_TOKEN` | - |
| `publish-pypi.yml` | Python | pypi.org | `PYPI_TOKEN` | `TEST_PYPI_TOKEN` |
| `publish-cargo.yml` | Rust | crates.io | `CARGO_TOKEN` | - |
| `publish-go.yml` | Go | pkg.go.dev | `GOPROXY_TOKEN` | - |

## Workflow Inputs

### NPM Package Publishing

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `node_version` | string | `20.x` | Node.js version to use |
| `registry_url` | string | `https://registry.npmjs.org` | NPM registry URL |
| `package_access` | string | `public` | Publish as public or private (must be either `public` or `private`) |
| `enable_provenance` | boolean | `true` | Enable package provenance |

### PyPI Package Publishing

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `python_version` | string | `3.11` | Python version to use |
| `registry_url` | string | `https://pypi.org` | PyPI registry URL |
| `enable_provenance` | boolean | `true` | Enable package provenance |

### Cargo Package Publishing

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `rust_version` | string | `stable` | Rust version to use |
| `registry_url` | string | `https://crates.io` | Cargo registry URL |

### Go Package Publishing

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `go_version` | string | `1.22` | Go version to use |
| `registry_url` | string | `https://pkg.go.dev` | Go registry URL |
| `tag` | string | (release tag) | Tag to use for publishing (defaults to release tag) |

## Security Features

All workflows include comprehensive security features:

### 1. **Shared Release Verification**
- **Tag Signature Verification**: Ensures release tags are signed with valid GPG keys
- **Multi-Tier Approval System**: Validates signed approvals from three different tiers
- **Consistent Security**: Same verification process across all package types

### 2. **Package Validation**
- **Configuration Validation**: Validates package.json, pyproject.toml, Cargo.toml, go.mod
- **Required Fields**: Checks for required metadata fields
- **Syntax Validation**: Validates configuration file syntax

### 3. **Typosquatting Protection**
- **Language-Specific Patterns**: Detects typosquatting attempts using registry-specific patterns
- **Common Variations**: Checks hyphen/underscore conversions and character substitutions

### 4. **Security Audits**
- **NPM**: `npm audit --production`
- **PyPI**: Dependency scanning during installation
- **Cargo**: `cargo audit --deny warnings`
- **Go**: `govulncheck` (when available)

### 5. **Ownership Verification**
- **NPM**: Manual approval for taken package names
- **PyPI**: TestPyPI upload test for ownership validation
- **Cargo**: Dry-run publish test for ownership verification
- **Go**: Module download test for access validation

## Custom Registry Support

All workflows support custom registries:

```yaml
jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-cargo.yml@release-stable
    with:
      registry_url: 'https://your-custom-registry.com'
    secrets:
      CARGO_TOKEN: ${{ secrets.CARGO_TOKEN }}
```

**Features:**
- **URL Validation**: Validates registry URL format
- **Dynamic Configuration**: Automatically configures tools for custom registries
- **Ownership Handling**: Appropriate ownership validation for custom registries

## Multi-Package Support (Monorepos)

For monorepos with multiple packages, use matrix strategy:

```yaml
name: Publish All Packages

on:
  release:
    types: [published]

jobs:
  publish:
    strategy:
      matrix:
        package:
          - path: "./packages/npm-package"
            workflow: "publish-npm.yml"
            registry: "npm"
          - path: "./packages/python-package"
            workflow: "publish-pypi.yml"
            registry: "pypi"
          - path: "./packages/rust-package"
            workflow: "publish-cargo.yml"
            registry: "cargo"
    
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Publish ${{ matrix.package.registry }} package
        uses: ./.github/workflows/${{ matrix.package.workflow }}
        with:
          working-directory: ${{ matrix.package.path }}
        secrets:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
``` 