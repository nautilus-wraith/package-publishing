# Package Publishing Workflows

Reusable GitHub Actions workflows for publishing NPM packages with GPG-verified releases and provenance.

> For architecture, versioning internals, and maintainer instructions see [README-ADMIN.md](README-ADMIN.md).

---

## Prerequisites

- GPG key configured and public key uploaded to your GitHub account
- Signed Git tags enabled on your release branch (`Settings → Branches → Require signed tags`)
- NPM token stored as a repository secret (`NPM_TOKEN`)

---

## Adopt in 2 steps

### Step 1 — Add the workflow file to your repo

Create `.github/workflows/publish-npm.yml`:

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

Optional inputs:

| Input | Default | Description |
|---|---|---|
| `node_version` | `20.x` | Node.js version |
| `registry_url` | `https://registry.npmjs.org` | Target registry |
| `package_access` | `public` | `public` or `private` |
| `enable_provenance` | `true` | Publish with OIDC provenance |
| `publish_unscoped` | `false` | For scoped packages: enable the unscoped name gate |

> `enable_provenance` requires the repository to be **public** and `package.json` to have a `repository.url` field. Set it to `false` for private repositories.

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

If your `package.json` declares a scoped name (e.g. `@org/pkg`), the workflow always checks whether the unscoped equivalent (`pkg`) is already registered on npm. This check happens before publishing:

| Situation | `publish_unscoped` | What happens |
|---|---|---|
| Unscoped name is **taken** | not set | **Pipeline stops.** Set `publish_unscoped: true` in `with:` to acknowledge and re-run. |
| Unscoped name is **taken** | `true` | Proceeds. Scoped publishes. Approval gate appears for unscoped — npm rejects with 403 if you don't own it. |
| Unscoped name is **available** | not set | Proceeds. Log note suggests `publish_unscoped: true` to claim it. |
| Unscoped name is **available** | `true` | Proceeds. Scoped publishes. Approval gate appears to optionally claim the unscoped name. |
| Package is already **unscoped** | — | No check. npm rejects with 403 if you don't own the name. |

`publish_unscoped: true` means *"I am aware of the unscoped name situation and want to decide."* npm is the final authority on whether the publish is actually allowed.

### Setting up the unscoped approval gate

Set `publish_unscoped: true` in your consumer workflow:

```yaml
jobs:
  publish-npm:
    uses: nautilus-wraith/package-publishing/.github/workflows/publish-npm.yml@1.0.0
    with:
      publish_unscoped: true
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The `publish-unscoped` job pauses at a GitHub Environment called `npm-publish-unscoped`. Create it in your repo (Settings → Environments) with at least one required reviewer. The reviewer sees the availability status in the `validate-package` logs and the environment badge links directly to the npm page for the unscoped name.
