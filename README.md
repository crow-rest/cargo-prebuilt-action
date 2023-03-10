
# Install cargo-prebuilt

[![build-test](https://github.com/crow-rest/cargo-prebuilt-action/actions/workflows/test.yml/badge.svg)](https://github.com/crow-rest/cargo-prebuilt-action/actions/workflows/test.yml)

Installs cargo-prebuilt and the crates you pass to it, it also uses the tool 
cache to store all downloaded items.

See:
- [cargo-prebuilt](https://github.com/crow-rest/cargo-prebuilt)
- [cargo-prebuilt-index](https://github.com/crow-rest/cargo-prebuilt-index)

### Inputs

- version: Defaults to latest
- target: Defaults to current
- tools: Defaults to ''
- tools-target: Defaults to current
- always-install: Defaults to true

### Outputs

- version
- target
- tools-installed

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
or
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
          tools: just,rtx-cli@1.22.5
```

```yaml
name: Install 0.3.0 for aarch64-apple-darwin
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
