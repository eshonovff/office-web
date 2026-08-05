# 04 — Шартномаи API

`baseURL = VITE_API_URL + "/api"` · `withCredentials: true` (барои refresh cookie)

## Auth

| Метод | Роҳ | Эзоҳ |
|---|---|---|
| POST | `/auth/login` | `{username, password}` → `{accessToken, expiresInSeconds, mustChangePassword}` |
| POST | `/auth/refresh` | cookie-ро истифода мебарад, токени нав медиҳад |
| POST | `/auth/logout` | |
| POST | `/auth/change-password` | `{currentPassword, newPassword}` |
| GET | `/auth/me` | `{id, fullName, username, avatarUrl, roles[], permissions[], mustChangePassword}` |

`mustChangePassword: true` → маҷбуран ба `/change-password`, дигар роут кушода нашавад.

## Users / Roles

```
GET    /users              PATCH  /users/{id}
GET    /users/{id}         PUT    /users/{id}/roles         { roleIds: [] }
POST   /users              PUT    /users/{id}/permissions   { key, isGranted }[]
POST   /users/{id}/reset-password
PATCH  /users/{id}/active
GET    /roles              POST   /roles
GET    /permissions        PUT    /roles/{id}/permissions
```

## Projects / Tasks

```
GET    /projects                      POST   /projects
GET    /projects/{id}/board           ← колонкаҳо бо таскҳо, як query
PUT    /projects/{id}/members
POST|PATCH|DELETE  /projects/{id}/columns
PUT    /projects/{id}/columns/order

GET    /tasks?...          POST   /tasks         PATCH /tasks/{id}
PATCH  /tasks/{id}/move    { columnId, beforeTaskId?, afterTaskId? }
PATCH  /tasks/{id}/assign  { assigneeId | null }
GET    /tasks/{id}/activity
```

## Inbox

```
GET    /conversations?channelId&status&assignedTo&unread&tag&q&cursor&limit
GET    /conversations/board                ← гурӯҳбандӣ аз рӯи статус
GET    /conversations/{id}/messages?cursor&limit
POST   /conversations/{id}/messages
POST   /conversations/{id}/notes           ← ёддошти дохилӣ
PATCH  /conversations/{id}/status
PATCH  /conversations/{id}/assign
POST   /conversations/{id}/read
PUT    /conversations/{id}/tags
GET    /channels           GET  /templates?channelType=
```

## SignalR

| Hub | Гурӯҳ | Event |
|---|---|---|
| `/hubs/board` | `project:{id}` | `TaskCreated`, `TaskMoved`, `TaskUpdated`, `TaskDeleted`, `CommentAdded` |
| `/hubs/inbox` | `user:{id}`, `channel:{id}` | `MessageReceived`, `MessageSent`, `ConversationAssigned`, `ConversationStatusChanged` |

Токен тавассути query string мегузарад (WebSocket header-ро дастгирӣ намекунад).

## Хатогиҳо

Ҳама `ProblemDetails`, матни `detail` тоҷикӣ.

| Код | Маъно | Рафтори frontend |
|---|---|---|
| 400 | валидатсия | хато дар форма |
| 401 | токен нест/тамом | refresh, баъд такрор; агар refresh наравад → logout |
| 403 | доступ нест | toast, дар ин ҷо намонад |
| 404 | нест **ё доступ ба объект нест** | саҳифаи «ёфт нашуд» |
| 409 | ихтилоф | toast бо матни сервер |
| 429 | зиёд кӯшиш | toast, тугмаро блок кун |

## Cursor pagination

```
GET /conversations?cursor=<opaque>&limit=50
→ { items: [], nextCursor: string | null }
```
`useInfiniteQuery`, на `useQuery` бо саҳифа.
