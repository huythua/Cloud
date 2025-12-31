"""
conftest.py - Pytest configuration và fixtures
"""

import pytest
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import Base, get_db
from main import app
import models

# Test database URL - dùng SQLite in-memory cho tests
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    """Tạo test database và session"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db, test_user):
    """Tạo test client với test database"""
    from auth import get_current_user
    
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(test_db):
    """Tạo test user"""
    from auth import get_password_hash
    user = models.User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        points=0,
        balance_cents=100000  # 1000 VND
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def test_user_token(client, test_user):
    """Lấy access token cho test user"""
    response = client.post(
        "/auth/login",
        data={"username": test_user.email, "password": "testpassword123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def authenticated_client(client, test_user_token):
    """Client đã authenticated"""
    client.headers = {"Authorization": f"Bearer {test_user_token}"}
    return client

@pytest.fixture
def test_database(test_db, test_user):
    """Tạo test database"""
    database = models.Database(
        name="test_db",
        owner_id=test_user.id,
        quota_mb=1000,
        status="ACTIVE",
        hostname="localhost",
        port=3306,
        db_username="test_user",
        db_password_hash="hashed_password",
        physical_db_name="test_db_physical"
    )
    test_db.add(database)
    test_db.commit()
    test_db.refresh(database)
    return database

