
# Install cargo-prebuilt

[![build-test](https://github.com/crow-rest/cargo-prebuilt-action/actions/workflows/test.yml/badge.svg)](https://github.com/crow-rest/cargo-prebuilt-action/actions/workflows/test.yml)

### Inputs

- repo_token: Defaults to ${{ github.token }}
- version: Defaults to latest
- target: Defaults to current
- always-install: Defaults to false

### Outputs

- version
- target

### Usage

```yaml
name: Install
on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install cargo-prebuilt
        uses: crow-rest/cargo-prebuilt-action@v1
      - run: cargo prebuilt just
```

```yaml
name: Install
on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install cargo-prebuilt
        uses: crow-rest/cargo-prebuilt-action@v1
        with:
          version: 0.3.0
          target: aarch64-apple-darwin
```
