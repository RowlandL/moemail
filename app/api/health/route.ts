import { getRequestContext } from "@cloudflare/next-on-pages"
import { NextResponse } from "next/server"
import { getCompatibilityConfig, isCompatibilityAuthorized } from "@/lib/compat-mail"

export const runtime = "edge"

export function GET(request: Request) {
  const config = getCompatibilityConfig(getRequestContext().env as unknown as Record<string, unknown>)
  if (!config) {
    return NextResponse.json({ error: "邮件兼容服务未配置" }, { status: 503 })
  }

  if (!isCompatibilityAuthorized(request.headers, config.token)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
