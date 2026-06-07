# Admin Guide — Package Publishing Workflows

This document covers architecture, versioning, the release process, and how to extend this repo. For user-facing adoption instructions see [README.md](README.md).

---

## Architecture

Two-tier design. All ecosystems share the same security gate; each ecosystem has its own publish workflow.

```
verify-release.yml          ← shared, called by every publish workflow
publish-npm.yml             ← NPM-specific
publish-pypi.yml            ← PyPI-specific
```

### Tier 1 — `verify-release.yml`

Runs before any package-specific logic. Checks:

- Tag is a signed, annotated GPG tag
- GPG key used to sign is present on the signer's GitHub account (`github.com/<user>.gpg`)
- Tag commit is an ancestor of `origin/main`

No package-specific dependencies — safe to reuse for any future ecosystem.

### Tier 2 — `publish-npm.yml` / `publish-pypi.yml`

Each workflow has three jobs (NPM has an optional fourth):

| Job | What it does |
|---|---|
| `verify-release` | Calls `verify-release.yml@release-stable` |
| `validate-package` | Manifest validation; for scoped NPM packages also checks unscoped name availability |
| `publish` | Publishes the (scoped) package with provenance |
| `publish-unscoped` *(NPM only, optional)* | Manual-gate job — requires `publish_unscoped: true` input and `npm-publish-unscoped` environment approval |

`validate-package` outputs `package_name`, `is_scoped`, and `unscoped_available` for use by downstream jobs.

---

## Versioning model

Consumers pin to a **version tag**:

```yaml
uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@1.0.0
```

Internally, `publish-npm.yml` and `publish-pypi.yml` reference `verify-release.yml` via the full external path on the `release-stable` branch:

```yaml
uses: nautilus-wraith/package-publishing/.github/workflows/verify-release.yml@release-stable
```

**Why `@release-stable` and not `@1.0.0`?**

Using a version tag internally creates a chicken-and-egg: to tag `1.0.0` you'd need `@1.0.0` to already exist in the file. The `release-stable` branch always points to the last tested release, so internal references always resolve correctly regardless of which version a consumer has pinned.

Trade-off: when `release-stable` advances (e.g. to `1.1.0`), consumers pinned to `1.0.0` will run `verify-release.yml` from `1.1.0`. This is intentional — verification logic should always be current. The publish workflow itself (validation rules, inputs, behaviour) remains exactly at the pinned version.

---

## Release process

```bash
# 1. Develop and test on main

# 2. Sign and push the version tag
git tag -s 1.1.0 -m "Release 1.1.0"
git push origin 1.1.0

# 3. Create the GitHub Release from that tag (triggers consumer workflows)
gh release create 1.1.0 --title "Release 1.1.0" --notes "What changed"

# 4. Advance release-stable to the new tag
git push origin 1.1.0:release-stable --force
```

`release-stable` must be created on the first release:

```bash
git push origin 1.0.0:refs/heads/release-stable
```

---

## GitHub Environments

Each publish job runs inside a named GitHub Environment. Environments provide deployment history and an optional human approval gate (Settings → Environments → Required reviewers).

| Workflow | Environment | Notes |
|---|---|---|
| NPM | `npm-publish` | Always required |
| NPM | `npm-publish-unscoped` | Only appears when `publish_unscoped: true` on a scoped package |
| PyPI | `pypi-publish` | Always required |

Create these environments in the **consumer repo** (not this repo).

### Unscoped NPM publishing gate

For scoped packages (e.g. `@org/pkg`), `validate-package` always checks whether the unscoped equivalent (`pkg`) is registered on npm. The outcome determines whether the pipeline proceeds and which jobs appear.

| Package type | Unscoped name | `publish_unscoped` | Result |
|---|---|---|---|
| `@org/pkg` | **taken** | not set | Pipeline fails — error explains the collision and requires explicit opt-in |
| `@org/pkg` | **taken** | `true` | Proceeds → scoped publishes → `publish-unscoped` gate appears |
| `@org/pkg` | **available** | not set | Proceeds normally — log note suggests `publish_unscoped: true` to claim it |
| `@org/pkg` | **available** | `true` | Proceeds → scoped publishes → `publish-unscoped` gate appears |
| `pkg` (unscoped) | — | — | No check — npm rejects with 403 if you don't own the name |

**Two enforcement layers:**

| Layer | What it enforces |
|---|---|
| Workflow | **Awareness** — you cannot silently proceed past a name collision without setting `publish_unscoped: true` |
| npm registry | **Ownership** — publishing to a name you don't own fails with 403, regardless of what CI does |

`publish_unscoped: true` means *"I know about this situation and want to decide"* — not *"I have permission to do it."*

**Gate mechanics:**

When `publish-unscoped` runs it pauses at the `npm-publish-unscoped` GitHub Environment. The reviewer can inspect:
- `validate-package` job logs — shows whether the unscoped name was available or taken
- Environment badge URL — links directly to `https://www.npmjs.com/package/<unscoped-name>`

`publish-unscoped` is triggered by `publish_unscoped: true` in the consumer workflow `with:` block. Configure `npm-publish-unscoped` in the consumer repo (Settings → Environments) with at least one required reviewer. Without required reviewers the job runs immediately without a gate.

---

## GPG setup for consumers

Consumers need a GPG-signed tag. Minimum setup:

```bash
# Generate key (RSA 4096, expiry per org policy)
gpg --full-generate-key

# Export and upload to GitHub (Settings → SSH and GPG keys)
gpg --armor --export your-email@example.com

# Tell Git which key to use
git config --global user.signingkey YOUR_KEY_ID

# Enable signed tags on the release branch (Settings → Branches → Require signed tags)
```

---

## Workflow inputs reference

### `publish-npm.yml`

| Input | Type | Default | Description |
|---|---|---|---|
| `node_version` | string | `20.x` | Node.js version |
| `registry_url` | string | `https://registry.npmjs.org` | Target registry |
| `package_access` | string | `public` | `public` or `private` |
| `enable_provenance` | boolean | `true` | Publish with `--provenance` |
| `publish_unscoped` | boolean | `false` | For scoped packages: add `publish-unscoped` gate job to optionally claim the unscoped name |

Secret: `NPM_TOKEN` (required)

### `publish-pypi.yml`

| Input | Type | Default | Description |
|---|---|---|---|
| `python_version` | string | `3.11` | Python version |
| `registry_url` | string | `https://pypi.org` | Target registry |
| `enable_provenance` | boolean | `true` | Publish with provenance |

Secret: `PYPI_TOKEN` (required)

---

## Adding a new ecosystem

1. Create `.github/workflows/publish-<lang>.yml`
2. Follow the same three-job structure: `verify-release` → `validate-package` → `publish`
3. Call `verify-release` with the full external path:
   ```yaml
   verify-release:
     uses: nautilus-wraith/package-publishing/.github/workflows/verify-release.yml@release-stable
   ```
4. Add manifest validation inline in `validate-package` (hard-fail on missing `name`/`version`, warn on missing optional fields)
5. Update this file and README.md
