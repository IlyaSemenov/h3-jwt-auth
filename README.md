# h3-jwt-auth

Simple JWT token authentication for h3 / Nuxt.

Handles very basic scenarios:
- Generate token from string payload (typically User ID, but not necessarily so).
- Return string payload from H3 event.

TODO:
- Override event parser (e.g. take token from Cookie or custom header).
- Parse/encode payload (e.g. store integers, or compress UUID with Base64).

## Install

```sh
npm install h3-jwt-auth
```

## Use

Create auth helpers:

```ts
import { setupAuth } from "h3-jwt-auth"

const config = useRuntimeConfig()

export const {
  createToken,
  getTokenPayload: getUserId,
  getTokenPayloadOptional: getUserIdOptional,
} = setupAuth({
  // Any string.
  secret: config.secret,
  // Default token expiration (optional).
  exp: "30d",
})
```

Login users with something like:

```ts
export default defineEventHandler(async (event) => {
  // ...
  const user = await db.user.find({ username, password })
  const token = await createAuthToken(user.id) // Assuming user.id is a string.
  return { user, token }
})
```

Send token from client side in API requests:

```ts
const $fetchWithToken = $fetch.create({
  onRequest({ options }) {
    if (data.value) {
      options.headers.set("Authorization", `Bearer ${token}`)
    }
  },
})

await $fetchWithToken("/api/orders")
```

Check user ID in API handlers:

```ts
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event) // string, or throw 403 if not provided.
  // or:
  const userId = await getUserIdOptional(event) // string or undefined

  const orders = await db.order.where({ userId })
  return orders
})
```
