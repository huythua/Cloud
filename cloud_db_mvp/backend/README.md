# Cloud DB MVP Backend

> Ghi chú: Mỗi file đều có docstring đầu file giải thích vai trò, bạn nên đọc kỹ trước khi sửa.

## Mục tiêu

- Backend quản lý user, cho thuê/tạo database cloud, xác thực bảo mật, quản lý metadata.
- FastAPI + SQLAlchemy + Pydantic + JWT + MySQL (provision DB vật lý)

## Cấu trúc thư mục backend

- `main.py`: Khởi tạo app, đăng ký route
- `models.py`: ORM models (User, Database)
- `database.py`: Kết nối DB metadata
- `schemas.py`: Pydantic models cho API
- `auth.py`: Xác thực, bảo mật
- `provisioner.py`: Tạo/xóa DB vật lý trên MySQL

## Chạy thử local

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Ghi chú

- Đọc docstring đầu file để hiểu chức năng từng file.
- Để phát triển thêm, tạo các router riêng cho user/db, import vào main.py.
