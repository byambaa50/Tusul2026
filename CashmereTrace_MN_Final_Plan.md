
# CashmereTrace MN --- Дипломын төслийн эцсийн төлөвлөгөө

**Төслийн нэр:** Монгол ноолуурын гарал үүсэл, чанарын мэдээллийн
бүртгэл, хяналтын веб систем\
**Код нэр:** CashmereTrace MN\
**Төлөв:** Эцсийн төлөвлөгөө --- Plan only\
**Хувилбар:** 1.0\
**Хугацаа:** 4 сар / 16 долоо хоног\
**UI хэл:** Монгол үндсэн, Англи нэмэлт\
**Database нэршил:** English `snake_case`

> Энэ баримт бичиг нь дипломын PDF-д заасан V1 хүрээг хатуу баримтална.
> Гэрчилгээ, экспортын мэдүүлэг, хяналт шалгалт, төлбөр, ложистик,
> blockchain болон лабораторийн шууд интеграц V1-д орохгүй. Код
> бичээгүй, төсөлд файл үүсгээгүй.

------------------------------------------------------------------------

## 1. Төслийн зорилго ба асуудал

### 1.1 Асуудал

Ноолуурын гарал үүсэл, нийлүүлэгч, багц болон чанарын мэдээлэл цаасан
баримт, Excel зэрэг салангид хэлбэрээр хадгалагддаг. Үүнээс шалтгаалан
гарал үүслийг мөрдөн тогтоох, багцын чанарын мэдээллийг нэгтгэн харах,
хэрэглэгчид баталгаатай мэдээлэл хүргэхэд хүндрэл үүсдэг.

### 1.2 Зорилго

Монгол ноолуурын нийлүүлэгч, гарал үүсэл, түүхий эдийн багц,
лабораторийн чанарын үр дүнг нэгдсэн веб системд бүртгэж, QR кодоор
зөвшөөрөгдсөн мэдээллийг олон нийтэд хурдан шалгах боломж бүрдүүлэх.

### 1.3 Хэмжигдэхүйц зорилтууд

-   Гарал үүслийн бүртгэлийг цахимжуулах.
-   Чанарын үр дүнг тухайн багцтай холбох.
-   QR шалгалтын мэдээллийг 10 секундээс бага хугацаанд харуулах.
-   Багц хайлтыг 2 секундээс бага хугацаанд гүйцэтгэх.
-   Хэрэглэгчийн эрхээр өгөгдөлд хандах боломжийг хязгаарлах.
-   Өөрчлөлтийн түүхийг аудитын бүртгэлд хадгалах.

------------------------------------------------------------------------

## 2. V1-ийн батлагдсан хүрээ

### 2.1 V1-д багтах функц

1.  Нийлүүлэгч өөрөө бүртгүүлэх; админ батлах/татгалзах.
2.  Нийлүүлэгч өөрийн нийлүүлэлтийн хэмжээ, гарал үүслийн мэдээлэл
    оруулах.
3.  Бүртгэлийн ажилтан нийлүүлэгч болон ноолуурын багц бүртгэх, засах,
    хайх.
4.  Багцын дугаарыг автоматаар үүсгэх, давхардлыг хориглох.
5.  Багцад QR код үүсгэх.
6.  Чанарын ажилтан багцыг хайж, лабораторийн үр дүнг гараар бүртгэх.
7.  Чанарын өмнөх үр дүнг харьцуулах.
8.  QR хуудсанд нийтэд харагдах талбаруудыг чанарын ажилтан сонгох.
9.  Нэвтрэлтгүй олон нийтийн QR баталгаажуулалтын хуудас.
10. Удирдлагын статистик, аймаг/сумын харьцуулалт, тайлан.
11. Админ хэрэглэгч, эрх, тохиргоо, аудитын бүртгэл удирдах.

### 2.2 V1-д орохгүй

-   Албан ёсны гарал үүсэл, чанарын болон экспортын гэрчилгээ олгох.
-   Экспортын мэдүүлэг, гаалийн процесс.
-   Хяналт шалгалтын тусгай workflow.
-   Лабораторийн шинжилгээ хийх, лабораторийн API интеграц.
-   Төрийн системтэй API интеграц.
-   Төлбөр, агуулах, тээвэр, ложистик, үйлдвэрийн автоматжуулалт.
-   Blockchain.
-   Native mobile application.
-   Багц хуваах/нэгтгэх, custody transfer.
-   AI/ML үнэлгээ, таамаглал.

Эдгээрийг дипломын V1-ийн шаардлага гэж танилцуулахгүй. Цаашдын
хөгжүүлэлтийн санал хэсэгт дурьдаж болно.

------------------------------------------------------------------------

## 3. Технологийн архитектур

### 3.1 Сонгосон технологи

  -----------------------------------------------------------------------
  Давхарга                Технологи               Үүрэг
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js App Router,     Хэрэглэгчийн веб
                          TypeScript              интерфэйс, public QR
                                                  хуудас

  UI                      Tailwind CSS, shadcn/ui Дизайн систем,
                                                  компонент

  Backend                 Node.js, Express.js,    REST API, бизнес дүрэм,
                          TypeScript              RBAC, аудит

  Database                Supabase PostgreSQL     Өгөгдөл, холбоос,
                                                  индекс, transaction

  Authentication          Supabase Auth           Нэвтрэлт, хэрэглэгчийн
                                                  identity, token

  File storage            Supabase Storage        QR PNG болон
                                                  шаардлагатай хавсралт

  Validation              Zod                     API оролтын шалгалт

  Data fetching           TanStack Query          Frontend API төлөв

  Forms                   React Hook Form + Zod   Формын удирдлага

  Charts                  Recharts                Статистик график

  Maps                    Leaflet + OpenStreetMap Аймаг/сумын байршлын
                                                  дүрслэл шаардлагатай
                                                  үед

  i18n                    next-intl               Монгол/Англи хэл

  Deployment              Vercel +                Үүлэн байршуулалт
                          Render/Railway +
                          Supabase
  -----------------------------------------------------------------------

Хувилбарын дугаарыг эхлүүлэх үед тухайн үеийн тогтвортой хувилбараас
сонгоно. Next.js 15, Node.js 20+ зэрэг өмнөх төлөвлөгөөний хувилбаруудыг
шууд түгжихгүй; compatibility шалгана.

### 3.2 3 давхаргат архитектур

**1. Next.js --- Presentation layer** - Dashboard, бүртгэлийн форм,
хүснэгт, график. - Монгол үндсэн UI, Англи хэлний сонголт. - Public
`/verify/[token]` хуудас. - UX түвшний validation ба алдааны мэдээлэл. -
Бизнес эрхийн эцсийн шийдвэрийг frontend дээр дангаар гаргахгүй.

**2. Express.js --- Application/API layer** - `/api/v1` REST API. -
Supabase JWT шалгалт. - Role-based access control (RBAC). -
Нийлүүлэгчийн ownership шалгалт. - Zod request validation. - Багцын
дугаар үүсгэх RPC дуудлага. - Чанарын үр дүн, QR public whitelist,
аудит, тайлангийн логик. - Нэгдсэн алдааны формат.

**3. Supabase --- Data/Identity layer** - PostgreSQL хүснэгт, FK, unique
constraint, index, transaction. - RLS нь эцсийн хамгаалалтын давхарга. -
Supabase Auth identity provider. - Supabase Storage private bucket болон
signed URL. - DB function/RPC зөвхөн шаардлагатай нарийн эрхтэй байна.

### 3.3 Өгөгдлийн урсгал

Browser → Next.js → Express `/api/v1` → Supabase
Auth/PostgreSQL/Storage.\
Public QR: Browser → Next.js `/verify/[token]` → Express public verify
endpoint → хязгаарлагдсан verify function → зөвшөөрөгдсөн талбарууд.

Frontend-д `service_role` түлхүүр хэзээ ч байрлуулахгүй. Ердийн
хэрэглэгчийн өгөгдлийн үйлдэлд хэрэглэгчийн JWT бүхий request-scoped
Supabase client болон RLS ашиглана. Давуу эрхтэй серверийн функцүүдийг
тусгаарлаж, зөвхөн шаардлагатай үйлдэлд хэрэглэнэ.

------------------------------------------------------------------------

## 4. Хэрэглэгчийн роль ба эрх

  -----------------------------------------------------------------------
  Роль                                Үндсэн эрх
  ----------------------------------- -----------------------------------
  Нийлүүлэгч (supplier)               Өөрөө бүртгүүлэх, батлагдсаны дараа
                                      нэвтрэх, өөрийн нийлүүлэлт/гарал
                                      үүсэл оруулах, өөрийн чанарын
                                      мэдээлэл харах

  Бүртгэлийн ажилтан                  Нийлүүлэгч бүртгэх, багц
  (registration_clerk)                бүртгэх/засах/хайх, QR үүсгэх,
                                      гарал үүслийн мөрдөх мэдээлэл харах

  Чанарын ажилтан (quality_staff)     Багц хайх, лабораторийн үр дүн
                                      гараар оруулах, үр дүн харьцуулах,
                                      QR-д харагдах талбар сонгох

  Удирдлага (management)              Статистик, тайлан, аймаг/сумын
                                      харьцуулалт харах; өгөгдөл засахгүй

  Админ (admin)                       Хэрэглэгч, роль, эрх, тохиргоо,
                                      аудит удирдах; нийлүүлэгчийн хүсэлт
                                      батлах/татгалзах

  Олон нийтийн хэрэглэгч (public)     Нэвтрэхгүйгээр QR уншуулж
                                      зөвшөөрөгдсөн мэдээлэл харах
  -----------------------------------------------------------------------

**Эрхийн үндсэн зарчим** - Supplier зөвхөн өөрийн өгөгдөлд хандана. -
Clerk багцын бүртгэл, засварыг хариуцна. - Quality staff багцын үндсэн
мэдээллийг засахгүй; чанарын үр дүн оруулж, public талбар сонгоно. -
Management read-only. - Admin системийн удирдлагын эрхтэй. - Public
зөвхөн тусгай verify endpoint-оор whitelist мэдээлэл харна.

------------------------------------------------------------------------

## 5. Database ERD ба schema

### 5.1 Үндсэн хүснэгтүүд

  -----------------------------------------------------------------------
  Table                   Гол багана              Тайлбар
  ----------------------- ----------------------- -----------------------
  `profiles`              `id`, `app_role`,       `auth.users`-тай
                          `provider_type`,        нэг-нэг холбоотой
                          `full_name`, `phone`,   хэрэглэгчийн профайл
                          `aimag_code`,
                          `sum_code`, `status`,
                          `failed_attempts`,
                          `locked_until`

  `supply_info`           `id`, `supplier_id`,    Нийлүүлэлтийн хэмжээ,
                          `weight_kg`,            гарал үүслийн мэдээлэл
                          `aimag_code`,
                          `sum_code`,
                          `livestock_count`,
                          `declared_date`

  `batch`                 `id`, `batch_code`,     Ноолуурын багц; batch
                          `weight_kg`,            code unique
                          `received_date`,
                          `status`,
                          `supplier_id`,
                          `registered_by_id`,
                          `created_at`

  `quality_test`          `id`, `batch_id`,       Лабораторийн үр дүн;
                          `fineness`,             зөвхөн INSERT
                          `clean_yield`,
                          `admixture`,
                          `lab_result`,
                          `test_date`,
                          `created_by_id`,
                          `created_at`

  `qr_code`               `id`, `batch_id`,       Нэг багцад хамгийн
                          `token`, `status`,      ихдээ нэг идэвхтэй QR
                          `created_at`            бүртгэл

  `publish_config`        `batch_id`,             QR хуудсанд харагдах
                          `published_fields`,     талбарын тохиргоо
                          `status`, `updated_at`

  `audit_log`             `id`, `occurred_at`,    Өөрчлөлтийн түүх
                          `action`, `entity`,
                          `entity_id`,
                          `actor_id`,
                          `actor_role`, `detail`,
                          `ip_hash`

  `system_config`         `key`, `value`,         Системийн тохиргоо
                          `updated_by_id`,
                          `updated_at`

  `batch_counter`         `year`, `sequence`      Жил тус бүрийн багцын
                                                  дугаарын дараалал
  -----------------------------------------------------------------------

`aimag_code`, `sum_code` нь урьдчилан баталгаажсан лавлах утгатай байна.
Аймаг/сумын лавлах өгөгдлийг seed хэлбэрээр оруулж болно. Лавлах хүснэгт
шаардлагатай бол `aimags`, `sums` гэсэн хоёр хүснэгтээр нормчилно.

### 5.2 ERD холбоос

``` mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : has
    PROFILES ||--o{ SUPPLY_INFO : declares
    PROFILES ||--o{ BATCH : supplies
    PROFILES ||--o{ BATCH : registers
    BATCH ||--o{ QUALITY_TEST : has
    PROFILES ||--o{ QUALITY_TEST : enters
    BATCH ||--o| QR_CODE : has
    BATCH ||--o| PUBLISH_CONFIG : configures
    PROFILES ||--o{ AUDIT_LOG : performs
    PROFILES ||--o{ SYSTEM_CONFIG : updates
    BATCH_COUNTER }o--|| BATCH : numbers
```

### 5.3 Өгөгдлийн бүрэн бүтэн байдал

-   `batch.batch_code` unique: давхардсан дугаар үүсэхгүй.
-   `batch.supplier_id` заавал байна.
-   `quality_test.batch_id` заавал байна.
-   `qr_code.batch_id` unique байна.
-   `qr_code.token` unique байна.
-   Хэрэглэгч, нийлүүлэгч, багц, чанарын түүхийг UI-аас физикээр
    устгахгүй; soft deactivation/status хэрэглэнэ.
-   FK дээр түүх устгах эрсдэлтэй `ON DELETE CASCADE` ашиглахгүй. NO
    ACTION/RESTRICT бодлого хэрэглэнэ.
-   `quality_test` нь INSERT-ONLY. Засвар шаардвал шинэ үр дүн нэмэх
    зарчмыг зөвхөн бизнес дүрэм албан ёсоор баталсны дараа хэрэгжүүлнэ.
-   Хэмжилтийн min/max хязгаарыг MNS/ISO эсвэл лабораторийн баталгаатай
    стандартгүйгээр зохиож оруулахгүй.
-   Нэг багцын хамгийн сүүлийн үр дүнг `created_at DESC, id DESC`
    дарааллаар тодорхойлно. `test_date` нь тайлангийн/дэлгэцийн огноо
    болохоос latest ordering биш.

### 5.4 Багцын дугаар

Формат: `MN-YYYY-000001`.\
Дугаарлалт `batch_counter` хүснэгтийн тухайн жилийн мөрийг transaction
дотор `SELECT ... FOR UPDATE` ашиглан түгжиж, нэг PostgreSQL RPC дотор
нэмэгдүүлэн, багц ба аудитын мөрийг хамтад нь хадгална. Олон тусдаа API
round-trip-ээр дугаар үүсгэхгүй.

------------------------------------------------------------------------

## 6. Системийн үндсэн модулиуд

1.  **Нэвтрэлт ба session:** login, logout, token refresh, account
    status.
2.  **Нийлүүлэгчийн бүртгэл:** self-registration, admin
    approval/rejection, supplier profile.
3.  **Нийлүүлэлт ба гарал үүсэл:** жин/хэмжээ, аймаг, сум, малын тоо,
    огноо.
4.  **Багцын бүртгэл:** багц үүсгэх, автоматаар дугаарлах, хайх, засах.
5.  **QR код:** QR үүсгэх, дахин үүсгэх/токен солих, хэвлэхэд бэлэн
    зураг.
6.  **Чанарын бүртгэл:** лабораторийн үр дүн гараар оруулах, өмнөх үр
    дүнтэй харьцуулах.
7.  **QR public verification:** нэвтрэлтгүй, зөвшөөрөгдсөн талбар
    харуулах.
8.  **Удирдлагын dashboard:** нийлүүлэлтийн статистик, чанарын
    статистик, аймаг/сумын харьцуулалт.
9.  **Тайлан ба аудит:** тайлан гаргах/татах, өөрчлөлтийн бүртгэл харах.
10. **Админ тохиргоо:** хэрэглэгч, роль, системийн тохиргоо, нийлүүлэгч
    батлах.

------------------------------------------------------------------------

## 7. Хуудас ба навигац

### 7.1 Public хэсэг

-   `/` --- танилцуулга, системийн тухай.
-   `/verify/[token]` --- QR шалгалтын үр дүн.
-   `/transparency` --- системийн ерөнхий, хувийн мэдээлэлгүй статистик
    (зөвшөөрөгдсөн бол).
-   `/login` --- нэвтрэх.
-   `/register` --- нийлүүлэгчийн бүртгэл.

### 7.2 Нэвтэрсэн хэрэглэгчийн хэсэг

-   `/app/dashboard` --- рольд тохирсон dashboard.
-   `/app/my-supply` --- нийлүүлэгчийн нийлүүлэлтийн мэдээлэл.
-   `/app/my-quality` --- өөрийн багцын чанарын мэдээлэл.
-   `/app/suppliers` --- нийлүүлэгчийн жагсаалт, бүртгэл (clerk/admin).
-   `/app/batches` --- багцын жагсаалт, хайлт, бүртгэл.
-   `/app/batches/[id]` --- багцын дэлгэрэнгүй, гарал үүслийн мөр.
-   `/app/quality` --- чанарын үр дүн оруулах, харьцуулах.
-   `/app/qr` --- QR үүсгэх/хэвлэх.
-   `/app/reports` --- статистик, тайлан.
-   `/app/admin/users` --- хэрэглэгч, роль.
-   `/app/admin/approvals` --- supplier approval queue.
-   `/app/admin/settings` --- системийн тохиргоо.
-   `/app/admin/audit-logs` --- аудитын бүртгэл.

Хуудас бүрийн цэс, үйлдлийн товчийг role-оор харуулна. Гэхдээ хамгаалалт
зөвхөн UI-д найдахгүй; API ба RLS дээр дахин шалгана.

------------------------------------------------------------------------

## 8. REST API төлөвлөгөө

Base path: `/api/v1`. Бүх endpoint JWT шаарддаг эсэхийг endpoint бүрээр
тогтооно. Public verify нь тусгай exception.

### 8.1 Auth

-   `POST /auth/register`
-   `POST /auth/login`
-   `POST /auth/logout`
-   `POST /auth/refresh`
-   `GET /auth/me`

### 8.2 Suppliers

-   `GET /suppliers`
-   `POST /suppliers`
-   `GET /suppliers/:id`
-   `PATCH /suppliers/:id`
-   `POST /suppliers/:id/approve`
-   `POST /suppliers/:id/reject`

### 8.3 Supply information

-   `GET /supply-info`
-   `POST /supply-info`
-   `GET /supply-info/:id`
-   `PATCH /supply-info/:id`

### 8.4 Batches and traceability

-   `GET /batches`
-   `POST /batches` --- atomic numbering RPC ашиглана
-   `GET /batches/:id`
-   `PATCH /batches/:id`
-   `GET /batches/:id/trace`
-   `GET /batches/:id/qr`
-   `POST /batches/:id/qr`

### 8.5 Quality

-   `GET /quality/results`
-   `POST /quality/results`
-   `GET /quality/results/:id`
-   `GET /batches/:id/quality`
-   `GET /batches/:id/quality/compare`
-   `PATCH /batches/:id/publish-fields`

`quality/results` дээр UPDATE/DELETE endpoint төлөвлөхгүй.

### 8.6 Public verification

-   `GET /public/verify/:token` --- login шаардлагагүй; зөвхөн whitelist
    мэдээлэл.

### 8.7 Reports and administration

-   `GET /reports/supply`
-   `GET /reports/quality`
-   `GET /reports/regions`
-   `POST /reports/export`
-   `GET /admin/users`
-   `POST /admin/users`
-   `PATCH /admin/users/:id/role`
-   `PATCH /admin/users/:id/status`
-   `GET /admin/settings`
-   `PATCH /admin/settings`
-   `GET /admin/audit-logs`

Нэгдсэн response envelope: `{ data, error, meta }`. Жишээ статус: 400
validation, 401 unauthenticated, 403 forbidden/pending, 404 not found,
409 duplicate, 423 locked, 429 rate limited. Error response дотоод SQL
болон secret мэдээлэл ил гаргахгүй.

------------------------------------------------------------------------

## 9. Security архитектур

1.  **Authentication:** Supabase Auth. Нууц үг, identity-г өөрсдөө
    хадгалахгүй.
2.  **JWT validation:** Express хүсэлт бүр дээр Supabase JWT-ийн гарын
    үсэг, хугацаа, issuer-ийг шалгана.
3.  **RBAC:** Middleware болон service layer дээр role шалгана.
4.  **Ownership:** Supplier өөрийн supplier_id-тэй холбоотой мөрөнд л
    хандана.
5.  **RLS:** PostgreSQL дээр role/ownership нөхцөлтэй бодлого. RLS нь
    хамгаалалтын эцсийн давхарга.
6.  **Secrets:** `service_role` зөвхөн server-side secret; browser
    bundle, Git, log-д оруулахгүй.
7.  **Login lockout:** 5 удаагийн амжилтгүй оролдлогын дараах түгжээг
    зөвхөн итгэмжлэгдсэн серверийн функц өөрчилнө. Түгжих хугацаа, reset
    нөхцөлийг батлагдсан бизнес дүрмээс хэтрүүлж тогтоохгүй.
8.  **Public QR:** UUID санамсаргүй token, rate limit, token-ийг бүтнээр
    нь log хийхгүй, зөвхөн зөвшөөрсөн field catalog.
9.  **Privacy:** Хувь хүний нэр, утас, имэйл, нарийвчилсан хаяг, дотоод
    ID, audit мэдээлэл public endpoint-оор гарахгүй.
10. **Quality history:** INSERT-ONLY, түүх устгах/өөрчлөхгүй.
11. **Input validation:** Zod, parameterized query/RPC, SQL injection
    хамгаалалт.
12. **XSS/CSRF:** output escaping, CSP, cookie тохиргоо, origin/CORS
    хязгаарлалт.
13. **Transport:** HTTPS, Secure cookie, шаардлагатай HSTS.
14. **Audit:** Бүх өгөгдөл өөрчлөх үйлдэлд actor, timestamp, action,
    entity, entity_id хадгална.
15. **Backup:** өдөр тутмын backup шаардлагыг хэрэгжүүлэх арга нь
    Supabase plan-аас хамаарна; backup сэргээх туршилтыг roadmap-д
    оруулна.

Access token-ийн 8 цагийн шаардлагыг Supabase төслийн тохиргоо болон
тухайн plan-ийн боломжтой тулгаж баталгаажуулна. Refresh token-ийн
хугацаа ба rotation тусдаа тохиргоо; хэрэгжүүлэх үед албан ёсны Supabase
тохиргоотой тулгана.

### 9.1 QR public whitelist

Зөвшөөрөгдөх талбарын жишээ: - Багцын дугаар. - Аймаг, сум. -
Нийлүүлэлтийн жин (батлагдсан бол). - Малын тоо (нийтийн мэдээлэл болгох
зөвшөөрөлтэй бол). - Чанарын хамгийн сүүлийн үр дүн: нарийн ширхэгт,
цэвэр гарц, хольц, шинжилгээний огноо. - Нийтийн баталгаажуулалтын
төлөв.

Хориглох: - Хувь хүний нэр, утас, email, хаяг. - `supplier_id`, auth
ID. - Дотоод тэмдэглэл, audit log. - Өмнөх бүх шинжилгээний түүх. -
Storage-ийн хувийн файл, баримт.

------------------------------------------------------------------------

## 10. Premium Organic Biophilic + Glassmorphism дизайн

### 10.1 Дизайны үзэл баримтлал

Байгаль, ноолуурын гарал үүсэл, Монголын бэлчээрийн өнгө төрхийг
илэрхийлсэн premium enterprise dashboard. Цэвэрхэн, тайван, итгэл
төрүүлэхүйц, хэт их өнгө/эффектгүй.

### 10.2 Өнгөний систем

  Token            HEX         Хэрэглээ
  ---------------- ----------- ----------------------------------
  Forest           `#0D2B1F`   Sidebar, гол текст, dark surface
  Deep Forest      `#143B2A`   Hover, secondary dark
  Emerald          `#1E6B4A`   Primary action
  Bright Emerald   `#2F8F5B`   Positive state, chart accent
  Sage             `#A3B18A`   Secondary accent
  Cream            `#FAF8F0`   Үндсэн background
  Sand             `#D9CBAA`   Border, subtle surface
  Terracotta       `#B4552D`   Анхааруулга
  Gold             `#C9A227`   Онцлох/баталгаажуулалтын accent
  Ink              `#1C2A22`   Үндсэн бичвэр

### 10.3 Glassmorphism дүрэм

-   Light glass: цагаан өнгийн 60--70% opacity, `backdrop-blur`
    ойролцоогоор 16px, нарийн цагаан border.
-   Glass эффектийг зөвхөн том карт, dropdown, modal-д хэрэглэнэ.
-   Урт хүснэгт болон текст дээр glass transparency хэтрүүлэхгүй;
    уншигдах байдал нэгдүгээрт.
-   Сүүдэр зөөлөн, radius 16--24px.
-   Reduced motion болон өндөр contrast хэрэглэгчдийг дэмжинэ.

### 10.4 Typography

-   Гарчиг: Playfair Display эсвэл кирилл дэмждэг serif сонголт.
-   UI/body: Inter эсвэл кирилл бүрэн дэмждэг sans-serif.
-   Монгол кирилл үсгийн бүх glyph-ийг бодит төхөөрөмж дээр шалгана.

### 10.5 Dashboard layout

**Sidebar** - Лого: CashmereTrace MN. - Dashboard. - Нийлүүлэгчид. -
Нийлүүлэлт. - Багцууд. - Чанарын бүртгэл. - QR баталгаажуулалт. -
Тайлан. - Админ тохиргоо (зөвхөн админ).

**Top bar** - Breadcrumb. - Global search. - MN/EN language toggle. -
Notification. - Profile menu.

**Main content** - Welcome header + огноо. - KPI cards: нийт нийлүүлэгч,
нийт багц, шинжилгээтэй багц, QR шалгалтын тоо. - Supply trend chart. -
Quality distribution chart. - Аймаг/сумын харьцуулалт. - Сүүлийн
бүртгэлүүдийн хүснэгт. - Approval queue (admin-д).

KPI тоонуудыг бодит DB aggregate-ээс авна; demo data-г бодит production
metric мэт харуулахгүй.

### 10.6 Responsive

-   Desktop: sidebar тогтмол, 3--4 KPI column.
-   Tablet: sidebar collapse, 2 KPI column.
-   Mobile: bottom/slide navigation, нэг column, хүснэгт card/list
    хэлбэрт шилжинэ.
-   QR verify page mobile-first, хурдан ачаалалтай, том batch code,
    ойлгомжтой status.

### 10.7 UI component inventory

-   AppShell, Sidebar, Topbar, Breadcrumbs.
-   StatCard, ChartCard, DataTable, FilterBar.
-   StatusBadge, EmptyState, LoadingSkeleton.
-   ConfirmDialog, FormDialog, Toast.
-   SupplierForm, SupplyInfoForm, BatchForm, QualityResultForm.
-   QRPreview, PublicVerificationCard.
-   RoleGuard (зөвхөн UX; server authorization-ийг орлохгүй).

------------------------------------------------------------------------

## 11. Чанарын шалгалт ба тест

-   Unit test: бизнес дүрэм, batch numbering service wrapper,
    validation.
-   API integration: auth, RBAC, ownership, duplicate batch, quality
    insert-only.
-   RLS test: роль тус бүр өөрийн зөвшөөрсөн өгөгдөлд л хандаж буй эсэх.
-   Public QR test: invalid token, hidden record, whitelist bypass, PII
    leak, rate limit.
-   E2E: supplier registration → admin approval → supply entry → batch
    registration → quality result → QR verification.
-   Performance: QR ≤10 сек, search ≤2 сек, 50 concurrent user target.
-   Responsive: desktop/tablet/mobile.
-   Browser: Chrome, Firefox, Edge-ийн орчин үеийн хувилбарууд.
-   Backup restore rehearsal.

------------------------------------------------------------------------

## 12. 16 долоо хоногийн roadmap

  -----------------------------------------------------------------------
  Долоо хоног             Ажил                    Гарах үр дүн
  ----------------------- ----------------------- -----------------------
  W1                      Шаардлага, scope, ERD,  Эцсийн SRS/architecture
                          role matrix батлах

  W2                      Repo scaffold,          Суурь төсөл
                          environment, lint/test,
                          CI

  W3                      Supabase schema,        DB суурь
                          migrations, seed,
                          indexes

  W4                      Auth, profiles, RBAC,   Нэвтрэлт ба эрхийн
                          RLS                     alpha

  W5                      Supplier registration,  Нийлүүлэгчийн модуль
                          approval

  W6                      Supply/origin intake    Гарал үүслийн бүртгэл

  W7                      Batch registry, atomic  Багцын бүртгэл
                          numbering

  W8                      QR generation + public  QR урсгалын эхний
                          verify                  хувилбар

  W9                      Quality result entry,   Чанарын модуль
                          compare

  W10                     Management dashboard,   Dashboard
                          analytics

  W11                     Reports, admin, audit   Тайлан ба админ

  W12                     Integration, security,  Feature-complete
                          RLS tests               candidate

  W13                     Performance, backup,    Туршилтын хувилбар
                          bug fixing

  W14                     UI polish, responsive,  Demo-ready UI
                          MN/EN

  W15                     Thesis screenshots,     Дипломын материал
                          diagrams, test evidence

  W16                     Final QA, deployment,   Хамгаалалтад бэлэн
                          defense rehearsal
  -----------------------------------------------------------------------

Review gates: - W4: auth/RBAC/RLS зөв эсэх. - W8: QR public endpoint PII
гаргахгүй эсэх. - W12: бүх Must шаардлага биелсэн эсэх. - W16: backup
restore, demo flow, thesis consistency.

------------------------------------------------------------------------

## 13. Дипломын бичиг баримтын бүтэц

1.  **Нэгдүгээр бүлэг --- Судалгааны хэсэг:** асуудал, зорилго, ижил
    төстэй систем, технологийн судалгаа, үндэслэл.
2.  **Хоёрдугаар бүлэг --- Шинжилгээ ба зохиомж:** хэрэглэгчийн роль,
    FR/NFR, бизнес дүрэм, Use Case, Activity/Sequence, ERD, архитектур,
    UI wireframe.
3.  **Гуравдугаар бүлэг --- Хэрэгжүүлэлт:** технологийн орчин, DB, API,
    frontend, security, deployment.
4.  **Дөрөвдүгээр бүлэг --- Туршилт ба үр дүн:** тест кейс, RBAC/RLS,
    performance, usability, QR test, үр дүн.
5.  **Дүгнэлт ба цаашдын хөгжүүлэлт.**

PDF-ийн хуучин MySQL/mCloud технологийн тайлбаруудыг
PostgreSQL/Supabase/Vercel/Render бодит сонголттой нийцүүлэн шинэчилнэ.
PDF-д байгаа шаардлагын ID-г өөрчлөхгүй, traceability matrix-ийг
хадгална.

------------------------------------------------------------------------

## 14. Эцэслэн баталгаажуулах шаардлагатай зүйлс

1.  MNS/ISO стандартын яг код, хэмжих нэгж, босго утгыг
    лаборатори/удирдагчаас батлуулах.
2.  Refresh token-ийн бодит хугацаа, rotation тохиргоог Supabase-ийн
    сонгосон plan дээр шалгах.
3.  Supabase Auth Custom Access Token Hook-ийн боломж, plan нөхцөлийг
    эхлүүлэх үед баталгаажуулах; боломжгүй бол Express profiles lookup
    fallback.
4.  Supabase Free/Pro сонголт, backup хадгалалт ба сэргээх журам.
5.  Тайлангийн эцсийн формат PDF, Excel эсвэл хоёул.
6.  Audit log хадгалах хугацаа.
7.  BR-14--17 нь PDF-д санал болгосон/батлагдаагүй тул
    удирдагч/захиалагчаар баталгаажуулах хүртэл approved business rule
    гэж үзэхгүй.
8.  Нийтийн QR дээр хуулийн этгээдийн нэр харуулах эсэхийг тусад нь
    зөвшөөрүүлэх; хувь хүний нэр, холбоо барих мэдээллийг гаргахгүй.

------------------------------------------------------------------------

## 15. Хэрэгжүүлэлтийн эхлэх нөхцөл

-   Энэ төлөвлөгөө Plan-only. Код, migration, config, scaffold
    үүсгээгүй.
-   Build эхлэхийн өмнө OpenCode дээр Build agent руу шилжинэ.
-   Эхний ажил нь зөвхөн Phase 0 scaffold байна; дараа нь W1--W16
    roadmap-ийн дагуу үе шаттай хэрэгжүүлнэ.
-   V1 scope-оос гадуурх функц нэмэх бол эхлээд дипломын шаардлага,
    удирдагчийн зөвшөөрөл, хугацаа/эрсдэлийг шинэчилнэ.
