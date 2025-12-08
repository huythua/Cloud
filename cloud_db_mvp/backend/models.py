"""
models.py - SQLAlchemy ORM models
- User, Database, and other core tables
"""

from sqlalchemy import Column, Integer, String, DateTime, func, Text
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    # Points accumulated by user (for rewards)
    points = Column(Integer, nullable=False, default=0)
    # Balance stored in smallest currency unit (e.g. VND stored as integer VND)
    balance_cents = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

class Database(Base):
    __tablename__ = "databases"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Tên hiển thị (do user nhập)
    owner_id = Column(Integer, nullable=False)
    quota_mb = Column(Integer, nullable=True)  # Không bắt buộc - chỉ dùng để hiển thị ước tính, không enforce
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, ACTIVE, FAILED, DELETED, BLOCKED
    quota_status = Column(String(20), nullable=True)  # NORMAL, WARNING, BLOCKED - dựa trên tổng storage của plan
    hostname = Column(String(255), nullable=True)
    port = Column(Integer, nullable=True)
    # Lưu thông tin user/password để user có thể lấy lại (đã hash password)
    db_username = Column(String(100), nullable=True)  # Username để kết nối DB
    db_password_hash = Column(String(255), nullable=True)  # Password đã hash
    physical_db_name = Column(String(100), nullable=True)  # Tên database thực tế trong MySQL (sau khi sanitize)
    created_at = Column(DateTime, server_default=func.now())


class PricingPlan(Base):
    __tablename__ = "pricing_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    storage_mb = Column(Integer, nullable=False)
    users_allowed = Column(Integer, nullable=False)
    # price per month in the smallest currency unit (e.g. VND -> integer VND)
    price_monthly_cents = Column(Integer, nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="VND")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    active = Column(Integer, nullable=False, default=1)  # 1 active, 0 inactive
    created_at = Column(DateTime, server_default=func.now())


class Subscription(Base):
    """Đăng ký gói dịch vụ của user"""
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    plan_id = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False, default="ACTIVE")  # ACTIVE, CANCELLED, EXPIRED
    started_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    auto_renew = Column(Integer, nullable=False, default=1)  # 1 yes, 0 no
    created_at = Column(DateTime, server_default=func.now())


class Payment(Base):
    """Lịch sử thanh toán"""
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    subscription_id = Column(Integer, nullable=True)  # NULL nếu là nạp tiền
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(10), nullable=False, default="VND")
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, COMPLETED, FAILED, CANCELLED
    payment_method = Column(String(50), nullable=True)  # BANK_TRANSFER, CREDIT_CARD, etc.
    transaction_id = Column(String(255), nullable=True)  # ID từ gateway thanh toán
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)