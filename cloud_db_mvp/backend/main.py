"""
main.py - Entry point for Cloud DB MVP backend
- FastAPI app initialization
- API route registration
- App-level config
"""

import os
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import Base, engine, get_db
import models, schemas
from auth import get_password_hash, authenticate_user, create_access_token
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import database as _database

# Create all tables
Base.metadata.create_all(bind=engine)


def _ensure_sqlite_columns():
    """If using SQLite, try to add missing columns to existing tables safely.
    This helps dev environments where the metadata DB was created before models changed.
    """
    db_url = getattr(_database, 'DATABASE_URL', '')
    if not db_url.startswith('sqlite'):
        return
    # attempt to add columns if they don't exist
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;"))
        except Exception:
            # column may already exist or SQLite may not support; ignore
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN balance_cents INTEGER NOT NULL DEFAULT 0;"))
        except Exception:
            pass
        # Add new columns to databases table
        try:
            conn.execute(text("ALTER TABLE databases ADD COLUMN db_username VARCHAR(100);"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE databases ADD COLUMN db_password_hash VARCHAR(255);"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE databases ADD COLUMN physical_db_name VARCHAR(100);"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE databases ADD COLUMN quota_status VARCHAR(20);"))
        except Exception:
            pass


_ensure_sqlite_columns()

app = FastAPI(title="Cloud DB MVP Backend")
 
# Configure CORS
origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {"message": "Welcome to Cloud DB MVP Backend!"}

# --- AUTH APIs ---

@app.post("/auth/register", response_model=schemas.UserOut)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(email=payload.email, hashed_password=get_password_hash(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# --- DATABASE CLOUD APIs ---
from auth import get_current_user
from provisioner import Provisioner
from sqlalchemy.exc import SQLAlchemyError


@app.on_event("startup")
def seed_pricing_plans():
    # Seed default pricing plans if not present
    db = next(get_db())
    try:
        # Define desired plans and insert any missing by name
        desired = [
            {"name": "Gói Cơ bản", "storage_mb": 50, "users_allowed": 1, "price_monthly_cents": 0, "description": "50 MB - 1 user - Free"},
            {"name": "Gói Personal", "storage_mb": 100, "users_allowed": 2, "price_monthly_cents": 19900, "description": "100 MB - 2 user - ₫19,900 / tháng"},
            {"name": "Gói Starter", "storage_mb": 250, "users_allowed": 3, "price_monthly_cents": 49000, "description": "250 MB - 3 user - ₫49,000 / tháng"},
            {"name": "Gói Pro", "storage_mb": 500, "users_allowed": 5, "price_monthly_cents": 99000, "description": "500 MB - 5 user - ₫99,000 / tháng"},
            {"name": "Gói Team", "storage_mb": 1024, "users_allowed": 10, "price_monthly_cents": 199000, "description": "1 GB - 10 user - ₫199,000 / tháng"},
            {"name": "Gói Business", "storage_mb": 2048, "users_allowed": 20, "price_monthly_cents": 399000, "description": "2 GB - 20 user - ₫399,000 / tháng"},
            {"name": "Gói Enterprise", "storage_mb": 5120, "users_allowed": 50, "price_monthly_cents": 999000, "description": "5 GB - 50 user - ₫999,000 / tháng"},
            {"name": "Gói Unlimited-1", "storage_mb": 10240, "users_allowed": 100, "price_monthly_cents": 1999000, "description": "10 GB - 100 user - ₫1,999,000 / tháng"},
            {"name": "Gói Unlimited-2", "storage_mb": 51200, "users_allowed": 500, "price_monthly_cents": 4999000, "description": "50 GB - 500 user - ₫4,999,000 / tháng"},
        ]

        # Get existing plan names
        existing_rows = db.query(models.PricingPlan.name).all()
        existing_names = {r[0] for r in existing_rows}

        to_add = [p for p in desired if p['name'] not in existing_names]
        if to_add:
            for p in to_add:
                db.add(models.PricingPlan(name=p['name'], storage_mb=p['storage_mb'], users_allowed=p['users_allowed'], price_monthly_cents=p['price_monthly_cents'], currency='VND', description=p.get('description')))
            db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
def seed_promotions():
    db = next(get_db())
    try:
        existing = db.query(models.Promotion).count()
        if existing == 0:
            promos = [
                models.Promotion(title="Giảm 20% cho gói Pro", description="Áp dụng cho 100 khách hàng đầu tiên", active=1),
                models.Promotion(title="Tặng 50 điểm", description="Khi đăng ký gói Business", active=1),
                models.Promotion(title="Miễn phí 1 tháng", description="Khách hàng mới được tặng 1 tháng gói Cơ bản", active=1),
            ]
            for pr in promos:
                db.add(pr)
            db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


@app.get("/promotions", response_model=list[schemas.PromotionOut])
def list_promotions(db: Session = Depends(get_db)):
    items = db.query(models.Promotion).filter(models.Promotion.active == 1).order_by(models.Promotion.id.desc()).all()
    return items


@app.get("/plans", response_model=list[schemas.PlanOut])
def list_plans(db: Session = Depends(get_db)):
    items = db.query(models.PricingPlan).order_by(models.PricingPlan.id).all()
    return items


@app.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """
    Return current authenticated user's basic profile:
    - id
    - email
    - points
    - balance_cents
    """
    return current_user

@app.put("/me", response_model=schemas.UserOut)
def update_me(update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cập nhật thông tin profile user"""
    if update.email and update.email != current_user.email:
        # Kiểm tra email đã tồn tại chưa
        existing = db.query(models.User).filter(models.User.email == update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        current_user.email = update.email
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/me/change-password")
def change_password(req: schemas.ChangePassword, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Đổi mật khẩu user"""
    from auth import verify_password
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password incorrect")
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/db/create", response_model=schemas.DatabaseOut)
def create_db(req: schemas.CreateDatabase, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Tạo database - yêu cầu có subscription active"""
    # Kiểm tra user có subscription active không
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    if not active_sub:
        raise HTTPException(
            status_code=400, 
            detail="You need an active subscription to create a database. Please subscribe to a plan first."
        )
    
    # Kiểm tra quota của subscription
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check tổng storage thực tế đã dùng (query từ MySQL) thay vì dùng quota_mb
    existing_dbs = db.query(models.Database).filter(
        models.Database.owner_id == current_user.id,
        models.Database.status == "ACTIVE"
    ).all()
    
    # Query tổng storage thực tế từ MySQL
    total_used_storage_mb = 0.0
    try:
        from services.mysql_service import MySQLService
        mysql_service = MySQLService()
        conn = mysql_service.connect()
        cur = conn.cursor()
        
        for db_obj in existing_dbs:
            if db_obj.physical_db_name:
                try:
                    cur.execute(f"""
                        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                        FROM information_schema.tables 
                        WHERE table_schema = '{db_obj.physical_db_name}'
                    """)
                    result = cur.fetchone()
                    if result and result[0] is not None:
                        total_used_storage_mb += float(result[0])
                except Exception:
                    pass
        
        conn.close()
    except Exception:
        # Nếu không query được, dùng 0
        total_used_storage_mb = 0.0
    
    # Check nếu đã đạt/quá quota thì block (không cho tạo DB mới)
    if total_used_storage_mb >= plan.storage_mb:
        raise HTTPException(
            status_code=400,
            detail=f"Storage quota exceeded! Your plan allows {plan.storage_mb}MB, currently used: {round(total_used_storage_mb, 2)}MB. Please upgrade your plan or delete some data."
        )
    
    # Tạo metadata trước (status PENDING)
    # quota_mb chỉ dùng để hiển thị ước tính, không enforce
    db_obj = models.Database(
        name=req.name, 
        owner_id=current_user.id, 
        quota_mb=req.quota_mb if req.quota_mb else None,  # Optional - chỉ để hiển thị
        status="PENDING",
        quota_status="NORMAL"  # Sẽ được update sau khi check quota
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Gọi provisioner tạo DB vật lý
    prov = Provisioner()
    try:
        # Tạo database vật lý với tên do user nhập (sẽ được sanitize trong provisioner)
        actual_db_name = prov.create_database_with_user(db_obj.name, db_obj.id, req.db_user, req.db_password, req.quota_mb)
        # Lưu tên database thực tế đã tạo (có thể khác với tên user nhập sau khi sanitize)
        db_obj.physical_db_name = actual_db_name
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"ERROR creating database: {error_detail}")
        print(f"Traceback: {error_trace}")
        db_obj.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Provision failed: {error_detail}")

    db_obj.status = "ACTIVE"
    # Lưu lại host/port và credentials
    db_obj.hostname = prov.mysql_service.host
    db_obj.port = prov.mysql_service.port
    db_obj.db_username = req.db_user
    # Lưu password (trong production nên encrypt, MVP tạm lưu plaintext)
    db_obj.db_password_hash = req.db_password
    db.commit()
    return db_obj

@app.get("/db/list", response_model=list[schemas.DatabaseOut])
def list_db(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(models.Database).filter(models.Database.owner_id == current_user.id).all()
    return items

@app.get("/db/{db_id}", response_model=schemas.DatabaseOut)
def get_db_detail(db_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một database"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    return db_obj

@app.put("/db/{db_id}", response_model=schemas.DatabaseOut)
def update_db(db_id: int, update: schemas.UpdateDatabase, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cập nhật thông tin database (tên, quota)"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    if update.name:
        db_obj.name = update.name
    if update.quota_mb:
        db_obj.quota_mb = update.quota_mb
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.get("/db/{db_id}/stats", response_model=schemas.DatabaseStats)
def get_db_stats(db_id: int, test_mode: bool = Query(False, description="Chế độ test - dùng random data"), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy thống kê sử dụng database - query thực tế từ MySQL hoặc random data nếu test_mode"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    
    # Nếu test_mode, dùng random data
    if test_mode:
        import random
        # Random used_mb từ 0 đến 200% của quota (nếu có) hoặc random 0-500 MB
        if db_obj.quota_mb:
            used_mb = round(random.uniform(0, db_obj.quota_mb * 2), 2)
        else:
            used_mb = round(random.uniform(0, 500), 2)
    else:
        # Query thực tế từ MySQL để lấy size database
        used_mb = 0.0
        if db_obj.status in ["ACTIVE", "BLOCKED"] and db_obj.physical_db_name:
            try:
                from services.mysql_service import MySQLService
                mysql_service = MySQLService()
                conn = mysql_service.connect()
                cur = conn.cursor()
                
                # Query size của database (tính bằng MB)
                db_name = db_obj.physical_db_name
                cur.execute(f"""
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                    FROM information_schema.tables 
                    WHERE table_schema = '{db_name}'
                """)
                result = cur.fetchone()
                if result and result[0] is not None:
                    used_mb = float(result[0])
                
                conn.close()
            except Exception as e:
                # Nếu không query được, trả về 0 (database mới tạo chưa có data)
                print(f"Warning: Could not query database size for {db_name}: {e}")
                used_mb = 0.0
    
    # Check và update quota status (sẽ dùng test_mode nếu cần)
    quota_info = check_and_update_quota_status(current_user.id, db, test_mode=test_mode)
    db.refresh(db_obj)
    
    return {
        "id": db_obj.id,
        "name": db_obj.name,
        "quota_mb": db_obj.quota_mb,
        "used_mb": round(used_mb, 2),
        "status": db_obj.status,
        "quota_status": db_obj.quota_status,
        "created_at": db_obj.created_at.isoformat() if db_obj.created_at else None
    }

def check_and_update_quota_status(user_id: int, db: Session, test_mode: bool = False):
    """Check tổng storage và update quota_status cho tất cả databases của user"""
    # Lấy active subscription
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.status == "ACTIVE"
    ).first()
    if not active_sub:
        return None
    
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    if not plan:
        return None
    
    # Query tổng storage thực tế từ MySQL hoặc random nếu test_mode
    existing_dbs = db.query(models.Database).filter(
        models.Database.owner_id == user_id,
        models.Database.status.in_(["ACTIVE", "BLOCKED"])
    ).all()
    
    total_used_storage_mb = 0.0
    
    if test_mode:
        # Random data cho test mode
        import random
        for db_obj in existing_dbs:
            if db_obj.quota_mb:
                # Random từ 0 đến 200% của quota
                total_used_storage_mb += round(random.uniform(0, db_obj.quota_mb * 2), 2)
            else:
                # Random 0-500 MB nếu không có quota
                total_used_storage_mb += round(random.uniform(0, 500), 2)
    else:
        # Query thực tế từ MySQL
        try:
            from services.mysql_service import MySQLService
            mysql_service = MySQLService()
            conn = mysql_service.connect()
            cur = conn.cursor()
            
            for db_obj in existing_dbs:
                if db_obj.physical_db_name:
                    try:
                        cur.execute(f"""
                            SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                            FROM information_schema.tables 
                            WHERE table_schema = '{db_obj.physical_db_name}'
                        """)
                        result = cur.fetchone()
                        if result and result[0] is not None:
                            total_used_storage_mb += float(result[0])
                    except Exception:
                        pass
            
            conn.close()
        except Exception:
            total_used_storage_mb = 0.0
    
    # Tính phần trăm đã dùng
    used_percent = (total_used_storage_mb / plan.storage_mb * 100) if plan.storage_mb > 0 else 0
    
    # Update quota_status cho tất cả databases
    new_status = "NORMAL"
    if used_percent >= 100:
        new_status = "BLOCKED"
    elif used_percent >= 80:  # Cảnh báo khi >= 80%
        new_status = "WARNING"
    
    # Update status cho tất cả databases và block nếu cần
    for db_obj in existing_dbs:
        db_obj.quota_status = new_status
        # Nếu BLOCKED, đổi status thành BLOCKED để block connection
        if new_status == "BLOCKED" and db_obj.status == "ACTIVE":
            db_obj.status = "BLOCKED"
        elif new_status != "BLOCKED" and db_obj.status == "BLOCKED":
            # Nếu không còn BLOCKED, restore về ACTIVE
            db_obj.status = "ACTIVE"
    
    db.commit()
    return {
        "total_used_mb": round(total_used_storage_mb, 2),
        "plan_limit_mb": plan.storage_mb,
        "used_percent": round(used_percent, 2),
        "quota_status": new_status
    }

@app.get("/db/{db_id}/connection", response_model=schemas.DatabaseConnectionInfo)
def get_db_connection(db_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy thông tin kết nối database (host, port, username, password)"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    if db_obj.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Database is not active")
    
    hostname = db_obj.hostname or "localhost"
    port = db_obj.port or 3306
    # Lấy tên database thực tế (đã được sanitize khi tạo) hoặc fallback về db_{id}
    db_name = db_obj.physical_db_name or f"db_{db_obj.id}"
    username = db_obj.db_username or ""
    password = db_obj.db_password_hash or ""  # Trong production nên decrypt
    
    # Connection string với allowPublicKeyRetrieval=true để fix lỗi với MySQL 8.0+
    connection_string = f"mysql://{username}:{password}@{hostname}:{port}/{db_name}?allowPublicKeyRetrieval=true"
    
    # JDBC URL cho các tools như DBeaver, MySQL Workbench
    jdbc_url = f"jdbc:mysql://{hostname}:{port}/{db_name}?allowPublicKeyRetrieval=true&useSSL=false"
    
    return {
        "hostname": hostname,
        "port": port,
        "database_name": db_name,
        "username": username,
        "password": password,
        "connection_string": connection_string,
        "jdbc_url": jdbc_url  # Thêm JDBC URL cho DBeaver và các tools tương tự
    }

@app.post("/db/{db_id}/reset-password")
def reset_db_password(db_id: int, req: schemas.ResetPasswordRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reset password cho database user"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    if db_obj.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Database is not active")
    
    prov = Provisioner()
    try:
        # Xóa user cũ và tạo lại với password mới
        old_user = db_obj.db_username or f"user_{db_obj.id}"
        db_name = db_obj.physical_db_name or f"db_{db_obj.id}"
        prov.drop_database_and_user(db_name, old_user)
        # Tạo lại user với password mới
        prov.create_database_with_user(db_obj.name, db_obj.id, old_user, req.new_password, db_obj.quota_mb)
        # Cập nhật password trong metadata
        db_obj.db_password_hash = req.new_password
        db.commit()
        return {"message": "Password reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {e}")

@app.delete("/db/{db_id}")
def delete_db(db_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    
    prov = Provisioner()
    # Sử dụng tên database thực tế đã lưu hoặc fallback về db_{id}
    db_name = db_obj.physical_db_name or f"db_{db_obj.id}"
    db_user = db_obj.db_username or f"user_{db_obj.id}"
    
    try:
        prov.drop_database_and_user(db_name, db_user)
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"ERROR deleting database: {error_detail}")
        print(f"Traceback: {error_trace}")
        # Vẫn đánh dấu là DELETED trong metadata dù có lỗi khi xóa vật lý
        # (có thể DB/user đã bị xóa trước đó)
    
    db_obj.status = "DELETED"
    db.commit()
    return {"ok": True}

# --- SUBSCRIPTION APIs ---

@app.post("/subscriptions", response_model=schemas.SubscriptionOut)
def subscribe_plan(req: schemas.SubscribePlan, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Đăng ký gói dịch vụ - yêu cầu có đủ số dư"""
    # Kiểm tra plan có tồn tại không
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == req.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Kiểm tra user đã có subscription active chưa
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    if active_sub:
        raise HTTPException(status_code=400, detail="User already has an active subscription")
    
    # Kiểm tra số dư có đủ để thanh toán gói không
    if plan.price_monthly_cents > 0 and current_user.balance_cents < plan.price_monthly_cents:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Required: {plan.price_monthly_cents}₫, Current: {current_user.balance_cents}₫"
        )
    
    # Merge user vào session để đảm bảo changes được track
    user_in_session = db.merge(current_user)
    
    # Trừ tiền nếu gói có phí
    if plan.price_monthly_cents > 0:
        user_in_session.balance_cents -= plan.price_monthly_cents
    
    # Tạo subscription mới
    from datetime import datetime, timedelta
    subscription = models.Subscription(
        user_id=current_user.id,
        plan_id=req.plan_id,
        status="ACTIVE",
        started_at=datetime.utcnow(),
        auto_renew=1 if req.auto_renew else 0,
        expires_at=datetime.utcnow() + timedelta(days=30)  # 30 ngày
    )
    db.add(subscription)
    
    # Tạo payment record cho subscription
    payment = models.Payment(
        user_id=current_user.id,
        subscription_id=None,  # Sẽ set sau khi subscription được tạo
        amount_cents=plan.price_monthly_cents,
        currency=plan.currency,
        status="COMPLETED",
        payment_method="BALANCE",
        description=f"Thanh toán gói {plan.name}",
        completed_at=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(subscription)
    db.refresh(user_in_session)  # Refresh user để đảm bảo balance được cập nhật
    
    # Cập nhật payment với subscription_id
    payment.subscription_id = subscription.id
    db.commit()
    db.refresh(user_in_session)  # Refresh user để đảm bảo balance được cập nhật
    
    # Convert datetime to string for response
    return {
        "id": subscription.id,
        "user_id": subscription.user_id,
        "plan_id": subscription.plan_id,
        "status": subscription.status,
        "started_at": subscription.started_at.isoformat() if subscription.started_at else None,
        "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
        "auto_renew": subscription.auto_renew,
        "created_at": subscription.created_at.isoformat() if subscription.created_at else None
    }

@app.get("/subscriptions", response_model=list[schemas.SubscriptionOut])
def list_subscriptions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Danh sách subscriptions của user"""
    items = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).order_by(models.Subscription.created_at.desc()).all()
    
    # Convert datetime to string for response
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "plan_id": item.plan_id,
            "status": item.status,
            "started_at": item.started_at.isoformat() if item.started_at else None,
            "expires_at": item.expires_at.isoformat() if item.expires_at else None,
            "auto_renew": item.auto_renew,
            "created_at": item.created_at.isoformat() if item.created_at else None
        }
        for item in items
    ]

@app.get("/subscriptions/active", response_model=schemas.SubscriptionOut)
def get_active_subscription(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy subscription đang active"""
    sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    # Convert datetime to string for response
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        "auto_renew": sub.auto_renew,
        "created_at": sub.created_at.isoformat() if sub.created_at else None
    }

@app.post("/subscriptions/{sub_id}/cancel")
def cancel_subscription(sub_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Hủy subscription - Lưu ý: Không hoàn tiền"""
    sub = db.query(models.Subscription).filter(
        models.Subscription.id == sub_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Only active subscriptions can be cancelled")
    sub.status = "CANCELLED"
    sub.auto_renew = 0
    db.commit()
    return {"message": "Subscription cancelled successfully. Note: No refund will be issued."}

@app.put("/subscriptions/{sub_id}/auto-renew")
def toggle_auto_renew(sub_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle auto-renew cho subscription"""
    sub = db.query(models.Subscription).filter(
        models.Subscription.id == sub_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.auto_renew = 1 if sub.auto_renew == 0 else 0
    db.commit()
    return {
        "message": f"Auto-renew {'enabled' if sub.auto_renew == 1 else 'disabled'}",
        "auto_renew": sub.auto_renew == 1
    }

# --- PAYMENT APIs ---

@app.post("/payments", response_model=schemas.PaymentOut)
def create_payment(req: schemas.CreatePayment, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Tạo thanh toán ảo - tự động confirm ngay (mock payment)"""
    from datetime import datetime
    
    # Tạo payment và tự động confirm (nạp tiền ảo)
    payment = models.Payment(
        user_id=current_user.id,
        subscription_id=req.subscription_id,
        amount_cents=req.amount_cents,
        currency=req.currency,
        status="COMPLETED",  # Tự động complete cho nạp tiền ảo
        payment_method=req.payment_method or "VIRTUAL",
        description=req.description or "Nạp tiền ảo",
        completed_at=datetime.utcnow()
    )
    db.add(payment)
    
    # Merge user vào session hiện tại để đảm bảo changes được track
    user_in_session = db.merge(current_user)
    
    # Cập nhật balance của user ngay lập tức
    user_in_session.balance_cents += req.amount_cents
    
    # Cộng điểm tích lũy: 1 điểm = 100₫ (hệ số 1/100)
    points_earned = req.amount_cents // 100
    user_in_session.points += points_earned
    
    # Nếu thanh toán cho subscription, cập nhật subscription
    if req.subscription_id:
        sub = db.query(models.Subscription).filter(models.Subscription.id == req.subscription_id).first()
        if sub:
            sub.status = "ACTIVE"
            from datetime import timedelta
            if not sub.expires_at or sub.expires_at < datetime.utcnow():
                sub.expires_at = datetime.utcnow() + timedelta(days=30)
    
    db.commit()
    db.refresh(payment)
    
    # Refresh user để lấy giá trị mới nhất sau khi commit
    db.refresh(user_in_session)
    
    # Convert datetime to string for response
    response = {
        "id": payment.id,
        "user_id": payment.user_id,
        "subscription_id": payment.subscription_id,
        "amount_cents": payment.amount_cents,
        "currency": payment.currency,
        "status": payment.status,
        "payment_method": payment.payment_method,
        "transaction_id": payment.transaction_id,
        "description": payment.description,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
    }
    return response


@app.post("/points/convert", response_model=schemas.ConvertPointsResponse)
def convert_points(req: schemas.ConvertPointsRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Đổi điểm tích lũy sang tiền trong tài khoản.
    Tỉ lệ hiện tại: 1 điểm = 10 VND (đổi nhẹ, không hoàn toàn nghịch với lúc tích điểm để dễ test).
    """
    if req.points <= 0:
        raise HTTPException(status_code=400, detail="Số điểm đổi phải lớn hơn 0")

    user_in_session = db.merge(current_user)

    if req.points > user_in_session.points:
        raise HTTPException(status_code=400, detail="Không đủ điểm để đổi")

    # 1 điểm = 10 VND
    amount_cents = req.points * 10
    user_in_session.points -= req.points
    user_in_session.balance_cents += amount_cents

    db.commit()
    db.refresh(user_in_session)

    return schemas.ConvertPointsResponse(
        converted_points=req.points,
        amount_cents=amount_cents,
        new_balance_cents=user_in_session.balance_cents,
        new_points=user_in_session.points,
    )

@app.post("/payments/{payment_id}/confirm")
def confirm_payment(payment_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Xác nhận thanh toán thành công (mock - trong thực tế sẽ verify từ payment gateway)"""
    payment = db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "PENDING":
        raise HTTPException(status_code=400, detail="Payment already processed")
    
    # Cập nhật trạng thái thanh toán
    payment.status = "COMPLETED"
    from datetime import datetime
    payment.completed_at = datetime.utcnow()
    
    # Merge user vào session hiện tại để đảm bảo changes được track
    user_in_session = db.merge(current_user)
    
    # Cập nhật balance của user
    user_in_session.balance_cents += payment.amount_cents
    
    # Cộng điểm tích lũy: 1 điểm = 100₫ (hệ số 1/100)
    points_earned = payment.amount_cents // 100
    user_in_session.points += points_earned
    
    # Nếu thanh toán cho subscription, cập nhật subscription
    if payment.subscription_id:
        sub = db.query(models.Subscription).filter(models.Subscription.id == payment.subscription_id).first()
        if sub:
            sub.status = "ACTIVE"
            from datetime import timedelta
            if not sub.expires_at or sub.expires_at < datetime.utcnow():
                sub.expires_at = datetime.utcnow() + timedelta(days=30)
    
    db.commit()
    db.refresh(payment)
    db.refresh(user_in_session)
    
    # Convert datetime to string for response
    payment_dict = {
        "id": payment.id,
        "user_id": payment.user_id,
        "subscription_id": payment.subscription_id,
        "amount_cents": payment.amount_cents,
        "currency": payment.currency,
        "status": payment.status,
        "payment_method": payment.payment_method,
        "transaction_id": payment.transaction_id,
        "description": payment.description,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
        "points_earned": points_earned,  # Điểm tích lũy đã nhận
        "new_balance": user_in_session.balance_cents,  # Số dư mới
        "new_points": user_in_session.points  # Điểm tích lũy mới
    }
    return {"message": "Payment confirmed successfully", "payment": payment_dict}

@app.get("/payments", response_model=list[schemas.PaymentOut])
def payment_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lịch sử thanh toán của user"""
    items = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id
    ).order_by(models.Payment.created_at.desc()).all()
    
    # Convert datetime to string for response
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "subscription_id": item.subscription_id,
            "amount_cents": item.amount_cents,
            "currency": item.currency,
            "status": item.status,
            "payment_method": item.payment_method,
            "transaction_id": item.transaction_id,
            "description": item.description,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "completed_at": item.completed_at.isoformat() if item.completed_at else None
        }
        for item in items
    ]

@app.get("/payments/{payment_id}", response_model=schemas.PaymentOut)
def get_payment(payment_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một payment"""
    payment = db.query(models.Payment).filter(
        models.Payment.id == payment_id,
        models.Payment.user_id == current_user.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Convert datetime to string for response
    return {
        "id": payment.id,
        "user_id": payment.user_id,
        "subscription_id": payment.subscription_id,
        "amount_cents": payment.amount_cents,
        "currency": payment.currency,
        "status": payment.status,
        "payment_method": payment.payment_method,
        "transaction_id": payment.transaction_id,
        "description": payment.description,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "completed_at": payment.completed_at.isoformat() if payment.completed_at else None
    }

# --- POINTS CONVERSION API ---

@app.post("/points/convert")
def convert_points_to_balance(req: dict, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Đổi điểm tích lũy thành tiền - Tỷ lệ: 100 điểm = 10₫"""
    points_to_convert = req.get("points", 0)
    
    if points_to_convert <= 0:
        raise HTTPException(status_code=400, detail="Số điểm phải lớn hơn 0")
    
    if points_to_convert > current_user.points:
        raise HTTPException(
            status_code=400, 
            detail=f"Không đủ điểm. Bạn có {current_user.points} điểm, yêu cầu: {points_to_convert} điểm"
        )
    
    # Tỷ lệ: 100 điểm = 10₫ (tỷ lệ 1:10)
    balance_to_add = (points_to_convert * 10)  # 100 điểm = 1000 cents = 10₫
    
    # Merge user vào session
    user_in_session = db.merge(current_user)
    
    # Trừ điểm và cộng tiền
    user_in_session.points -= points_to_convert
    user_in_session.balance_cents += balance_to_add
    
    db.commit()
    db.refresh(user_in_session)
    
    return {
        "message": f"Đã đổi {points_to_convert} điểm thành {balance_to_add / 100}₫",
        "points_converted": points_to_convert,
        "balance_added_cents": balance_to_add,
        "new_points": user_in_session.points,
        "new_balance_cents": user_in_session.balance_cents
    }

# --- USAGE & ANALYTICS APIs ---

@app.get("/subscription/storage-info")
def get_subscription_storage_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    test_mode: bool = Query(False, description="Chế độ test - dùng random data cho tổng dung lượng"),
):
    """
    Lấy thông tin subscription và storage usage để hiển thị ở trang Database.
    - Mặc định dùng dữ liệu THẬT (query từ MySQL).
    - Chỉ khi test_mode=true mới dùng random (phục vụ test quota).
    """
    # Lấy active subscription
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()

    if not active_sub:
        return {
            "has_subscription": False,
            "message": "Bạn cần đăng ký gói dịch vụ trước khi tạo database"
        }

    # Lấy plan info
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    if not plan:
        return {"has_subscription": False, "message": "Plan not found"}

    # Sử dụng cùng logic với check_and_update_quota_status để tính tổng dung lượng
    quota_info = check_and_update_quota_status(current_user.id, db, test_mode=test_mode)
    if not quota_info:
        # Fallback nếu vì lý do nào đó không tính được quota
        return {
            "has_subscription": True,
            "subscription": {
                "id": active_sub.id,
                "plan_id": active_sub.plan_id,
                "plan_name": plan.name,
                "expires_at": active_sub.expires_at.isoformat() if active_sub.expires_at else None,
            },
            "storage": {
                "plan_limit_mb": plan.storage_mb,
                "used_mb": 0,
                "available_mb": plan.storage_mb,
                "used_percent": 0,
                "quota_status": "NORMAL",
            },
        }

    total_used_mb = quota_info["total_used_mb"]
    plan_limit_mb = quota_info["plan_limit_mb"]
    used_percent = quota_info["used_percent"]
    quota_status = quota_info["quota_status"]

    available_storage_mb = max(0, plan_limit_mb - total_used_mb)

    return {
        "has_subscription": True,
        "subscription": {
            "id": active_sub.id,
            "plan_id": active_sub.plan_id,
            "plan_name": plan.name,
            "expires_at": active_sub.expires_at.isoformat() if active_sub.expires_at else None
        },
        "storage": {
            "plan_limit_mb": plan_limit_mb,
            "used_mb": round(total_used_mb, 2),
            "available_mb": round(available_storage_mb, 2),
            "used_percent": used_percent,
            "quota_status": quota_status,
        }
    }

@app.get("/usage/stats", response_model=schemas.UsageStats)
def get_usage_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Thống kê sử dụng tổng quan của user"""
    # Đếm databases
    all_dbs = db.query(models.Database).filter(models.Database.owner_id == current_user.id).all()
    active_dbs = [db_obj for db_obj in all_dbs if db_obj.status == "ACTIVE"]
    
    # Tính tổng storage
    total_storage = sum(db_obj.quota_mb for db_obj in all_dbs)
    # Mock used storage (trong thực tế sẽ query từ MySQL)
    # Query thực tế từ MySQL thay vì dùng random
    used_storage = 0.0
    try:
        from services.mysql_service import MySQLService
        mysql_service = MySQLService()
        conn = mysql_service.connect()
        cur = conn.cursor()
        
        for db_obj in active_dbs:
            if db_obj.physical_db_name:
                try:
                    cur.execute(f"""
                        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                        FROM information_schema.tables 
                        WHERE table_schema = '{db_obj.physical_db_name}'
                    """)
                    result = cur.fetchone()
                    if result and result[0] is not None:
                        used_storage += float(result[0])
                except Exception:
                    # Nếu không query được, bỏ qua database này
                    pass
        
        conn.close()
    except Exception:
        # Nếu không query được, dùng 0
        used_storage = 0.0
    
    # Đếm payments
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id,
        models.Payment.status == "COMPLETED"
    ).all()
    total_spent = sum(p.amount_cents for p in payments)
    
    # Đếm active subscriptions
    active_subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).count()
    
    return {
        "total_databases": len(all_dbs),
        "active_databases": len(active_dbs),
        "total_storage_mb": total_storage,
        "used_storage_mb": round(used_storage, 2),
        "total_payments": len(payments),
        "total_spent_cents": total_spent,
        "active_subscriptions": active_subs
    }

@app.get("/invoices", response_model=list[schemas.InvoiceOut])
def get_invoices(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy danh sách hóa đơn (tạo từ payments có subscription_id)"""
    # Lấy các payment có subscription_id (thanh toán cho subscription)
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id,
        models.Payment.subscription_id.isnot(None)
    ).order_by(models.Payment.created_at.desc()).all()
    
    invoices = []
    for payment in payments:
        sub = db.query(models.Subscription).filter(models.Subscription.id == payment.subscription_id).first()
        invoices.append({
            "id": payment.id,
            "subscription_id": payment.subscription_id,
            "payment_id": payment.id,
            "amount_cents": payment.amount_cents,
            "currency": payment.currency,
            "status": payment.status,
            "period_start": sub.started_at.isoformat() if sub and sub.started_at else None,
            "period_end": sub.expires_at.isoformat() if sub and sub.expires_at else None,
            "created_at": payment.created_at.isoformat() if payment.created_at else None
        })
    
    return invoices
