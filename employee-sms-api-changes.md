# Тағйирот дар API-и Users — логин бо телефон + SMS + расм

> Барои frontend: чӣ тағйир ёфт дар `POST/PATCH/GET /api/users`.
> Пермишн бетағйир монд — ҳама чиз тавассути `users.manage`/`users.view`.

## 1. Сохтани корманди нав — `POST /api/users`

**Тағйирот:**
- Майдони `username` бартараф шуд. Ҳоло login = рақами телефони
  нормализатсияшуда, худи система месозад.
- **Content-Type тағйир ёфт: ҳоло `multipart/form-data` аст, на JSON**
  (то расмро ҳамон замон, дар як дархост гузоштан мумкин бошад).

### Request — `multipart/form-data`

Майдонҳо (ҳамчун form fields, на JSON body):

| Майдон | Ҳатмӣ? | Тавзеҳ |
|---|---|---|
| `fullName` | ҳа | |
| `phone` | ҳа | `+992XXXXXXXXX`, `992XXXXXXXXX` ё `XXXXXXXXX` (9 рақами маҳаллӣ). Дар сервер ба `992XXXXXXXXX` меояд ва ҳамчун `username` захира мешавад |
| `email` | не | |
| `birthDate` | не | Формат `YYYY-MM-DD` |
| `address` | не | |
| `gender` | не | Танҳо `"Male"` ё `"Female"` |
| `avatar` | не | Файли расм — `.jpg .jpeg .png .webp`. Агар гузошта нашавад, корманд бе расм сохта мешавад |

Мисоли `curl` (барои дарки шакли дархост):

```bash
curl -X POST https://.../api/users \
  -H "Authorization: Bearer $TOKEN" \
  -F "fullName=Аҳмадов Аҳмад" \
  -F "phone=+992927777777" \
  -F "email=ahmad@example.com" \
  -F "birthDate=1998-05-12" \
  -F "address=Душанбе, кӯчаи Рӯдакӣ 12" \
  -F "gender=Male" \
  -F "avatar=@photo.jpg;type=image/jpeg"
```

- Пароли автоматӣ **8 рақами оддӣ** аст (мас. `48213097`) — барои
  осонии дохилкунӣ аз SMS.

### Response `201 Created`

```json
{
  "id": "019fd6fe-c425-762c-af25-db7a03b97689",
  "username": "992927777777",
  "temporaryPassword": "48213097",
  "smsSent": true,
  "avatarUrl": "/api/users/019fd6fe-c425-762c-af25-db7a03b97689/avatar"
}
```

- `avatarUrl` — `null` агар `avatar` фиристода нашуда бошад.
- Парол ҳам дар response нишон дода мешавад (HR метавонад дар экран
  бинад, як маротиба), ҳам тавассути SMS ба рақами корманд фиристода
  мешавад.
- `smsSent: false` маънои онро дорад, ки корманд сохта шуд, аммо SMS
  нарасид (гейтвей дастнорас буд ва ғ.) — дар ин ҳолат паролро аз
  экран ба корманд гуфтан лозим, ё баъдтар `POST /api/users/{id}/reset-password`-ро
  даъват кардан мумкин аст (ҳамон тавр SMS мефиристад).
- `400 Bad Request` (`ValidationProblem`) — хатои валидатсия
  (масалан `phone` формати нодуруст, `avatar` навъи иҷозатнашуда/калон).
- `409 Conflict` агар рақами телефон аллакай сабт шуда бошад.

## 2. Навсозии корманд — `PATCH /api/users/{id}`

Ин endpoint **ҳамон JSON тарзи қаблӣ мондааст** (бе файл). `phone`/`username`
дигар дар он нест — рақами телефон (=login) пас аз сохтан иваз намешавад.

```json
{
  "fullName": "Аҳмадов Аҳмад",
  "email": "ahmad@example.com",
  "birthDate": "1998-05-12",
  "address": "Душанбе, кӯчаи Рӯдакӣ 12",
  "gender": "Male",
  "onlyAssigned": false
}
```

Барои иваз кардани расм ё шартнома ҳангоми эдит — бинед бахши 3 ва 4
(endpoint-ҳои алоҳида, дар кадом вақт даъват шаванд).

## 3. Расми корманд (avatar)

Дар формаи "Корманди нав" расм **дар ҳамон дархости сохтан** (бахши 1,
майдони `avatar`) меравад. Дар формаи "Эдит" — бо endpoint-и алоҳида:

- **`POST /api/users/{id}/avatar`** — `multipart/form-data`, майдони
  файл: `file`. Танҳо `.jpg .jpeg .png .webp`. Response: `200 OK` бо
  `UserDetail`-и нав (аз он `avatarUrl`-и навро гиред). Бор кардани
  расми нав қаблиро иваз мекунад.
- **`GET /api/users/{id}/avatar`** — боргирии расм
  (`application/octet-stream`), пермишн `users.view` (на
  `users.manage` — ҳама метавонанд бинанд). `404` агар расм гузошта
  нашуда бошад.
- `avatarUrl` ҳамеша ба ҳамин шакл аст: `/api/users/{id}/avatar` — ин
  **на URL-и оммавӣ** аст, балки роҳи ҳамин API. Барои нишон додан дар
  `<img>`, frontend бояд бо `Authorization` header фетч карда, ба
  `blob:` URL табдил диҳад — сервер файлро статикӣ/оммавӣ пешниҳод
  намекунад.

## 4. Ҳуҷҷати шартнома (contract document)

Шартнома (баръакси расм) **дар дархости сохтан ҷой надорад** — ҳамеша
бо endpoint-и алоҳида, дар формаи "Корманди нав" низ баъди
`POST /api/users` бо `id`-и баргашта даъват мешавад:

- **`POST /api/users/{id}/contract-document`** — `multipart/form-data`,
  майдони файл: `file`. Навъҳои иҷозатдодашуда: `.pdf .doc .docx .jpg .jpeg .png`,
  лимити ҳаҷм = ҳамон `Uploads:MaxSizeBytes` (20 МБ пешфарз). Бор кардани
  файли нав ҷои қаблиро иваз мекунад. Response: `204 No Content`.
- **`GET /api/users/{id}/contract-document`** — боргирии файл
  (`application/octet-stream`). `404` агар ҳуҷҷат гузошта нашуда бошад.

## 5. Рӯйхати корманд — `GET /api/users`

**Тағйирот:** `UserListItem` пеш танҳо `id/fullName/username/isActive/roles`
дошт. Ҳоло ҳамаи майдонҳои профил ҳам дар рӯйхат ҳастанд (барои ҷадвал/
карточкаи корманд бо расм, бе дархости иловагии `GET /api/users/{id}` барои
ҳар сатр):

```json
[
  {
    "id": "...",
    "fullName": "Аҳмадов Аҳмад",
    "username": "992927777777",
    "phone": "992927777777",
    "email": "ahmad@example.com",
    "birthDate": "1998-05-12",
    "age": 28,
    "address": "Душанбе, кӯчаи Рӯдакӣ 12",
    "gender": "Male",
    "avatarUrl": "/api/users/.../avatar",
    "hasContractDocument": true,
    "isActive": true,
    "mustChangePassword": false,
    "roles": [{ "id": "...", "key": "owner", "name": "Соҳиб" }]
  }
]
```

(`permissionExceptions` дар рӯйхат нест — он танҳо дар
`GET /api/users/{id}` меояд, чун барои таҳрир лозим аст, на барои рӯйхат.)

`age` — синну соли пурраи ҳисобшуда аз `birthDate` то имрӯз (сервер
ҳисоб мекунад, frontend лозим нест ҳисоб кунад). `null` агар `birthDate`
гузошта нашуда бошад.

## 6. Маълумоти пурраи корманд — `GET /api/users/{id}`

Майдонҳои нав дар response:

```json
{
  "id": "...",
  "fullName": "...",
  "username": "992927777777",
  "phone": "992927777777",
  "email": "ahmad@example.com",
  "birthDate": "1998-05-12",
  "age": 28,
  "address": "Душанбе, кӯчаи Рӯдакӣ 12",
  "gender": "Male",
  "hasContractDocument": true,
  "avatarUrl": "/api/users/019fd6fe-c425-762c-af25-db7a03b97689/avatar",
  "isActive": true,
  "mustChangePassword": true,
  "onlyAssigned": false,
  "roles": [...],
  "permissionExceptions": [...]
}
```

`hasContractDocument` — `true`/`false`, худи файл дар ин response нест.

## 7. Пароли нав — `POST /api/users/{id}/reset-password`

Response тағйир ёфт — `smsSent` илова шуд:

```json
{ "temporaryPassword": "70325148", "smsSent": true }
```

## Хулоса барои frontend

- Формаи "Корманди нав" бояд майдони "Логин" надошта бошад — фақат
  рақами телефон (бо валидатсия `+992XXXXXXXXX`).
- Формаи "Корманди нав" бояд `multipart/form-data` фиристад (на
  `application/json`) — бо майдонҳои профил + `avatar` (ихтиёрӣ) дар
  ҳамон як дархост.
- Пас аз сохтан, паролро нишон диҳед (як маротиба) ва хабар диҳед,
  ки SMS фиристода шуд ё не (`smsSent`).
- Ҳуҷҷати шартнома дар формаи "Корманди нав" ҷой надорад — бояд баъди
  муваффақи сохтан, бо `id`-и баргашта алоҳида бор карда шавад
  (`POST /api/users/{id}/contract-document`).
- Дар формаи "Эдит" — расм ва шартнома ҳарду бо endpoint-и алоҳида
  (бахши 3 ва 4) иваз мешаванд, на дар `PATCH /api/users/{id}`.
- Рӯйхати корманд (`GET /api/users`) ҳоло расм, телефон, email ва ғ.-ро
  низ дорад — барои ҷадвал/карточка дархости иловагӣ лозим нест.
