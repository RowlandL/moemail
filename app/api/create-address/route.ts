import { getRequestContext } from "@cloudflare/next-on-pages"
import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { createDb } from "@/lib/db"
import {
  buildCompatibilityAddress,
  getCompatibilityConfig,
  isCompatibilityAuthorized,
  type CompatibilityAddressInput,
} from "@/lib/compat-mail"
import { emails } from "@/lib/schema"

export const runtime = "edge"

const COMPATIBILITY_EXPIRY_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const config = getCompatibilityConfig(getRequestContext().env as unknown as Record<string, unknown>)
  if (!config) {
    return NextResponse.json({ error: "邮件兼容服务未配置" }, { status: 503 })
  }

  if (!isCompatibilityAuthorized(request.headers, config.token)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  let input: CompatibilityAddressInput
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 })
  }

  const address = buildCompatibilityAddress(input, config.domain)
  if (!address) {
    return NextResponse.json({ error: "邮箱地址或域名无效" }, { status: 400 })
  }

  const db = createDb()
  const whereAddress = eq(sql`LOWER(${emails.address})`, address)
  const existing = await db.query.emails.findFirst({ where: whereAddress })
  if (existing) {
    return NextResponse.json({ address: existing.address })
  }

  const now = new Date()
  try {
    await db.insert(emails).values({
      address,
      createdAt: now,
      expiresAt: new Date(now.getTime() + COMPATIBILITY_EXPIRY_MS),
    }).run()
  } catch (error) {
    const duplicate = await db.query.emails.findFirst({ where: whereAddress })
    if (duplicate) {
      return NextResponse.json({ address: duplicate.address })
    }

    console.error("Failed to create compatibility email:", error)
    return NextResponse.json({ error: "创建邮箱失败" }, { status: 500 })
  }

  return NextResponse.json({ address })
}
