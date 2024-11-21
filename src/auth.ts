import { createError, getRequestHeader, type H3Event } from "h3"
import * as jose from "jose"

export type ExpValue = number | string | Date

export interface SetupAuthOptions {
  secret: string
  /**
   * Set the default "exp" (Expiration Time) Claim.
   *
   * - If a `number` is passed as an argument it is used as the claim directly.
   * - If a `Date` instance is passed as an argument it is converted to unix timestamp and used as the
   *   claim.
   * - If a `string` is passed as an argument it is resolved to a time span, and then added to the
   *   current unix timestamp and used as the claim.
   *
   * Format used for time span should be a number followed by a unit, such as "5 minutes" or "1
   * day".
   *
   * Valid units are: "sec", "secs", "second", "seconds", "s", "minute", "minutes", "min", "mins",
   * "m", "hour", "hours", "hr", "hrs", "h", "day", "days", "d", "week", "weeks", "w", "year",
   * "years", "yr", "yrs", and "y". It is not possible to specify months. 365.25 days is used as an
   * alias for a year.
   *
   * If the string is suffixed with "ago", or prefixed with a "-", the resulting time span gets
   * subtracted from the current unix timestamp. A "from now" suffix can also be used for
   * readability when adding to the current unix timestamp.
   */
  exp?: ExpValue
}

export function setupAuth(opts: SetupAuthOptions) {
  const secret = new TextEncoder().encode(opts.secret)

  /**
   * Create a JWT token.
   *
   * @param payload Any string payload, such as user ID.
   * @param exp "exp" (Expiration Time) Claim value to set on the JWT Claims Set. See `setupAuth` for the format options.
   */
  async function createToken(payload: string, exp: ExpValue | null | undefined = opts.exp) {
    const t = new jose.SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setSubject(payload)
    if (exp) {
      t.setExpirationTime(exp)
    }
    return await t.sign(secret)
  }

  async function parseToken(token: string): Promise<string | undefined> {
    try {
      const { payload } = await jose.jwtVerify(token, secret)
      return payload.sub
    } catch {
      // Ignore errors, return empty payload
    }
  }

  async function getTokenPayloadOptional(event: H3Event): Promise<string | undefined> {
    const authHeader = getRequestHeader(event, "authorization")
    if (authHeader) {
      const [method, token] = authHeader.split(" ")
      if (method.toLowerCase() === "bearer" && token) {
        return await parseToken(token)
      }
    }
  }

  async function getTokenPayload(event: H3Event): Promise<string> {
    const payload = await getTokenPayloadOptional(event)
    if (!payload) {
      throw createError({ statusCode: 401, message: "Unauthorized." })
    }
    return payload
  }

  return {
    createToken,
    parseToken,
    getTokenPayload,
    getTokenPayloadOptional,
  }
}
