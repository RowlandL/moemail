import { getRequestContext } from "@cloudflare/next-on-pages"
import { NextResponse } from "next/server"
import { and, desc, eq, gt, sql } from "drizzle-orm"
import { createDb } from "@/lib/db"
import {
  buildCompatibilityAddress,
  getCompatibilityConfig,
  isCompatibilityAuthorized,
} from "@/lib/compat-mail"
import { emails, messages } from "@/lib/schema"

export const runtime = "edge"

function boundedInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export async function GET(request: Request) {
  const config = getCompatibilityConfig(getRequestContext().env as unknown as Record<string, unknown>)
  if (!config) {
    return NextResponse.json({ error: "邮件兼容服务未配置" }, { status: 503 })
  }

  if (!isCompatibilityAuthorized(request.headers, config.token)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const address = buildCompatibilityAddress({ address: searchParams.get("address") }, config.domain)
  if (!address) {
    return NextResponse.json({ error: "邮箱地址或域名无效" }, { status: 400 })
  }

  const limit = boundedInteger(searchParams.get("limit"), 20, 1, 50)
  const offset = boundedInteger(searchParams.get("offset"), 0, 0, 10_000)
  const db = createDb()
  const mailbox = await db.query.emails.findFirst({
    where: and(
      eq(sql`LOWER(${emails.address})`, address),
      gt(emails.expiresAt, new Date())
    ),
  })

  if (!mailbox) {
    return NextResponse.json({ error: "邮箱不存在或已过期" }, { status: 404 })
  }

  const rows = await db
    .select({
      id: sql<number>`rowid`,
      from: messages.fromAddress,
      subject: messages.subject,
      raw: messages.content,
      receivedAt: messages.receivedAt,
    })
    .from(messages)
    .where(and(eq(messages.emailId, mailbox.id), eq(messages.type, "received")))
    .orderBy(desc(messages.receivedAt), desc(messages.id))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    results: rows.map((row) => ({
      id: Number(row.id),
      from: row.from ?? "",
      sender: row.from ?? "",
      subject: row.subject,
      raw: row.raw,
      receivedAt: row.receivedAt,
    })),
  })
}
