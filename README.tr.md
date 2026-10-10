<p align="center">
  <a href="https://kodine.net">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="Kodine" width="320">
    </picture>
  </a>
</p>

<h3 align="center">Terminalinde yaşayan yapay zekâ kod asistanı</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@kodine/cli"><img alt="npm" src="https://img.shields.io/npm/v/@kodine/cli?style=flat-square" /></a>
  <a href="https://kodine.net/docs"><img alt="docs" src="https://img.shields.io/badge/dok%C3%BCman-kodine.net-2DD4BF?style=flat-square" /></a>
</p>

---

Kodine kod tabanını okur, değişikliği planlar, dosyaları düzenler,
komutları çalıştırır ve sonuca kadar yineler — her adımda kontrol sende.
IDE değiştirmek yok, kopyala-yapıştır yok: sen neredeysen orada çalışır.

**[English](README.md)**

## Kurulum

```bash
curl -fsSL https://kodine.net/v1/install | bash
```

veya paket yöneticinle:

```bash
npm i -g @kodine/cli        # bun, pnpm, yarn da olur
brew install kodine-ai/tap/kodine
```

## Başlangıç

```bash
cd projen
kodine
```

Bir kez giriş yap, modelini seç, ne yaptırmak istediğini anlat.

## Devamı

- Dokümantasyon: **https://kodine.net/docs**
- Fiyatlandırma: **https://kodine.net/tr/pricing**
- Destek: **destek@kodine.net**

## Lisans

Kodine tescilli (proprietary), kaynağı-görünür bir yazılımdır. Kod,
makinende çalışanı denetleyebilmen için açıktır; kendi ürününü yapmak
için kullanılmasına izin verilmez. Ayrıntılar: [LICENSE](LICENSE) ve
[third_party/](third_party/).
