"""
schemas.py - Pydantic models for API
- Input/output validation for endpoints
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserOut(BaseModel):
    id: int
    email: str
    points: int
    balance_cents: int
    class Config:
        from_attributes = True

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleCallbackRequest(BaseModel):
    code: str

class CreateDatabase(BaseModel):
    name: str
    db_user: str
    db_password: str
    quota_mb: Optional[int] = None  # Optional - chỉ để hiển thị ước tính, không enforce

class DatabaseOut(BaseModel):
    id: int
    name: str
    owner_id: int
    quota_mb: Optional[int] = None  # quota có thể chưa đặt => None
    status: str
    hostname: Optional[str]
    port: Optional[int]
    class Config:
        from_attributes = True


class PlanOut(BaseModel):
    id: int
    name: str
    storage_mb: int
    users_allowed: int
    price_monthly_cents: int
    currency: str
    description: Optional[str]
    class Config:
        from_attributes = True


class PromotionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    active: int
    class Config:
        from_attributes = True


# --- User Schemas ---
class UserUpdate(BaseModel):
    email: Optional[str] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str


# --- Database Schemas ---
class UpdateDatabase(BaseModel):
    name: Optional[str] = None
    quota_mb: Optional[int] = None

class ResetPasswordRequest(BaseModel):
    new_password: str

class DatabaseStats(BaseModel):
    """Thống kê database"""
    id: int
    name: str
    quota_mb: Optional[int] = None  # Optional - chỉ để hiển thị ước tính
    used_mb: Optional[float] = None
    status: str
    quota_status: Optional[str] = None  # NORMAL, WARNING, BLOCKED
    created_at: Optional[str] = None
    class Config:
        from_attributes = True

class DatabaseConnectionInfo(BaseModel):
    """Thông tin kết nối database"""
    hostname: str
    port: int
    database_name: str  # db_{id}
    username: str
    password: str  # Chỉ trả về khi user yêu cầu
    connection_string: Optional[str] = None
    jdbc_url: Optional[str] = None  # JDBC URL cho DBeaver và các tools tương tự


# --- Subscription Schemas ---
class SubscribePlan(BaseModel):
    plan_id: int
    auto_renew: bool = True

class SubscriptionOut(BaseModel):
    id: int
    user_id: int
    plan_id: int
    status: str
    started_at: Optional[str] = None
    expires_at: Optional[str] = None
    auto_renew: int
    created_at: Optional[str] = None
    class Config:
        from_attributes = True


# --- Payment Schemas ---
class CreatePayment(BaseModel):
    amount_cents: int
    currency: str = "VND"
    payment_method: str = "BANK_TRANSFER"
    description: Optional[str] = None
    subscription_id: Optional[int] = None  # Nếu thanh toán cho subscription

class PaymentOut(BaseModel):
    id: int
    user_id: int
    subscription_id: Optional[int] = None
    amount_cents: int
    currency: str
    status: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    class Config:
        from_attributes = True


# --- Points & Rewards Schemas ---
class ConvertPointsRequest(BaseModel):
    """Yêu cầu đổi điểm sang tiền"""
    points: int

class ConvertPointsResponse(BaseModel):
    """Kết quả đổi điểm sang tiền"""
    converted_points: int
    amount_cents: int
    new_balance_cents: int
    new_points: int


# --- VNPay Schemas ---
class CreateVNPayPayment(BaseModel):
    """Yêu cầu tạo payment URL VNPay"""
    amount_cents: int
    description: Optional[str] = None
    subscription_id: Optional[int] = None
    bank_code: Optional[str] = None  # Mã ngân hàng (optional)

class VNPayPaymentUrlResponse(BaseModel):
    """Response chứa payment URL từ VNPay"""
    payment_url: str
    payment_id: int


# --- Usage & Analytics Schemas ---
class UsageStats(BaseModel):
    """Thống kê sử dụng tổng quan"""
    total_databases: int
    active_databases: int
    total_storage_mb: int
    used_storage_mb: float
    total_payments: int
    total_spent_cents: int
    active_subscriptions: int

class InvoiceOut(BaseModel):
    """Hóa đơn từ subscription/payment"""
    id: int
    subscription_id: Optional[int] = None
    payment_id: Optional[int] = None
    amount_cents: int
    currency: str
    status: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    created_at: Optional[str] = None
    class Config:
        from_attributes = True


# --- Backup & Restore Schemas ---
class CreateBackupRequest(BaseModel):
    """Yêu cầu tạo backup"""
    name: Optional[str] = None
    description: Optional[str] = None

class BackupOut(BaseModel):
    """Thông tin backup"""
    id: int
    database_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    size_mb: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True

class RestoreRequest(BaseModel):
    """Yêu cầu restore từ backup"""
    backup_id: int

class RestoreOut(BaseModel):
    """Thông tin restore"""
    id: int
    database_id: int
    backup_id: int
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True


# --- Monitoring & Performance Metrics Schemas ---
class PerformanceMetricOut(BaseModel):
    """Performance metric data point"""
    id: int
    database_id: int
    metric_type: str
    value: float
    metric_metadata: Optional[str] = None
    timestamp: Optional[datetime] = None
    class Config:
        from_attributes = True

class MetricsResponse(BaseModel):
    """Response cho metrics endpoint"""
    database_id: int
    timeframe: str
    metrics: dict  # { "CPU": [...], "MEMORY": [...], "CONNECTIONS": [...] }
    summary: Optional[dict] = None  # Summary stats

class ConnectionInfo(BaseModel):
    """Thông tin connection"""
    id: int
    user: str
    host: str
    db: Optional[str] = None
    command: str
    time: int
    state: Optional[str] = None
    info: Optional[str] = None

class ConnectionsResponse(BaseModel):
    """Response cho connections endpoint"""
    database_id: int
    active: int
    max_connections: int
    connections: List[ConnectionInfo]

class SlowQueryOut(BaseModel):
    """Slow query information"""
    id: int
    database_id: int
    query_text: str
    duration_ms: float
    rows_examined: Optional[int] = None
    rows_sent: Optional[int] = None
    timestamp: Optional[datetime] = None
    class Config:
        from_attributes = True

class PerformanceSummary(BaseModel):
    """Performance summary statistics"""
    database_id: int
    qps: float  # Queries per second
    avg_response_time_ms: float
    error_rate: float
    active_connections: int
    max_connections: int
    cpu_usage_percent: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    slow_queries_count: int


# --- Database Cloning Schemas ---
class CloneRequest(BaseModel):
    """Yêu cầu clone database"""
    name: str
    description: Optional[str] = None

class CloneOut(BaseModel):
    """Thông tin clone operation"""
    id: int
    source_database_id: int
    cloned_database_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True


# --- Database Export/Import Schemas ---
class ImportOut(BaseModel):
    """Thông tin import operation"""
    id: int
    database_id: int
    file_name: str
    file_path: str
    file_size_mb: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True


# --- SQL Query Execution Schemas ---
class SQLQueryRequest(BaseModel):
    """Yêu cầu execute SQL query"""
    query: str

class SQLQueryResponse(BaseModel):
    """Response cho SQL query execution"""
    success: bool
    columns: List[str]
    rows: List[List[Optional[str]]]
    row_count: int
    affected_rows: int
    execution_time_ms: float
    query_type: str
    message: str
