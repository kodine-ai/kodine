<p align="center">
  <a href="https://kodine.net">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Kodine" width="320">
    </picture>
  </a>
</p>

<h3 align="center">AI coding agent that lives in your terminal</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@kodine/cli"><img alt="npm" src="https://img.shields.io/npm/v/@kodine/cli?style=flat-square" /></a>
  <a href="https://kodine.net/docs"><img alt="docs" src="https://img.shields.io/badge/docs-kodine.net-2DD4BF?style=flat-square" /></a>
</p>

---

Kodine reads your codebase, plans the change, edits the files, runs the
commands, and iterates — while you stay in control of every step.
No IDE switch, no copy-paste round trips: it works where you work.

**[Türkçe](README.tr.md)**

## Install

```bash
curl -fsSL https://kodine.net/v1/install | bash
```

or with your package manager:

```bash
npm i -g @kodine/cli        # also: bun, pnpm, yarn
brew install kodine-ai/tap/kodine
```

## Get started

```bash
cd your-project
kodine
```

Sign in once, pick a model, describe what you want built or fixed.

## Learn more

- Documentation: **https://kodine.net/docs**
- Pricing: **https://kodine.net/pricing**
- Support: **help@kodine.net**

## License

Kodine is proprietary, source-available software. The code is visible so
you can audit what runs on your machine; using it to build your own
product is not permitted. See [LICENSE](LICENSE) and
[third_party/](third_party/) for details.
