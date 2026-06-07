# @nautilus-wraith/hello-world

Example NPM package demonstrating the `nautilus-wraith/package-publishing` reusable publish workflow.

## Usage

```js
const { hello } = require('@nautilus-wraith/hello-world');
console.log(hello('World')); // Hello, World!
```

## Publishing

Releases are published automatically via GitHub Actions when a signed tag is pushed and a GitHub Release is created. See the [publishing workflow](.github/workflows/publish-npm.yml).

Required repository secret: `NPM_TOKEN`
