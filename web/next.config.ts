import type { NextConfig } from 'next'

// The preview environment proxies the dev server under
// https://<port>-<sandboxId>.e2b.app, so the dev origin allowlist is derived
// from the sandbox id at startup when available.
const sandboxId = process.env.E2B_SANDBOX_ID
const devOrigins: string[] = ['dono-03.danbot.host']
if (sandboxId) {
  for (const port of ['3000', '3001', '4321', '8080']) {
    devOrigins.push(`${port}-${sandboxId}.e2b.app`)
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
}

export default nextConfig
