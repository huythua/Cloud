"""
main.py - Entry point for Cloud DB MVP backend
- FastAPI app initialization
- API route registration
- App-level config
"""

import os
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, UploadFile, File, Body
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.orm import Session
from database import Base, engine, get_db
import models, schemas
from auth import get_password_hash, authenticate_user, create_access_token
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import database as _database
import httpx
from urllib.parse import urlencode
import vnpay
from services.backup_service import BackupService
from services.monitoring_service import MonitoringService
from services.clone_service import CloneService
from services.export_import_service import ExportImportService
from services.sql_executor_service import SQLExecutorService
from typing import Optional

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
        # Add Google OAuth columns
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255);"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users MODIFY COLUMN hashed_password VARCHAR(255) NULL;"))
        except Exception:
            pass


def _ensure_mysql_columns():
    """If using MySQL, try to add missing columns to existing tables safely."""
    db_url = getattr(_database, 'DATABASE_URL', '')
    if not (db_url.startswith('mysql') or db_url.startswith('mysql+pymysql')):
        return
    # attempt to add columns if they don't exist
    with engine.begin() as conn:
        # Check and add google_id column
        try:
            # Check if column exists first
            result = conn.execute(text("""
                SELECT COUNT(*) FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME = 'google_id'
            """))
            if result.scalar() == 0:
                conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL;"))
                conn.execute(text("CREATE INDEX ix_users_google_id ON users(google_id);"))
        except Exception as e:
            print(f"Warning: Could not add google_id column: {e}")
            pass
        # Make hashed_password nullable
        try:
            conn.execute(text("ALTER TABLE users MODIFY COLUMN hashed_password VARCHAR(255) NULL;"))
        except Exception as e:
            print(f"Warning: Could not modify hashed_password: {e}")
            pass


_ensure_sqlite_columns()
_ensure_mysql_columns()

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

# --- Google OAuth APIs ---

@app.get("/auth/google")
def google_login():
    """Trả về Google OAuth URL để redirect user"""
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Get frontend URL and clean it
    frontend_url = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")[0].strip()
    # Remove trailing slash and any whitespace
    frontend_url = frontend_url.rstrip('/').strip()
    redirect_uri = f"{frontend_url}/auth/google/callback"
    
    # Ensure no whitespace in redirect_uri
    redirect_uri = redirect_uri.replace(' ', '').replace('\n', '').replace('\t', '')
    
    # Log redirect URI for debugging
    print(f"Google OAuth redirect_uri: {redirect_uri}")
    print(f"Redirect URI length: {len(redirect_uri)}, has spaces: {' ' in redirect_uri}")
    
    # URL encode redirect_uri properly
    from urllib.parse import urlencode
    params = {
        "client_id": google_client_id.strip(),
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline"
    }
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    return {"auth_url": google_auth_url}

@app.post("/auth/google/callback")
async def google_callback(request: schemas.GoogleCallbackRequest, db: Session = Depends(get_db)):
    """Xử lý Google OAuth callback và tạo/login user"""
    code = request.code
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not google_client_id or not google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    frontend_url = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")[0].strip()
    # Remove trailing slash if exists
    frontend_url = frontend_url.rstrip('/')
    redirect_uri = f"{frontend_url}/auth/google/callback"
    
    # Log redirect URI for debugging
    print(f"Google callback redirect_uri: {redirect_uri}")
    print(f"Received code: {code[:20]}...")
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        
        if token_response.status_code != 200:
            error_detail = token_response.text
            print(f"Google token exchange error: {error_detail}")
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to exchange code for token: {error_detail}"
            )
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            print(f"Google token response: {token_data}")
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info from Google
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        if user_info_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_info = user_info_response.json()
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", "")
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid user info from Google")
        
        # Check if user exists by google_id or email
        user = db.query(models.User).filter(
            (models.User.google_id == google_id) | (models.User.email == email)
        ).first()
        
        if user:
            # Update google_id if missing
            if not user.google_id:
                user.google_id = google_id
                db.commit()
        else:
            # Create new user
            user = models.User(
                email=email,
                google_id=google_id,
                hashed_password=None,  # No password for Google OAuth users
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generate JWT token
        access_token_jwt = create_access_token({"sub": str(user.id)})
        return {"access_token": access_token_jwt, "token_type": "bearer"}

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

    # Kiểm tra giới hạn số lượng database dựa trên users_allowed của gói
    # Đếm các database còn tồn tại/đang dùng (không tính DELETED)
    existing_db_count = db.query(models.Database).filter(
        models.Database.owner_id == current_user.id,
        models.Database.status.in_(["ACTIVE", "PENDING", "BLOCKED"])
    ).count()
    if existing_db_count >= plan.users_allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Vượt quá giới hạn số lượng database. Gói của bạn cho phép tạo {plan.users_allowed} database; "
                f"hiện tại đã có {existing_db_count}. Vui lòng nâng cấp gói hoặc xóa bớt database."
            )
        )
    
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
    
    # Tạo initial metrics để monitoring có data ngay
    try:
        from services.monitoring_service import MonitoringService
        monitoring_service = MonitoringService()
        # Collect initial metrics
        monitoring_service.collect_metrics(db, db_obj.id)
    except Exception as e:
        # Không block nếu không tạo được metrics
        print(f"Warning: Could not create initial metrics for database {db_obj.id}: {e}")
    
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
def get_db_stats(db_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lấy thống kê sử dụng database - query thực tế từ MySQL"""
    db_obj = db.query(models.Database).filter(models.Database.id == db_id, models.Database.owner_id == current_user.id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="DB not found")
    
    # Query thực tế từ MySQL để lấy size database (production only)
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
    
    # Check và update quota status
    quota_info = check_and_update_quota_status(current_user.id, db)
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

def check_and_update_quota_status(user_id: int, db: Session):
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
    
    # Query thực tế từ MySQL (production only)
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
    
    hostname = os.getenv("PUBLIC_MYSQL_HOST") or db_obj.hostname or "localhost"
    port = int(os.getenv("PUBLIC_MYSQL_PORT") or db_obj.port or 3306)
    # Lấy tên database thực tế (đã được sanitize khi tạo) hoặc fallback về db_{id}
    db_name = db_obj.physical_db_name or f"db_{db_obj.id}"
    username = db_obj.db_username or ""
    password = db_obj.db_password_hash or ""  # Trong production nên decrypt
    
    # Connection string với allowPublicKeyRetrieval=true để fix lỗi với MySQL 8.0+
    connection_string = f"mysql://{username}:{password}@{hostname}:{port}/{db_name}?allowPublicKeyRetrieval=true&useSSL=false"
    
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

# --- BACKUP & RESTORE APIs ---

@app.post("/db/{db_id}/backup", response_model=schemas.BackupOut)
def create_backup(
    db_id: int,
    req: schemas.CreateBackupRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo backup cho database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    backup_service = BackupService()
    try:
        backup = backup_service.create_backup(
            db=db,
            database_id=db_id,
            name=req.name,
            description=req.description
        )
        # Refresh để lấy status mới nhất
        db.refresh(backup)
        return backup
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"Backup API error: {error_detail}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {error_detail}")

@app.get("/db/{db_id}/backups", response_model=list[schemas.BackupOut])
def list_backups(
    db_id: int,
    status: Optional[str] = Query(None, description="Filter by status: PENDING, IN_PROGRESS, COMPLETED, FAILED"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách backups của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    backup_service = BackupService()
    backups = backup_service.list_backups(db=db, database_id=db_id, status=status)
    return backups

@app.get("/db/{db_id}/backups/{backup_id}", response_model=schemas.BackupOut)
def get_backup(
    db_id: int,
    backup_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy thông tin backup"""
    backup = db.query(models.Backup).filter(
        models.Backup.id == backup_id,
        models.Backup.database_id == db_id
    ).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    return backup

@app.delete("/db/{db_id}/backups/{backup_id}")
def delete_backup(
    db_id: int,
    backup_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Xóa backup"""
    backup = db.query(models.Backup).filter(
        models.Backup.id == backup_id,
        models.Backup.database_id == db_id
    ).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    backup_service = BackupService()
    backup_service.delete_backup(db=db, backup_id=backup_id)
    return {"ok": True}

@app.get("/db/{db_id}/backups/{backup_id}/download")
def download_backup(
    db_id: int,
    backup_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download backup file"""
    backup = db.query(models.Backup).filter(
        models.Backup.id == backup_id,
        models.Backup.database_id == db_id
    ).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    if backup.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Backup is not completed")
    
    if not os.path.exists(backup.file_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    return FileResponse(
        path=backup.file_path,
        filename=os.path.basename(backup.file_path),
        media_type="application/sql"
    )

@app.post("/db/{db_id}/restore", response_model=schemas.RestoreOut)
def restore_backup(
    db_id: int,
    req: schemas.RestoreRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore database từ backup"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    backup_service = BackupService()
    try:
        restore = backup_service.restore_backup(
            db=db,
            database_id=db_id,
            backup_id=req.backup_id
        )
        return restore
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@app.get("/db/{db_id}/restores/{restore_id}", response_model=schemas.RestoreOut)
def get_restore_status(
    db_id: int,
    restore_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy trạng thái restore operation"""
    restore = db.query(models.Restore).filter(
        models.Restore.id == restore_id,
        models.Restore.database_id == db_id
    ).first()
    if not restore:
        raise HTTPException(status_code=404, detail="Restore operation not found")
    
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    return restore

@app.get("/db/{db_id}/restores", response_model=list[schemas.RestoreOut])
def list_restores(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách restore operations của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    restores = db.query(models.Restore).filter(
        models.Restore.database_id == db_id
    ).order_by(models.Restore.created_at.desc()).all()
    return restores

# --- DATABASE CLONING APIs ---

@app.post("/db/{db_id}/clone", response_model=schemas.CloneOut)
def clone_database(
    db_id: int,
    req: schemas.CloneRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clone database"""
    # Kiểm tra database thuộc về user
    source_db = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not source_db:
        raise HTTPException(status_code=404, detail="Database not found")
    
    if source_db.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Source database must be ACTIVE")
    
    # Kiểm tra subscription active và giới hạn số lượng DB (giống tạo DB mới)
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    if not active_sub:
        raise HTTPException(
            status_code=400, 
            detail="Bạn cần có gói dịch vụ đang hoạt động để clone database. Vui lòng đăng ký gói trước."
        )
    
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói dịch vụ")
    
    # Kiểm tra giới hạn số lượng database (clone sẽ tạo DB mới)
    existing_db_count = db.query(models.Database).filter(
        models.Database.owner_id == current_user.id,
        models.Database.status.in_(["ACTIVE", "PENDING", "BLOCKED"])
    ).count()
    if existing_db_count >= plan.users_allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Không thể clone: vượt quá giới hạn số lượng database. Gói của bạn cho phép {plan.users_allowed} database; "
                f"hiện tại đã có {existing_db_count}. Vui lòng nâng cấp gói hoặc xóa bớt database."
            )
        )
    
    clone_service = CloneService()
    try:
        clone_op = clone_service.clone_database(
            db=db,
            source_database_id=db_id,
            name=req.name,
            description=req.description,
            owner_id=current_user.id
        )
        return clone_op
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Clone failed: {str(e)}")

@app.get("/db/{db_id}/clones", response_model=list[schemas.CloneOut])
def list_clones(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách clone operations của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    clone_service = CloneService()
    clones = clone_service.list_clones(db=db, database_id=db_id)
    return clones

@app.get("/clones/{clone_id}", response_model=schemas.CloneOut)
def get_clone_status(
    clone_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy trạng thái clone operation"""
    clone_op = db.query(models.DatabaseClone).filter(models.DatabaseClone.id == clone_id).first()
    if not clone_op:
        raise HTTPException(status_code=404, detail="Clone operation not found")
    
    # Kiểm tra user có quyền xem clone này không
    source_db = db.query(models.Database).filter(models.Database.id == clone_op.source_database_id).first()
    if source_db.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return clone_op

# --- DATABASE EXPORT/IMPORT APIs ---

@app.get("/db/{db_id}/export")
def export_database(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export database thành SQL dump file"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    export_service = ExportImportService()
    try:
        file_path = export_service.export_database(db=db, database_id=db_id)
        
        # Return file as download
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/sql"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/db/{db_id}/import", response_model=schemas.ImportOut)
def import_database(
    db_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import SQL dump vào database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    if not file.filename.endswith('.sql'):
        raise HTTPException(status_code=400, detail="File must be a .sql file")
    
    export_service = ExportImportService()
    
    # Lưu file tạm thời
    import_dir = Path(os.getenv("EXPORT_DIR", "/exports"))
    import_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_filename = f"import_{db_id}_{timestamp}_{file.filename}"
    temp_file_path = import_dir / temp_filename
    
    try:
        # Lưu uploaded file
        file_size = 0
        with open(temp_file_path, 'wb') as f:
            content = file.file.read()
            f.write(content)
            file_size = len(content) / (1024 * 1024)  # MB
        
        # Import database
        import_op = export_service.import_database(
            db=db,
            database_id=db_id,
            file_path=str(temp_file_path),
            file_name=file.filename,
            file_size_mb=round(file_size, 2)
        )
        
        return import_op
        
    except ValueError as e:
        # Xóa file tạm nếu có lỗi
        if temp_file_path.exists():
            temp_file_path.unlink()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Xóa file tạm nếu có lỗi
        if temp_file_path.exists():
            temp_file_path.unlink()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.get("/db/{db_id}/imports", response_model=list[schemas.ImportOut])
def list_imports(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách import operations của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    export_service = ExportImportService()
    imports = export_service.list_imports(db=db, database_id=db_id)
    return imports

@app.get("/imports/{import_id}", response_model=schemas.ImportOut)
def get_import_status(
    import_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy trạng thái import operation"""
    import_op = db.query(models.DatabaseImport).filter(models.DatabaseImport.id == import_id).first()
    if not import_op:
        raise HTTPException(status_code=404, detail="Import operation not found")
    
    # Kiểm tra user có quyền xem import này không
    db_obj = db.query(models.Database).filter(models.Database.id == import_op.database_id).first()
    if db_obj.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return import_op

# --- MONITORING APIs ---

@app.get("/db/{db_id}/metrics", response_model=schemas.MetricsResponse)
def get_metrics(
    db_id: int,
    timeframe: str = Query("1h", description="Timeframe: 1h, 6h, 24h, 7d"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy metrics của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    monitoring_service = MonitoringService()
    try:
        # Collect metrics trước khi lấy (để đảm bảo có data mới nhất)
        try:
            monitoring_service.collect_metrics(db, db_id)
        except Exception as e:
            # Không block nếu không collect được metrics
            print(f"Warning: Could not collect metrics: {e}")
        
        metrics = monitoring_service.get_metrics(db=db, database_id=db_id, timeframe=timeframe)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@app.get("/db/{db_id}/metrics/realtime", response_model=schemas.MetricsResponse)
def get_real_time_metrics(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy real-time metrics của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    monitoring_service = MonitoringService()
    metrics = monitoring_service.get_real_time_metrics(db=db, database_id=db_id)
    return metrics

@app.get("/db/{db_id}/connections", response_model=schemas.ConnectionsResponse)
def get_connections(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách connections của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    monitoring_service = MonitoringService()
    try:
        connections = monitoring_service.get_connections(db=db, database_id=db_id)
        return connections
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {str(e)}")

@app.get("/db/{db_id}/slow-queries", response_model=list[schemas.SlowQueryOut])
def get_slow_queries(
    db_id: int,
    limit: int = Query(50, description="Limit số lượng queries"),
    min_duration_ms: float = Query(1000.0, description="Minimum duration in milliseconds"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách slow queries"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    monitoring_service = MonitoringService()
    slow_queries = monitoring_service.get_slow_queries(
        db=db,
        database_id=db_id,
        limit=limit,
        min_duration_ms=min_duration_ms
    )
    return slow_queries

@app.get("/db/{db_id}/performance", response_model=schemas.PerformanceSummary)
def get_performance_summary(
    db_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy performance summary của database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    monitoring_service = MonitoringService()
    summary = monitoring_service.get_performance_summary(db=db, database_id=db_id)
    return summary

# --- SQL QUERY EXECUTION APIs ---

@app.post("/db/{db_id}/query", response_model=schemas.SQLQueryResponse)
def execute_sql_query(
    db_id: int,
    req: schemas.SQLQueryRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute SQL query trên database"""
    # Kiểm tra database thuộc về user
    db_obj = db.query(models.Database).filter(
        models.Database.id == db_id,
        models.Database.owner_id == current_user.id
    ).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Database not found")
    
    if db_obj.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Database must be ACTIVE")
    
    sql_executor = SQLExecutorService()
    try:
        result = sql_executor.execute_query(
            db=db,
            database_id=db_id,
            query=req.query,
            user_id=current_user.id
        )
        
        # Collect metrics sau khi execute query (để monitoring có data)
        try:
            monitoring_service = MonitoringService()
            monitoring_service.collect_metrics(db, db_id)
        except Exception as e:
            # Không block nếu không collect được metrics
            print(f"Warning: Could not collect metrics after query execution: {e}")
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

# --- SUBSCRIPTION APIs ---

@app.get("/subscription/storage-info")
def get_storage_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy thông tin storage của subscription"""
    # Kiểm tra user có subscription active không
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    
    if not active_sub:
        return {
            "has_subscription": False,
            "total_storage_mb": 0,
            "used_storage_mb": 0,
            "available_storage_mb": 0,
            "usage_percent": 0
        }
    
    # Lấy plan info
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    if not plan:
        return {
            "has_subscription": True,
            "total_storage_mb": 0,
            "used_storage_mb": 0,
            "available_storage_mb": 0,
            "usage_percent": 0
        }
    
    # Query tổng storage thực tế từ MySQL
    total_used_storage_mb = 0.0
    try:
        from services.mysql_service import MySQLService
        mysql_service = MySQLService()
        conn = mysql_service.connect()
        cur = conn.cursor()
        
        existing_dbs = db.query(models.Database).filter(
            models.Database.owner_id == current_user.id,
            models.Database.status == "ACTIVE"
        ).all()
        
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
    except Exception as e:
        print(f"Error calculating storage: {e}")
        total_used_storage_mb = 0.0
    
    total_storage_mb = plan.storage_mb
    available_storage_mb = max(0, total_storage_mb - total_used_storage_mb)
    usage_percent = (total_used_storage_mb / total_storage_mb * 100) if total_storage_mb > 0 else 0
    
    return {
        "has_subscription": True,
        "total_storage_mb": total_storage_mb,
        "used_storage_mb": round(total_used_storage_mb, 2),
        "available_storage_mb": round(available_storage_mb, 2),
        "usage_percent": round(usage_percent, 2),
        "plan_name": plan.name
    }

@app.get("/subscriptions")
def list_subscriptions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách subscriptions của user"""
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).order_by(models.Subscription.created_at.desc()).all()
    
    result = []
    for sub in subscriptions:
        plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == sub.plan_id).first()
        result.append({
            "id": sub.id,
            "plan_id": sub.plan_id,
            "plan_name": plan.name if plan else "Unknown",
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "auto_renew": sub.auto_renew
        })
    
    return result

@app.post("/subscriptions")
def create_subscription(
    req: dict = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tạo subscription mới cho user"""
    plan_id = req.get("plan_id")
    auto_renew = req.get("auto_renew", True)
    
    if not plan_id:
        raise HTTPException(status_code=400, detail="plan_id is required")
    
    # Kiểm tra plan có tồn tại không
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Kiểm tra user đã có subscription active chưa
    existing_active = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="You already have an active subscription. Please cancel it first before subscribing to a new plan."
        )
    
    # Kiểm tra số dư
    price_cents = plan.price_monthly_cents
    if price_cents > 0:
        if current_user.balance_cents < price_cents:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Required: {price_cents/100:.2f}₫, Available: {current_user.balance_cents/100:.2f}₫"
            )
        
        # Trừ tiền từ balance
        current_user.balance_cents -= price_cents
        
        # Tạo payment record
        payment = models.Payment(
            user_id=current_user.id,
            amount_cents=price_cents,
            currency="VND",
            status="COMPLETED",
            payment_method="BALANCE",
            description=f"Subscription: {plan.name}"
        )
        db.add(payment)
    
    # Tạo subscription
    from datetime import datetime, timedelta
    expires_at = datetime.utcnow() + timedelta(days=30)  # 30 days subscription
    
    subscription = models.Subscription(
        user_id=current_user.id,
        plan_id=plan_id,
        status="ACTIVE",
        auto_renew=1 if auto_renew else 0,
        expires_at=expires_at
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return {
        "id": subscription.id,
        "plan_id": subscription.plan_id,
        "plan_name": plan.name,
        "status": subscription.status,
        "created_at": subscription.created_at.isoformat() if subscription.created_at else None,
        "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
        "auto_renew": subscription.auto_renew
    }

@app.post("/subscriptions/{sub_id}/cancel")
def cancel_subscription(
    sub_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Hủy subscription"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == sub_id,
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Only active subscriptions can be cancelled")
    
    subscription.status = "CANCELLED"
    subscription.auto_renew = False
    db.commit()
    
    return {"message": "Subscription cancelled successfully"}

@app.post("/subscriptions/{sub_id}/auto-renew")
def toggle_auto_renew(
    sub_id: int,
    req: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle auto-renew cho subscription"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == sub_id,
        models.Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    auto_renew = req.get("auto_renew", True) if req else True
    subscription.auto_renew = 1 if auto_renew else 0
    db.commit()
    
    return {
        "id": subscription.id,
        "auto_renew": bool(subscription.auto_renew)
    }

@app.get("/subscriptions/active")
def get_active_subscription(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy subscription active của user"""
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    
    if not active_sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
    
    return {
        "id": active_sub.id,
        "plan_id": active_sub.plan_id,
        "plan_name": plan.name if plan else "Unknown",
        "status": active_sub.status,
        "created_at": active_sub.created_at.isoformat() if active_sub.created_at else None,
        "expires_at": active_sub.expires_at.isoformat() if active_sub.expires_at else None,
        "auto_renew": active_sub.auto_renew
    }

@app.get("/usage/stats")
def get_usage_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy thống kê sử dụng của user"""
    databases = db.query(models.Database).filter(
        models.Database.owner_id == current_user.id
    ).all()
    
    active_databases = [db for db in databases if db.status == "ACTIVE"]
    
    # Tính tổng storage đã dùng
    total_used_storage_mb = 0.0
    try:
        from services.mysql_service import MySQLService
        mysql_service = MySQLService()
        conn = mysql_service.connect()
        cur = conn.cursor()
        
        for db_obj in active_databases:
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
    
    # Lấy subscription active
    active_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.status == "ACTIVE"
    ).first()
    
    plan_storage_mb = 0
    if active_sub:
        plan = db.query(models.PricingPlan).filter(models.PricingPlan.id == active_sub.plan_id).first()
        if plan:
            plan_storage_mb = plan.storage_mb
    
    # Tính tổng chi tiêu (từ payments)
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id,
        models.Payment.status == "COMPLETED"
    ).all()
    
    total_spent_cents = sum(p.amount_cents for p in payments)
    
    return {
        "total_databases": len(databases),
        "active_databases": len(active_databases),
        "active_subscriptions": 1 if active_sub else 0,
        "total_used_storage_mb": round(total_used_storage_mb, 2),
        "plan_storage_mb": plan_storage_mb,
        "total_spent_cents": total_spent_cents
    }

@app.get("/invoices")
def list_invoices(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách invoices (payments) của user"""
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id
    ).order_by(models.Payment.created_at.desc()).all()
    
    result = []
    for payment in payments:
        result.append({
            "id": payment.id,
            "amount_cents": payment.amount_cents,
            "currency": payment.currency,
            "status": payment.status,
            "payment_method": payment.payment_method,
            "description": payment.description,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "completed_at": payment.completed_at.isoformat() if payment.completed_at else None
        })
    
    return result