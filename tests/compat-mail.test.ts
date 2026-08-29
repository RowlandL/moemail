import assert from "node:assert/strict"
import test from "node:test"
import {
  buildCompatibilityAddress,
  getCompatibilityConfig,
  isCompatibilityAuthorized,
} from "../app/lib/compat-mail"

test("accepts only normalized addresses on the configured domain", () => {
  assert.equal(
    buildCompatibilityAddress({ name: "Client_01", domain: "110MAIL.TOP" }, "110mail.top"),
    "client_01@110mail.top"
  )
  assert.equal(
    buildCompatibilityAddress({ address: "client_01@other.example" }, "110mail.top"),
    null
  )
  assert.equal(
    buildCompatibilityAddress({ name: "not valid" }, "110mail.top"),
    null
  )
})

test("requires the exact compatibility bearer token", () => {
  assert.equal(
    isCompatibilityAuthorized(new Headers({ Authorization: "Bearer business-token" }), "business-token"),
    true
  )
  assert.equal(
    isCompatibilityAuthorized(new Headers({ Authorization: "Bearer wrong-token" }), "business-token"),
    false
  )
  assert.equal(isCompatibilityAuthorized(new Headers(), "business-token"), false)
})

test("requires a configured owner username", () => {
  assert.deepEqual(
    getCompatibilityConfig({
      MAIL_API_TOKEN: "business-token",
      MAIL_DOMAIN: "110mail.top",
      MAIL_OWNER_USERNAME: " Rowland ",
    }),
    { token: "business-token", domain: "110mail.top", ownerUsername: "Rowland" }
  )
  assert.equal(
    getCompatibilityConfig({ MAIL_API_TOKEN: "business-token", MAIL_DOMAIN: "110mail.top" }),
    null
  )
})
