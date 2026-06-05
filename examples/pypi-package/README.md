# nautilus-hello-world

Example PyPI package demonstrating the `nautilus-wraith/package-publishing` reusable publish workflow.

## Usage

```python
from hello_world import hello
print(hello("World"))  # Hello, World!
```

## Publishing

Releases are published automatically via GitHub Actions when a signed tag is pushed and a GitHub Release is created. See the [publishing workflow](.github/workflows/publish-pypi.yml).

Required repository secret: `PYPI_TOKEN`
