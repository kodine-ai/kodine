#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@kodine-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  // GitHub artifact downloads can drop the executable bit, and Docker uses the
  // unpacked dist binaries directly rather than the published tarball.
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(dir)
  // Staged publishing: `npm stage publish` never requires OTP, so it works in
  // CI with a plain granular token (2FA bypass tokens are deprecated). The
  // release goes live after a maintainer approves it on npmjs.com
  // (Staged Packages tab) — approval is where 2FA happens.
  await $`npm stage publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const pkg = await Bun.file(`./dist/${filepath}`).json()
  binaries[pkg.name] = pkg.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]

await $`mkdir -p ./dist/${pkg.name}`
await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`./dist/${pkg.name}/bin/${pkg.name}.exe`).write(
  [
    `echo "Error: @kodine/cli's postinstall script was not run." >&2`,
    'echo "" >&2',
    'echo "This occurs when using --ignore-scripts during installation, or when using a" >&2',
    'echo "package manager like pnpm that does not run postinstall scripts by default." >&2',
    'echo "" >&2',
    'echo "To fix this, run the postinstall script manually:" >&2',
    `echo "  cd node_modules/@kodine/cli && node postinstall.mjs" >&2`,
    'echo "" >&2',
    `echo "Or reinstall @kodine/cli without the --ignore-scripts flag." >&2`,
    "exit 1",
    "",
  ].join("\n"),
)

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: "@kodine/cli",
      bin: {
        [pkg.name]: `./bin/${pkg.name}.exe`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

// npm failure is non-fatal: the Homebrew tap and update feed must still ship.
// Packages land in the npm staging area (npmjs.com → Staged Packages) and go
// public when a maintainer approves them. Per-package failures (rate limit,
// already staged) are tolerated so a re-run can fill the gaps.
const failed: string[] = []
// Serialize staging: 13 rapid ~60MB PUTs trip npm's account-level rate
// limit (E429), especially on fresh accounts. A short gap stays well under.
for (const [name] of Object.entries(binaries)) {
  try {
    await publish(`./dist/${name}`, name, binaries[name])
  } catch (e) {
    failed.push(name)
    console.error(`stage failed for ${name}:`, e)
  }
  await new Promise((r) => setTimeout(r, 15_000))
}
try {
  await publish(`./dist/${pkg.name}`, "@kodine/cli", version)
} catch (e) {
  failed.push("@kodine/cli")
  console.error(`stage failed for @kodine/cli:`, e)
}
if (failed.length) {
  console.error("=".repeat(60))
  console.error(`WARNING: npm staging incomplete: ${failed.join(", ")}`)
  console.error("Re-run the workflow after the rate limit resets; already-staged")
  console.error("packages are skipped by npm or fail harmlessly.")
  console.error("=".repeat(60))
}

const image = "ghcr.io/kodine-ai/kodine"
const platforms = "linux/amd64,linux/arm64"
const tags = [`${image}:${version}`, `${image}:${Script.channel}`]
const tagFlags = tags.flatMap((t) => ["-t", t])

// registries
if (!Script.preview) {
  // Docker image push is opt-in: KODINE_DOCKER=1 and a logged-in ghcr.io.
  if (process.env.KODINE_DOCKER === "1") {
    await $`docker buildx build --platform ${platforms} ${tagFlags} --push .`
  }
  // Calculate SHA values
  const arm64Sha = await $`sha256sum ./dist/kodine-linux-arm64.tar.gz | cut -d' ' -f1`.text().then((x) => x.trim())
  const x64Sha = await $`sha256sum ./dist/kodine-linux-x64.tar.gz | cut -d' ' -f1`.text().then((x) => x.trim())
  const macX64Sha = await $`sha256sum ./dist/kodine-darwin-x64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const macArm64Sha = await $`sha256sum ./dist/kodine-darwin-arm64.zip | cut -d' ' -f1`.text().then((x) => x.trim())

  // Self-hosted artifact URLs (uploaded by script/release-upload.ts). GitHub
  // releases remain a mirror only — package managers must not depend on them.
  const download = `https://kodine.net/downloads/cli/${Script.version}`

  const [pkgver, _subver = ""] = Script.version.split(/(-.*)/, 2)

  // arch (opt-in: KODINE_AUR=1 once the AUR account + ssh key exist)
  const binaryPkgbuild = [
    "# Maintainer: Kodine <destek@kodine.net>",
    "",
    "pkgname='kodine-beta'",
    `pkgver=${pkgver}`,
    `_subver=${_subver}`,
    "options=('!debug' '!strip')",
    "pkgrel=1",
    "pkgdesc='AI coding agent that lives in your terminal.'",
    "url='https://github.com/kodine-ai/kodine'",
    "arch=('aarch64' 'x86_64')",
    "license=('custom')",
    "provides=('kodine')",
    "conflicts=('kodine')",
    "depends=('ripgrep')",
    "",
    `source_aarch64=("\${pkgname}_\${pkgver}_aarch64.tar.gz::https://kodine.net/downloads/cli/\${pkgver}\${_subver}/kodine-linux-arm64.tar.gz")`,
    `sha256sums_aarch64=('${arm64Sha}')`,

    `source_x86_64=("\${pkgname}_\${pkgver}_x86_64.tar.gz::https://kodine.net/downloads/cli/\${pkgver}\${_subver}/kodine-linux-x64.tar.gz")`,
    `sha256sums_x86_64=('${x64Sha}')`,
    "",
    "package() {",
    '  install -Dm755 ./kodine "${pkgdir}/usr/bin/kodine"',
    "}",
    "",
  ].join("\n")

  if (process.env.KODINE_AUR === "1") {
    for (const [pkg, pkgbuild] of [["kodine-beta", binaryPkgbuild]]) {
    for (let i = 0; i < 30; i++) {
      try {
        await $`rm -rf ./dist/aur-${pkg}`
        await $`git clone ssh://aur@aur.archlinux.org/${pkg}.git ./dist/aur-${pkg}`
        await $`cd ./dist/aur-${pkg} && git checkout master`
        await Bun.file(`./dist/aur-${pkg}/PKGBUILD`).write(pkgbuild)
        await $`cd ./dist/aur-${pkg} && makepkg --printsrcinfo > .SRCINFO`
        await $`cd ./dist/aur-${pkg} && git add PKGBUILD .SRCINFO`
        if ((await $`cd ./dist/aur-${pkg} && git diff --cached --quiet`.nothrow()).exitCode === 0) break
        await $`cd ./dist/aur-${pkg} && git commit -m "Update to v${Script.version}"`
        await $`cd ./dist/aur-${pkg} && git push`
        break
      } catch {
        continue
      }
    }
    }
  }

  // Homebrew formula
  const homebrewFormula = [
    "# typed: false",
    "# frozen_string_literal: true",
    "",
    "# Generated by packages/kodine/script/publish.ts. DO NOT EDIT.",
    "class Kodine < Formula",
    `  desc "AI coding agent that lives in your terminal."`,
    `  homepage "https://kodine.net"`,
    `  version "${Script.version.split("-")[0]}"`,
    "",
    `  depends_on "ripgrep"`,
    "",
    "  on_macos do",
    "    if Hardware::CPU.intel?",
    `      url "${download}/kodine-darwin-x64.zip"`,
    `      sha256 "${macX64Sha}"`,
    "",
    "      def install",
    '        bin.install "kodine"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm?",
    `      url "${download}/kodine-darwin-arm64.zip"`,
    `      sha256 "${macArm64Sha}"`,
    "",
    "      def install",
    '        bin.install "kodine"',
    "      end",
    "    end",
    "  end",
    "",
    "  on_linux do",
    "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
    `      url "${download}/kodine-linux-x64.tar.gz"`,
    `      sha256 "${x64Sha}"`,
    "      def install",
    '        bin.install "kodine"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
    `      url "${download}/kodine-linux-arm64.tar.gz"`,
    `      sha256 "${arm64Sha}"`,
    "      def install",
    '        bin.install "kodine"',
    "      end",
    "    end",
    "  end",
    "end",
    "",
    "",
  ].join("\n")

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error("GITHUB_TOKEN is required to update homebrew tap")
    process.exit(1)
  }
  const tap = `https://x-access-token:${token}@github.com/kodine-ai/homebrew-tap.git`
  await $`rm -rf ./dist/homebrew-tap`
  await $`git clone ${tap} ./dist/homebrew-tap`
  await $`cd ./dist/homebrew-tap && git config user.email "release@kodine.net" && git config user.name "Kodine Release"`
  await Bun.file("./dist/homebrew-tap/kodine.rb").write(homebrewFormula)
  await $`cd ./dist/homebrew-tap && git add kodine.rb`
  if ((await $`cd ./dist/homebrew-tap && git diff --cached --quiet`.nothrow()).exitCode !== 0) {
    await $`cd ./dist/homebrew-tap && git commit -m "Update to v${Script.version}"`
    await $`cd ./dist/homebrew-tap && git push`
  }
}
