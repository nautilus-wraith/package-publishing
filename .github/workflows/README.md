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

## Common Inputs

All workflows support these common inputs:

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `registry_url` | string | Registry-specific | Custom registry URL |
| `enable_typosquatting_check` | boolean | `true` | Enable typosquatting detection |
| `enable_security_audit` | boolean | `true` | Enable security vulnerability scanning |
| `enable_dry_run_ownership_check` | boolean | `true` | Enable ownership validation via dry-run |

## Workflow-Specific Inputs

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
      node_version: '20.x'                    # Optional, defaults to '20.x'
      registry_url: 'https://registry.npmjs.org'  # Optional, defaults to npmjs.org
      package_access: 'public'                # Optional, defaults to 'public'
      enable_provenance: true                 # Optional, defaults to true
      enable_typosquatting_check: true        # Optional, defaults to true
      enable_security_audit: true             # Optional, defaults to true
      enable_dry_run_ownership_check: true    # Optional, defaults to true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**NPM-Specific Features:**
- **Scoped vs Unscoped Publishing**: Publishes both scoped and unscoped versions when available
- **Manual Approval**: Requires approval when unscoped package names are taken
- **Provenance Support**: Enables package provenance for enhanced security

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
      python_version: '3.11'                  # Optional, defaults to '3.11'
      registry_url: 'https://pypi.org'        # Optional, defaults to pypi.org
      enable_provenance: true                 # Optional, defaults to true
      enable_typosquatting_check: true        # Optional, defaults to true
      enable_security_audit: true             # Optional, defaults to true
      enable_dry_run_ownership_check: true    # Optional, defaults to true
    secrets:
      PYPI_TOKEN: ${{ secrets.PYPI_TOKEN }}
      TEST_PYPI_TOKEN: ${{ secrets.TEST_PYPI_TOKEN }}  # Optional
```

**PyPI-Specific Features:**
- **Dual-Registry Publishing**: Publishes to both TestPyPI and PyPI
- **Ownership Validation**: Uses TestPyPI upload test for ownership verification
- **Token Flexibility**: Supports separate TestPyPI and PyPI tokens

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
      rust_version: 'stable'                  # Optional, defaults to 'stable'
      registry_url: 'https://crates.io'       # Optional, defaults to crates.io
      enable_typosquatting_check: true        # Optional, defaults to true
      enable_security_audit: true             # Optional, defaults to true
      enable_dry_run_ownership_check: true    # Optional, defaults to true
    secrets:
      CARGO_TOKEN: ${{ secrets.CARGO_TOKEN }}
```

**Cargo-Specific Features:**
- **Dry-Run Publishing**: Uses `cargo publish --dry-run` for ownership validation
- **Custom Registry Support**: Full support for custom Cargo registries
- **Build Caching**: Caches Cargo registry and target directories

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
      go_version: '1.22'                      # Optional, defaults to '1.22'
      registry_url: 'https://pkg.go.dev'      # Optional, defaults to pkg.go.dev
      tag: 'v1.0.0'                          # Optional, defaults to release tag
      enable_typosquatting_check: true        # Optional, defaults to true
      enable_security_audit: true             # Optional, defaults to true
      enable_dry_run_ownership_check: true    # Optional, defaults to true
    secrets:
      GOPROXY_TOKEN: ${{ secrets.GOPROXY_TOKEN }}
```

**Go-Specific Features:**
- **Module Access Validation**: Tests module download access for ownership verification
- **govulncheck Integration**: Uses Go's official vulnerability scanner
- **Git-Based Publishing**: Proper handling of Go's git-based publishing model

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
- **Registry Integration**: Uses actual registry APIs for verification

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

## Feature Toggles

Control workflow behavior with feature toggles:

```yaml
jobs:
  publish:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@release-stable
    with:
      enable_typosquatting_check: false      # Disable typosquatting checks
      enable_security_audit: false           # Disable security audits
      enable_dry_run_ownership_check: false  # Disable ownership validation
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

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
          PYPI_TOKEN: ${{ secrets.PYPI_TOKEN }}
          CARGO_TOKEN: ${{ secrets.CARGO_TOKEN }}
```



## Required Setup

### 1. **GPG Key Setup**
```bash
# Generate GPG key
gpg --full-generate-key

# Export public key
gpg --armor --export your-email@example.com

# Configure Git
git config --global user.signingkey YOUR_KEY_ID
```

### 2. **Repository Secrets**
Set the following secrets in your repository:
- `NPM_TOKEN` - NPM authentication token
- `PYPI_TOKEN` - PyPI authentication token
- `TEST_PYPI_TOKEN` - TestPyPI authentication token (optional)
- `CARGO_TOKEN` - Cargo authentication token
- `GOPROXY_TOKEN` - Go proxy authentication token

### 3. **Approval System Setup**
Create approval files for each release:
```bash
# Create approval directory
mkdir -p .github/releases/v1.0.0

# Create approval files with commit SHA
echo "COMMIT_SHA" > .github/releases/v1.0.0/dev1
echo "COMMIT_SHA" > .github/releases/v1.0.0/senior1
echo "COMMIT_SHA" > .github/releases/v1.0.0/rkgh4096

# Commit with signed commits
git add .github/releases/v1.0.0/
git commit -S -m "Add release approvals for v1.0.0"
```

## Troubleshooting

### Common Issues

1. **GPG Signature Verification Fails**
   - Ensure GPG key is added to GitHub account
   - Verify Git is configured to use the correct signing key
   - Check that commits are signed with `git commit -S`

2. **Package Ownership Validation Fails**
   - Verify authentication tokens are correct
   - Check package name availability on the registry
   - Ensure you have proper permissions for the package

3. **Custom Registry Issues**
   - Validate registry URL format (must start with http:// or https://)
   - Check registry authentication and permissions
   - Verify registry supports the required APIs



### Debug Mode

Enable debug output by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

## Contributing

When adding new workflows or modifying existing ones:

1. **Follow the Architecture**: Use shared verification workflow
2. **Add Feature Toggles**: Make security features configurable
3. **Support Custom Registries**: Include registry URL validation
4. **Update Documentation**: Keep this README current
5. **Test Thoroughly**: Test with various package configurations

## License

These workflows are provided as-is for use in your projects. Modify as needed for your specific requirements. 