import type { H3Event } from "h3"
import { expect, it, suite } from "vitest"

import { setupAuth } from "./auth"

it("works", async () => {
  const { createToken, parseToken } = setupAuth({ secret: "xyzzy" })
  const token = await createToken("Alice")
  await expect(parseToken(token)).resolves.toEqual("Alice")
})

it("can only decode token with the same secret", async () => {
  const { createToken } = setupAuth({ secret: "xyzzy" })
  const { parseToken } = setupAuth({ secret: "wopper" })
  const token = await createToken("Alice")
  await expect(parseToken(token)).resolves.toBeUndefined()
})

it("works with h3 event", async () => {
  const { createToken, getTokenPayload, getTokenPayloadOptional } = setupAuth({ secret: "xyzzy" })
  const token = await createToken("Alice")

  function createEvent(token: string) {
    return { node: { req: { headers: { authorization: `Bearer ${token}` } } } } as H3Event
  }

  await expect(getTokenPayload(createEvent(token))).resolves.toEqual("Alice")
  await expect(getTokenPayload(createEvent("garbage"))).rejects.toThrow()

  await expect(getTokenPayloadOptional(createEvent(token))).resolves.toEqual("Alice")
  await expect(getTokenPayloadOptional(createEvent("garbage"))).resolves.toBeUndefined()
})

suite.concurrent("exp", () => {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  it("has no exp by default", async () => {
    const { createToken, parseToken } = setupAuth({ secret: "xyzzy" })
    const token = await createToken("Alice")
    await sleep(1100)
    await expect(parseToken(token)).resolves.toEqual("Alice")
  })

  it("uses global exp", async () => {
    const { createToken, parseToken } = setupAuth({ secret: "xyzzy", exp: "1 s" })
    const token = await createToken("Alice")
    await expect(parseToken(token)).resolves.toEqual("Alice")
    await sleep(1100)
    await expect(parseToken(token)).resolves.toBeUndefined()
  })

  it("uses local exp", async () => {
    const { createToken, parseToken } = setupAuth({ secret: "xyzzy" })
    const token = await createToken("Alice", "1 s")
    await expect(parseToken(token)).resolves.toEqual("Alice")
    await sleep(1100)
    await expect(parseToken(token)).resolves.toBeUndefined()
  })

  it("overrides global exp with local exp", async () => {
    const { createToken, parseToken } = setupAuth({ secret: "xyzzy", exp: "1 s" })
    const token = await createToken("Alice", null)
    await sleep(1100)
    await expect(parseToken(token)).resolves.toEqual("Alice")
  })
})
