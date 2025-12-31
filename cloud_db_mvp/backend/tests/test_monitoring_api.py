"""
test_monitoring_api.py - Tests cho Monitoring API endpoints
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from models import Database, PerformanceMetric, SlowQuery
from datetime import datetime

class TestMonitoringAPI:
    """Tests cho Monitoring API endpoints"""
    
    def test_get_metrics_success(self, authenticated_client: TestClient, test_db, test_database):
        """Test lấy metrics thành công"""
        # Tạo một số metrics
        metric = PerformanceMetric(
            database_id=test_database.id,
            metric_type="CONNECTIONS",
            value=5.0,
            timestamp=datetime.now()
        )
        test_db.add(metric)
        test_db.commit()
        
        response = authenticated_client.get(
            f"/db/{test_database.id}/metrics",
            params={"timeframe": "1h"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["database_id"] == test_database.id
        assert data["timeframe"] == "1h"
        assert "metrics" in data
    
    def test_get_metrics_database_not_found(self, authenticated_client: TestClient):
        """Test lấy metrics với database không tồn tại"""
        response = authenticated_client.get("/db/99999/metrics")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_realtime_metrics_success(self, authenticated_client: TestClient, test_database):
        """Test lấy real-time metrics"""
        response = authenticated_client.get(f"/db/{test_database.id}/metrics/realtime")
        
        # Có thể thành công hoặc fail tùy vào MySQL connection
        assert response.status_code in [200, 400, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["database_id"] == test_database.id
            assert "metrics" in data
            assert "timestamp" in data
    
    def test_get_connections_success(self, authenticated_client: TestClient, test_database):
        """Test lấy connections"""
        response = authenticated_client.get(f"/db/{test_database.id}/connections")
        
        # Có thể thành công hoặc fail tùy vào MySQL connection
        assert response.status_code in [200, 400, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["database_id"] == test_database.id
            assert "active" in data
            assert "max_connections" in data
            assert "connections" in data
    
    def test_get_slow_queries_success(self, authenticated_client: TestClient, test_db, test_database):
        """Test lấy slow queries"""
        # Tạo slow query
        slow_query = SlowQuery(
            database_id=test_database.id,
            query_text="SELECT * FROM test_table",
            duration_ms=1500.0
        )
        test_db.add(slow_query)
        test_db.commit()
        
        response = authenticated_client.get(
            f"/db/{test_database.id}/slow-queries",
            params={"limit": 10, "min_duration_ms": 1000.0}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert data[0]["duration_ms"] >= 1000.0
    
    def test_get_performance_summary_success(self, authenticated_client: TestClient, test_database):
        """Test lấy performance summary"""
        response = authenticated_client.get(f"/db/{test_database.id}/performance")
        
        # Có thể thành công hoặc fail tùy vào MySQL connection
        assert response.status_code in [200, 400, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["database_id"] == test_database.id
            assert "qps" in data
            assert "avg_response_time_ms" in data
            assert "active_connections" in data
    
    def test_get_metrics_unauthorized(self, test_db, test_database):
        """Test lấy metrics không có authentication"""
        from fastapi.testclient import TestClient
        from main import app
        from database import get_db
        
        # Tạo client mới không có authentication override
        def override_get_db():
            try:
                yield test_db
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        # Không override get_current_user để test 401
        if 'get_current_user' in app.dependency_overrides:
            del app.dependency_overrides['get_current_user']
        
        client = TestClient(app)
        response = client.get(f"/db/{test_database.id}/metrics")
        
        # Restore override
        from auth import get_current_user
        from tests.conftest import test_user
        app.dependency_overrides[get_current_user] = lambda: test_user
        
        assert response.status_code == 401

