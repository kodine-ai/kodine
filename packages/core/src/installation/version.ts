declare global {
  const KODINE_VERSION: string
  const KODINE_CHANNEL: string
}

export const InstallationVersion = typeof KODINE_VERSION === "string" ? KODINE_VERSION : "local"
export const InstallationChannel = typeof KODINE_CHANNEL === "string" ? KODINE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
