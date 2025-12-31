"""
models.py - SQLAlchemy ORM models
- User, Database, and other core tables
"""

from sqlalchemy import Column, Integer, String, DateTime, func, Text, ForeignKey, DECIMAL, Enum
from sqlalchemy.orm import relationship
import enum
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    google_id = Column(String(255), nullable=True, unique=True, index=True)  # Google user ID
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


class BackupStatus(str, enum.Enum):
    """Trạng thái backup"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    DELETED = "DELETED"


class RestoreStatus(str, enum.Enum):
    """Trạng thái restore"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Backup(Base):
    """Backup database"""
    __tablename__ = "backups"
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    name = Column(String(255), nullable=True)  # Tên backup (optional)
    description = Column(Text, nullable=True)  # Mô tả backup
    file_path = Column(String(500), nullable=True)  # Đường dẫn file backup
    size_mb = Column(DECIMAL(10, 2), nullable=True)  # Kích thước file (MB)
    status = Column(String(30), nullable=False, default=BackupStatus.PENDING.value)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)  # Thông báo lỗi nếu backup thất bại
    
    # Relationship
    database = relationship("Database", backref="backups")


class Restore(Base):
    """Restore database từ backup"""
    __tablename__ = "restores"
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    backup_id = Column(Integer, ForeignKey("backups.id"), nullable=False)
    status = Column(String(30), nullable=False, default=RestoreStatus.PENDING.value)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)  # Thông báo lỗi nếu restore thất bại
    
    # Relationships
    database = relationship("Database", backref="restores")
    backup = relationship("Backup", backref="restores")


class MetricType(str, enum.Enum):
    """Loại metric"""
    CPU = "CPU"
    MEMORY = "MEMORY"
    CONNECTIONS = "CONNECTIONS"
    QUERIES = "QUERIES"
    SLOW_QUERY = "SLOW_QUERY"
    RESPONSE_TIME = "RESPONSE_TIME"
    THROUGHPUT = "THROUGHPUT"


class PerformanceMetric(Base):
    """Performance metrics của database"""
    __tablename__ = "performance_metrics"
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    metric_type = Column(String(30), nullable=False, index=True)  # CPU, MEMORY, CONNECTIONS, etc.
    value = Column(DECIMAL(10, 2), nullable=False)  # Giá trị metric
    metric_metadata = Column(Text, nullable=True)  # JSON metadata (query text, connection info, etc.)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationship
    database = relationship("Database", backref="performance_metrics")
    
    # Index for efficient queries
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )


class SlowQuery(Base):
    """Slow queries log"""
    __tablename__ = "slow_queries"
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    query_text = Column(Text, nullable=False)  # SQL query
    duration_ms = Column(DECIMAL(10, 2), nullable=False)  # Thời gian thực thi (ms)
    rows_examined = Column(Integer, nullable=True)
    rows_sent = Column(Integer, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationship
    database = relationship("Database", backref="slow_queries")


class CloneStatus(str, enum.Enum):
    """Trạng thái clone operation"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DatabaseClone(Base):
    """Database clone operation"""
    __tablename__ = "database_clones"
    id = Column(Integer, primary_key=True, index=True)
    source_database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    cloned_database_id = Column(Integer, ForeignKey("databases.id"), nullable=True, index=True)  # ID của database mới được tạo
    name = Column(String(100), nullable=False)  # Tên database clone
    description = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default=CloneStatus.PENDING.value)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    source_database = relationship("Database", foreign_keys=[source_database_id], backref="clones_as_source")
    cloned_database = relationship("Database", foreign_keys=[cloned_database_id], backref="clone_operation")


class ImportStatus(str, enum.Enum):
    """Trạng thái import operation"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DatabaseImport(Base):
    """Database import operation"""
    __tablename__ = "database_imports"
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_mb = Column(DECIMAL(10, 2), nullable=True)
    status = Column(String(30), nullable=False, default=ImportStatus.PENDING.value)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationship
    database = relationship("Database", backref="imports")