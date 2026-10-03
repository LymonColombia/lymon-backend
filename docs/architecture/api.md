# API conventions

The rules every HTTP endpoint follows. Swagger (`/api/docs`) documents each endpoint;
this page documents the **conventions** they share. New endpoints must follow them. 

## 1. URLs

- **Plural, kebab-case nouns:** `/properties`, `/incident-reports`, `/refund-requests`.
  Never verbs: use `POST /reservations`, not `/createReservation`.
- **IDs as path parameters**, named after the resource: `/units/:unitId`.
- **Nest one level, and only for ownership:** `/properties/:propertyId/inventory` when
  the child only exists inside its parent. Don't nest deeper than that.
- **Actions that aren't CRUD** are a sub-resource with `POST`:
  `POST /reservations/:reservationId/check-in`, `POST /guest/cart/checkout`.
- **Audience prefixes:**

| Prefix | Who calls it | Auth |
|---|---|---|
| *(none)* | staff and owners | staff JWT (`JWT-auth`) |
| `guest/` | guests | guest JWT (`GuestJWT-auth`) |
| `public` routes (marked `@Public()`) | anyone | none |
| `payments/…/webhook`, `communications/webhook/…` | third parties | signature or secret |

- The tenant comes from the token. **Never put `tenantId` in the URL or the body** of
  staff or guest routes. Webhooks are the only exception, because they have no token.

## 2. Methods and status codes

| Method | Use | Success |
|---|---|---|
| `GET` | read, with no side effects | `200` |
| `POST` | create, or run an action | `201` for a create, `200` for an action |
| `PATCH` | partial update: only the fields sent are changed | `200` with the updated resource |
| `PUT` | full replacement: the body is the whole resource | `200` with the updated resource |
| `DELETE` | delete (a soft delete where the table supports it) | `204`, no body |

Updates currently all use `PATCH`. Use `PUT` when a client really replaces the
whole resource, for example saving a complete settings object or a list in one go.

| Error | When |
|---|---|
| `400` | the DTO fails validation, or a domain rule is broken (`DomainException`) |
| `401` | the token is missing, invalid or expired |
| `403` | the token is valid, but a permission or scope is missing, or the trial has expired |
| `404` | the resource doesn't exist, **or it belongs to another tenant or guest** |
| `409` | a uniqueness conflict (duplicate email, slug, SKU) |
| `500` | an unexpected error. It returns a generic message; the details only go to the logs |

A resource owned by someone else returns **`404`, not `403`**. A `403` would confirm
the ID exists.

## 3. Requests

- JSON bodies with **camelCase** keys.
- Every body and query parameter goes through a DTO with `class-validator` decorators.
  The global `ValidationPipe` runs with `whitelist` and `forbidNonWhitelisted`, so
  **unknown fields are rejected with `400`**, not ignored.
- **Dates:** a date on its own is `YYYY-MM-DD` (check-in and check-out). A point in time is
  ISO 8601 with a timezone: `2026-09-24T15:00:00.000Z`.
- **Money:** amounts are in **COP** as plain numbers, never formatted strings. Fields
  holding whole pesos end in `Cop` (`priceCop`). Payment amounts are in cents
  (`amountInCents`).
- **Files:** never upload through the API. Get a presigned URL from
  `POST /storage/presigned-url`, upload the file to R2, then send the returned **key**.

## 4. Responses

- camelCase JSON, built by a response DTO or mapper. Never return a Prisma row or a
  domain entity directly.
- Return file **URLs** built from their stored keys; never return raw keys.
- A single resource is returned as the object itself, with no `{ data: … }` wrapper.

### Pagination, filtering, sorting

List endpoints take:

| Query parameter | Meaning | Default |
|---|---|---|
| `page` | 1-based page number | `1` |
| `limit` | page size | `10` |
| `sortBy` | field to sort on (an allowed list per endpoint) | endpoint-specific |
| `sortOrder` | `asc` \| `desc` | `desc` |
| any filter (for example `status`, `startDate`, `endDate`) | camelCase, and optional | — |

And return:

```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

The client calculates the number of pages as `ceil(total / limit)`.

## 5. Errors

Every error has the same shape, produced by `ValidationPipe` and
`DomainExceptionFilter`:

```json
{
  "statusCode": 400,
  "message": "Check-out must be after check-in",
  "error": "Bad Request"
}
```

- Messages are in **English**. They are meant for developers and are not shown to users
  as-is; the frontend translates them.
- A message states what's wrong, not how the code works:
  `"Unit not found"`, not `"findById returned null"`.
- Validation errors can carry a list of messages in `message`.

## 6. Swagger

Every endpoint is documented where it's defined:

- `@ApiTags` on the controller, and `@ApiOperation({ summary })` on each route.
- `@ApiBearerAuth('JWT-auth')` or `@ApiBearerAuth('GuestJWT-auth')` on protected routes,
  and `@Public()` on open ones.
- `@ApiResponse` for the success status and the expected errors.
- Request and response DTOs with `@ApiProperty` on every field, so the schema is complete.


