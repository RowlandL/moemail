export type CompatibilityAddressInput = {
  address?: unknown
  name?: unknown
  domain?: unknown
}

const LOCAL_PART = /^[a-z0-9][a-z0-9._-]{0,63}$/

function normalizeDomain(value: unknown) {
  if (typeof value !== "string") return null

  const domain = value.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "")
  return domain && /^[a-z0-9.-]+$/.test(domain) ? domain : null
}

function normalizeLocalPart(value: unknown) {
  if (typeof value !== "string") return null

  const localPart = value.trim().toLowerCase()
  return LOCAL_PART.test(localPart) ? localPart : null
}

export function buildCompatibilityAddress(
  input: CompatibilityAddressInput,
  configuredDomain: string
) {
  const domain = normalizeDomain(configuredDomain)
  if (!domain) return null

  if (typeof input.address === "string") {
    const parts = input.address.trim().toLowerCase().split("@")
    if (parts.length !== 2 || normalizeDomain(parts[1]) !== domain) return null

    const localPart = normalizeLocalPart(parts[0])
    return localPart ? `${localPart}@${domain}` : null
  }

  const localPart = normalizeLocalPart(input.name)
  const requestedDomain = input.domain === undefined ? domain : normalizeDomain(input.domain)
  return localPart && requestedDomain === domain ? `${localPart}@${domain}` : null
}

export function isCompatibilityAuthorized(headers: Headers, expectedToken: string) {
  return headers.get("Authorization") === `Bearer ${expectedToken}`
}

export function getCompatibilityConfig(env: Record<string, unknown>) {
  const token = typeof env.MAIL_API_TOKEN === "string" ? env.MAIL_API_TOKEN.trim() : ""
  const domain = typeof env.MAIL_DOMAIN === "string" ? env.MAIL_DOMAIN : ""
  const ownerUsername = typeof env.MAIL_OWNER_USERNAME === "string"
    ? env.MAIL_OWNER_USERNAME.trim()
    : ""
  const normalizedDomain = normalizeDomain(domain)

  return token && normalizedDomain && ownerUsername
    ? { token, domain: normalizedDomain, ownerUsername }
    : null
}
