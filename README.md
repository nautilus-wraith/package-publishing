# Package Publishing Workflows

Reusable GitHub Actions workflows for publishing NPM and PyPI packages with GPG-verified releases and provenance.

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

permissions:
  contents: read
  id-token: write  # required for provenance

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

permissions:
  contents: read
  id-token: write  # required for provenance

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
| `publish_unscoped` *(NPM only)* | `false` | — |

### Step 2 — Create a signed tag and publish the release

```bash
# Sign and push the tag
git tag -s 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0

# Create the GitHub Release from that existing tag — this triggers the workflow
gh release create 1.0.0 --title "Release 1.0.0" --notes "What changed"
# Alternatively create Release for this tag in GitHub UI
```

> **Why this order matters**: `gh release create` (or GitHub UI → *select an existing tag*) wraps a tag you already pushed — GitHub never re-creates it, so the GPG signature is preserved and verification passes.
> If you let GitHub create the tag for you (typing a new tag name directly in the UI release form), it creates an **unsigned** tag and verification will fail.

---

## What the workflow checks

1. **GPG tag signature** — verifies the tag is signed and the key is on your GitHub account
2. **Tag on main** — confirms the tag points to a commit on the main branch
3. **Package manifest** — validates required fields (`name`, `version`) and warns on missing recommended fields (`description`, `license`)
4. **Publish** — pushes to the registry with OIDC provenance

---

## NPM — scoped vs. unscoped packages

If your `package.json` declares a scoped name (e.g. `@org/pkg`), the workflow always checks whether the unscoped equivalent (`pkg`) is already registered on npm. This check happens before publishing and has three outcomes:

| Situation | `publish_unscoped` | What happens |
|---|---|---|
| Unscoped name is **taken** | not set | **Pipeline stops.** You must set `publish_unscoped: true` to acknowledge the collision and re-run. |
| Unscoped name is **taken** | `true` | Pipeline proceeds. Scoped package publishes. A manual approval gate appears for the unscoped publish — if you don't own the name, npm will reject it with a 403. |
| Unscoped name is **available** | not set | Pipeline proceeds normally. A log note suggests `publish_unscoped: true` to claim it. |
| Unscoped name is **available** | `true` | Pipeline proceeds. Scoped package publishes. A manual approval gate appears to optionally claim the unscoped name. |
| Package is already **unscoped** | — | No check. If the name is owned by someone else, npm rejects the push with a 403. |

`publish_unscoped: true` means *"I am aware of the unscoped name situation and want to decide."* npm is the final authority on whether the publish is actually allowed.

### Setting up the unscoped approval gate

The `publish-unscoped` job pauses at a GitHub Environment called `npm-publish-unscoped`. Create it in your repo (Settings → Environments) and add at least one required reviewer. When the gate triggers, the reviewer can check the `validate-package` logs for the availability status and the environment badge links directly to the npm page for the unscoped name.

To opt in, pass the input in your consumer workflow:

```yaml
jobs:
  publish-npm:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@1.0.0
    with:
      publish_unscoped: true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```
