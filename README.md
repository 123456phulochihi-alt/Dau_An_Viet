# Di Sản Sài Gòn - phiên bản khởi đầu

Website bản đồ di sản TP.HCM, hiện có một địa danh: Dinh Độc Lập.

## Công nghệ
- Vite + JavaScript
- Leaflet + OpenStreetMap
- Supabase Auth, PostgreSQL, Storage, Row Level Security

## 1. Chạy thử giao diện

Cài Node.js LTS trước. Mở Command Prompt tại thư mục dự án rồi chạy:

```bash
npm install
npm run dev
```

Mở địa chỉ local do Vite cung cấp, thường là `http://localhost:5173`.

Nếu chưa cấu hình Supabase, trang bản đồ vẫn chạy với dữ liệu mẫu. Trang quản trị sẽ hiện hướng dẫn kết nối.

## 2. Tạo database và tài khoản quản trị

1. Tạo một project mới tại https://supabase.com.
2. Vào SQL Editor, mở và chạy toàn bộ nội dung `supabase/schema.sql`.
3. Vào Project Settings > API, sao chép Project URL và anon/public key.
4. Sao chép `.env.example` thành `.env`, điền hai giá trị:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

5. Khởi động lại `npm run dev` sau khi sửa `.env`.
6. Trong Supabase, vào Authentication > Users > Add user, tạo tài khoản quản trị viên.
7. Sao chép UUID của tài khoản vừa tạo. Trong SQL Editor chạy câu lệnh sau, thay UUID và tên hiển thị:

```sql
insert into public.profiles (id, display_name, role)
values ('UUID_TAI_KHOAN_VUA_TAO', 'Quản trị viên', 'admin')
on conflict (id) do update set role = 'admin';
```

Không bật public sign-up. Chỉ tạo tài khoản admin từ Supabase Dashboard. Không đưa `service_role` key vào frontend.

## 3. Quản trị

Mở `/admin.html`, đăng nhập bằng tài khoản đã được cấp role `admin`. Quản trị viên có thể cập nhật tên, địa chỉ, thời gian xây dựng, tọa độ, thông tin cơ bản, đoạn giới thiệu, tag và ảnh đại diện.

Ảnh tải lên được lưu trong Supabase Storage bucket `monument-images`.

## 4. Đưa website lên Internet

Có thể deploy frontend bằng GitHub Pages, Netlify hoặc Vercel. Với Vite, cần cấu hình `base` phù hợp nếu dùng GitHub Pages dạng project site. Thiết lập biến môi trường Supabase trên nền tảng deploy, sau đó build bằng `npm run build`.

## 5. Lưu ý về bảo mật và phạm vi bản đầu

- Public chỉ đọc được địa danh có trạng thái `published`.
- Chỉ tài khoản có `profiles.role = 'admin'` mới được ghi dữ liệu.
- Quyền được bảo vệ ở database bằng RLS, không chỉ bằng giao diện.
- Không có chức năng tự đăng ký tài khoản ở bản đầu.
- Trang quản trị hiện tập trung chỉnh sửa hồ sơ Dinh Độc Lập. Có thể mở rộng thành danh sách CRUD nhiều địa danh ở bước tiếp theo.
- Ảnh minh họa mặc định lấy từ Wikimedia Commons. Kiểm tra giấy phép và ghi công theo trang nguồn trước khi phát hành chính thức.
