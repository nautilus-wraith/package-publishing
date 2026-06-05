# Package Publishing Workflows

Reusable GitHub Actions workflows for publishing NPM and PyPI packages with GPG-verified releases, security audits, and typosquatting detection.

> For architecture, versioning internals, and maintainer instructions see [README-ADMIN.md](README-ADMIN.md).

---

## Prerequisites

- GPG key configured and public key uploaded to your GitHub account
- Signed Git tags enabled on your release branch (`Settings → Branches → Require signed tags`)
- Registry token stored as a repository secret (`NPM_TOKEN` or `PYPI_TOKEN`)

---

## Adopt in 2 steps

### Step 1 — Add the workflow file to your repo

**NPM** — create `.github/workflows/publish-npm.yml`:

```yaml
name: Publish NPM

on:
  release:
    types: [published]

jobs:
  publish-npm:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@1.0.0
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**PyPI** — create `.github/workflows/publish-pypi.yml`:

```yaml
name: Publish PyPI

on:
  release:
    types: [published]

jobs:
  publish-pypi:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-pypi.yml@1.0.0
    secrets:
      PYPI_TOKEN: ${{ secrets.PYPI_TOKEN }}
```

Optional inputs (all have sensible defaults):

| Input | NPM default | PyPI default |
|---|---|---|
| `node_version` / `python_version` | `20.x` | `3.11` |
| `registry_url` | `https://registry.npmjs.org` | `https://pypi.org` |
| `package_access` *(NPM only)* | `public` | — |
| `enable_provenance` | `true` | `true` |

### Step 2 — Release with a signed tag

```bash
git tag -s 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

Then on GitHub: **Releases → Create a new release → select the tag → Publish.**
The workflow triggers automatically.

---

## What the workflow checks

1. **GPG tag signature** — verifies the tag is signed and the key is on your GitHub account
2. **Tag on main** — confirms the tag points to a commit on the main branch
3. **Package manifest** — validates required fields in `package.json` / `pyproject.toml`
4. **Security audit** — `npm audit --production` / `twine check`
5. **Typosquatting** — warns if similar package names exist on the registry (never blocks)
6. **Pre-publish integrity** — `npm pack --dry-run` / `twine check dist/*`
7. **Publish** — pushes to the registry with provenance
