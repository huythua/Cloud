"""
database.py - SQLAlchemy DB connection & session
- Metadata DB config
- SessionLocal, Base, get_db dependency
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("METADATA_DATABASE_URL", "sqlite:///./metadata.db")

# Xử lý connect_args dựa trên loại database
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif DATABASE_URL.startswith("mysql") or DATABASE_URL.startswith("mysql+pymysql"):
    # Fix lỗi "Public Key Retrieval is not allowed" với MySQL 8.0+
    connect_args = {"allowPublicKeyRetrieval": True}
    # Nếu URL chưa có tham số, thêm vào URL
    if "?" not in DATABASE_URL:
        DATABASE_URL = f"{DATABASE_URL}?allowPublicKeyRetrieval=true"
else:
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
