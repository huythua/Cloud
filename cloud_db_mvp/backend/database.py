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
else:
    # Với MySQL qua PyMySQL, tránh truyền tham số không hỗ trợ
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
