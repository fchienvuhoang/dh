# Quản lý thiện pháp và sao kê Techcombank

Ứng dụng Next.js phân loại nội dung chuyển khoản từ file sao kê Techcombank theo danh sách thiện pháp và bộ từ khóa đã quản lý trước.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL qua Prisma ORM
- Import Excel bằng `xlsx`
- Deploy phù hợp với Vercel

## Cấu trúc sao kê Techcombank đã hỗ trợ

File mẫu `/Users/jigmewangchuk/Downloads/Account statement.xlsx` có sheet `Account statement`.

Metadata nằm ở các dòng đầu:

- `Tu ngay`, `Toi ngay`
- `So tai khoan`
- `Ten tai khoan`
- `Loai tien`
- `So du dau ky`
- `So du cuoi ky`

Bảng giao dịch bắt đầu ở dòng header:

- `NGAY`
- `DIEN GIAI`
- `CHI TIET`
- `NO`
- `CO`
- `SO DU`

Ứng dụng dùng `CHI TIET` làm khóa unique để chống import trùng.

## Database đề xuất trên Vercel

Dùng PostgreSQL managed trên Vercel Marketplace. Các lựa chọn phù hợp:

- Neon: Postgres serverless phổ biến cho Next.js/Vercel.
- Prisma Postgres: phù hợp nếu muốn đi theo hệ sinh thái Prisma.
- Supabase: Postgres có dashboard và auth/storage nếu sau này cần mở rộng.

Sau khi provision database trên Vercel, dùng URL qua pooler cho traffic ứng dụng. Ứng dụng ưu tiên
`DATABASE_POOL_URL`, sau đó `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, và cuối cùng mới tới
`DATABASE_URL`. Không dùng URL direct/non-pooling làm `DATABASE_POOL_URL` trên Vercel.

Nếu nhà cung cấp cấp riêng hai URL, cấu hình:

```bash
DATABASE_POOL_URL="postgresql://...pooler-host.../database?sslmode=verify-full"
DATABASE_URL="postgresql://...direct-host.../database?sslmode=verify-full"
```

Áp dụng biến cho cả Production, Preview và Development rồi redeploy. Nên chọn database region
gần Vercel Functions để tránh timeout do độ trễ mạng.

Ứng dụng dùng một Prisma client và một PostgreSQL pool dùng chung trong mỗi instance. Pool được
đăng ký với Vercel Fluid Compute để đóng kết nối idle đúng cách khi function bị suspend, đồng thời
giới hạn mặc định ở 2 kết nối để tránh vượt `max connections` trên serverless. Có thể cấu hình lại khi cần:

```bash
DATABASE_POOL_MAX="2"
```

## Schema chính

- `BankAccount`: thông tin tài khoản ngân hàng, số dư hiện tại theo kỳ import mới nhất.
- `ImportBatch`: mỗi lần import file sao kê, lưu số dòng mới/trùng/chưa phân loại.
- `Campaign`: thiện pháp, mã như `cntt10`, `kathina-pm`.
- `CampaignKeyword`: danh sách từ khóa của từng thiện pháp, đã chuẩn hóa không dấu để match linh hoạt.
- `BankTransaction`: giao dịch sao kê, unique theo `detail` tương ứng cột `CHI TIET`.
- Khoản chi được lấy trực tiếp từ cột `NO` trong `BankTransaction` và gắn vào thiện pháp tương ứng.

## Chạy local

```bash
cp .env.example .env
```

Cập nhật `DATABASE_URL` trong `.env`, sau đó:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Mở `http://localhost:3000`.

## Đăng nhập quản trị

Trang quản trị `/` và các API quản trị được bảo vệ bằng mật khẩu trong biến môi trường:

```bash
ADMIN_PASSWORD="mật-khẩu-mạnh"
```

Tạo mật khẩu mạnh:

```bash
openssl rand -base64 32
```

Khi deploy Vercel, thêm `ADMIN_PASSWORD` vào Project Settings → Environment Variables. Các trang public `/thien-phap/[ma-thien-phap]` vẫn mở công khai cho thí chủ xem.

## Báo cáo chỉ xem

Trang `/bao-cao` hiển thị số dư tài khoản, danh sách thiện pháp, tổng thu và link công khai. Trang này không có chức năng thêm, sửa, xóa hoặc import và không cấp quyền gọi API quản trị.

Cấu hình mật khẩu cố định bằng biến môi trường, không lưu database:

```bash
READONLY_VIEW_PASSWORD="mật-khẩu-tối-thiểu-8-ký-tự"
```

Link gửi cho người xem là `/bao-cao`. Trang được đặt `noindex`, `nofollow`, `noarchive`, không gửi referrer và không được cache.

## Deploy Vercel

1. Push project lên GitHub.
2. Import project vào Vercel.
3. Tạo PostgreSQL từ Vercel Marketplace hoặc kết nối resource có sẵn.
4. Đảm bảo `DATABASE_URL` và `ADMIN_PASSWORD` được inject vào project.
5. Vercel chạy `npm run vercel-build` theo `vercel.json`: áp dụng migration bằng
   `prisma migrate deploy` trước khi build ứng dụng. Nếu migration thất bại, build sẽ dừng.
   `DATABASE_URL` phải trỏ tới cùng database mà URL pool của ứng dụng sử dụng.
6. Chạy seed khi khởi tạo database lần đầu:

```bash
pnpm db:seed
```

Nếu bản đang chạy báo `The table public.CampaignBill does not exist`, chạy migration
với `DATABASE_URL` của đúng môi trường bị lỗi rồi redeploy:

```bash
pnpm db:deploy
```

Migration `20261012090000_add_campaign_bills` tạo bảng lưu ảnh bill, index và khóa
ngoại tới thiện pháp. Không cần reset database.

## Luồng sử dụng

1. Tạo thiện pháp và nhập từ khóa liên quan.
2. Upload file sao kê Techcombank `.xlsx`.
3. Hệ thống parse các dòng giao dịch, bỏ qua `CHI TIET` đã tồn tại.
4. Giao dịch được phân loại theo keyword đang active.
5. Giao dịch chưa khớp có thể gán thủ công hoặc bổ sung keyword rồi bấm `Phân loại lại`.
6. Gán các dòng cột `NO` vào thiện pháp tương ứng để theo dõi tổng chi và tồn quỹ.
7. Gửi link public `/thien-phap/[ma-thien-phap]` cho thí chủ xem thu chi theo từng thiện pháp.

## PWA và sao kê PDF

Ứng dụng có manifest, icon và service worker; sau khi deploy qua HTTPS, trên iPhone mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính. PWA cần Internet; service worker chỉ hiển thị thông báo khi mất mạng, không lưu trang quản trị, API hay sao kê vào Cache Storage. iOS chưa hỗ trợ nhận file vào PWA từ bảng chia sẻ hệ thống. Lưu sao kê vào Tệp rồi chọn file tại mục Import sao kê.

Form nhập hỗ trợ `.xlsx`, `.xls`, `.pdf`, tối đa 4 MB. PDF có mật khẩu dùng ô mật khẩu ngay dưới nút chọn file; mật khẩu không được ghi vào database. ZIP cần được giải nén trong Tệp trước. PDF ảnh quét chưa được hỗ trợ.

Bộ đọc PDF hỗ trợ bố cục sáu cột và sao kê tám cột xuất từ ứng dụng Techcombank (trang ngang, nội dung nhiều dòng, tiêu đề chỉ ở trang đầu). Đã đối chiếu file mẫu 18 trang, 261 giao dịch: tổng thu, chi và số dư từng dòng đều khớp. Bộ đọc từ chối bố cục không nhận diện đủ; PDF ảnh quét chưa được hỗ trợ. Với bố cục di động, tổng doanh số trên sao kê cũng được đối chiếu. Chi tiết giao dịch là số bút toán dùng chống trùng giống Excel; riêng giao dịch không có số bút toán (lãi/phí), mã được tạo từ tài khoản, ngày, nội dung, số tiền và số dư để chống nhập trùng cùng PDF. Các giao dịch này cần đối chiếu riêng khi nhập chồng với Excel vì Excel có thể dùng mã khác.

File mẫu và mật khẩu không được đưa vào repository. Kiểm tra tự động dùng dữ liệu tổng hợp.

Kiểm tra bộ đọc PDF: `npm run test:pdf`.

## Đăng nhập Google SSO

Thêm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (ngẫu nhiên, ít nhất 32 ký tự) và `NEXT_PUBLIC_APP_URL` vào môi trường chạy. `GOOGLE_ALLOWED_EMAILS` nhận danh sách email quản trị phân cách bằng dấu phẩy; mặc định chỉ `fchienvuhoang@gmail.com`. Đặt danh sách rỗng sẽ từ chối mọi tài khoản Google. Đăng nhập mật khẩu hiện có vẫn dùng được.

Trong Google Cloud Console, dùng OAuth client loại Web application và đăng ký **Authorized redirect URI** đúng domain của `NEXT_PUBLIC_APP_URL`:

- Domain mới: `https://dhamma-group.danasangha.org/api/auth/google/callback`
- Nếu vẫn dùng domain Vercel: `https://dhamma-eight.vercel.app/api/auth/google/callback`
- Local: đặt `NEXT_PUBLIC_APP_URL=http://localhost:3000`, thêm `http://localhost:3000/api/auth/google/callback`.

Chỉ khai báo `NEXT_PUBLIC_APP_URL` một lần; domain của biến này là nơi bắt đầu và kết thúc đăng nhập. Nếu Google OAuth app đang ở chế độ Testing, thêm email quản trị vào Test users. Sau khi thay biến môi trường cần redeploy/restart. Không đưa secret vào mã nguồn. Luồng Google dùng state, PKCE, nonce, xác minh ID token và phiên có thời hạn 7 ngày; email được kiểm tra lại với danh sách cho phép trên mỗi request. Logout xóa phiên Dhamma, không đăng xuất tài khoản Google trên thiết bị.
