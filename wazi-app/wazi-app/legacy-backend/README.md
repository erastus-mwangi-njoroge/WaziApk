# WAZI backend

Plain Node.js — no `npm install` required. Uses only built-in modules
(`http`, `fs`, `path`, `crypto`).

## Run

```
node server.js
```

Env vars:
- `PORT` — defaults to 4000

Data is stored in `data/db.json` (created automatically) and uploaded
photos in `data/uploads/`. Delete the `data/` folder to reset everything
back to the seeded demo listings.

## Auth

`POST /api/auth/register` `{name, email, phone, password, role}` → `{token, user}`
`POST /api/auth/login` `{email, password}` → `{token, user}`
`GET /api/me` (Bearer token) → `{user}`

Send the token as `Authorization: Bearer <token>` on subsequent requests.

## Listings

`GET /api/listings?town=&type=&minPrice=&maxPrice=&sort=&ownerId=&status=`
→ `{listings: [...]}`

`GET /api/listings/:id` → `{listing}`

`POST /api/listings` (Bearer, owner only) — **multipart/form-data**, fields:
- `title`, `type`, `town`, `price`, `deposit`, `desc` (text)
- `schoolKm`, `hospitalKm`, `policeKm`, `industryKm`, `roadKm` (numbers)
- `roadType` (`Tarmac`|`Murram`), `water` (`Piped`|`Borehole`|`Tank`), `electricity` (`true`|`false`)
- `premiseImage` — **file, required** (whole compound/premise photo)
- `interiorImages` — file(s), optional, repeat the field up to 8 times

Returns `{listing}` or `400` if `premiseImage` is missing.

`PATCH /api/listings/:id` (Bearer, owner of that listing) `{status: "vacant"|"occupied"}`
→ `{listing}`. Setting `status` to `vacant` re-checks every tenant's saved
preferences and pushes a notification to anyone who matches.

`DELETE /api/listings/:id` (Bearer, owner of that listing) → `204`

## Favorites

`GET /api/favorites` (Bearer) → `{favIds, listings}`
`POST /api/favorites/:id` (Bearer) → toggles, returns `{favIds}`

## Preferences (tenant alerts)

`GET /api/preferences` (Bearer) → `{preferences}` (or `null`)
`PUT /api/preferences` (Bearer) `{town, type, minPrice, maxPrice}` → `{preferences}`

## Notifications

`GET /api/notifications` (Bearer) → `{notifications}`
`POST /api/notifications/read` (Bearer) → marks all as read

## Images

`GET /uploads/<filename>` — serves an uploaded photo directly.

## Notes on the storage model

`data/db.json` is a single JSON file loaded into memory and rewritten after
every mutation — perfectly fine for a demo or a small/medium deployment,
but it isn't built for high concurrent write volume. If you outgrow it,
swap `loadDB`/`saveDB` in `server.js` for a real database; the route
handlers don't need to change much since they just read/write plain
JS objects.
