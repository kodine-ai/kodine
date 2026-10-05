# Contributing to Kodine

Thanks for your interest. Kodine is proprietary, source-available software:
we welcome bug reports, fixes, and focused improvements, and every
contribution requires accepting our Contributor License Agreement (CLA)
so that Kodine Bilişim Hizmetleri can keep distributing the product.

## Before you start

- Open an issue first for anything beyond a small fix, so we can align on
  direction before you spend time on it.
- Search existing issues and pull requests to avoid duplicates.

## Development setup

```bash
bun install
cd packages/kodine && bun dev
```

- Run `bun typecheck` from the package directory you changed.
- Run tests from package directories (e.g. `packages/kodine`), never from
  the repo root.
- Branch names: short, at most three words, hyphen-separated
  (e.g. `session-recovery`). The default branch is `dev`.
- Commits and PR titles: conventional style, `type(scope): summary`.

## What gets merged

- Bug fixes with a clear reproduction.
- Focused features that fit the product direction (open an issue first).
- Performance and DX improvements that don't change behavior.

By opening a pull request you agree to the CLA: you grant Kodine Bilişim
Hizmetleri the right to use, modify, and relicense your contribution as
part of the Kodine product.
