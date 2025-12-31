"""
test_monitoring_service.py - Tests cho MonitoringService
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.monitoring_service import MonitoringService
from models import Database, PerformanceMetric, SlowQuery
from sqlalchemy.orm import Session

class TestMonitoringService:
    """Tests cho MonitoringService"""
    
    def test_get_metrics(self, test_db: Session, test_database):
        """Test lấy metrics"""
        monitoring_service = MonitoringService()
        
        # Tạo một số metrics
        metric1 = PerformanceMetric(
            database_id=test_database.id,
            metric_type="CONNECTIONS",
            value=10.0,
            timestamp=datetime.now()
        )
        metric2 = PerformanceMetric(
            database_id=test_database.id,
            metric_type="QUERIES",
            value=100.0,
            timestamp=datetime.now()
        )
        test_db.add_all([metric1, metric2])
        test_db.commit()
        
        metrics = monitoring_service.get_metrics(test_db, test_database.id, "1h")
        
        assert metrics is not None
        assert metrics["database_id"] == test_database.id
        assert metrics["timeframe"] == "1h"
        assert "metrics" in metrics
        assert len(metrics["metrics"]["CONNECTIONS"]) > 0
        assert len(metrics["metrics"]["QUERIES"]) > 0
    
    def test_get_metrics_invalid_timeframe(self, test_db: Session, test_database):
        """Test lấy metrics với timeframe không hợp lệ"""
        monitoring_service = MonitoringService()
        
        # Invalid timeframe sẽ được default về "1h"
        metrics = monitoring_service.get_metrics(test_db, test_database.id, "invalid")
        
        assert metrics["timeframe"] == "1h"
    
    def test_get_connections_database_not_found(self, test_db: Session):
        """Test get connections với database không tồn tại"""
        monitoring_service = MonitoringService()
        
        with pytest.raises(ValueError, match="Database .* not found"):
            monitoring_service.get_connections(test_db, 99999)
    
    def test_get_connections_database_not_active(self, test_db: Session, test_user):
        """Test get connections với database không ACTIVE"""
        monitoring_service = MonitoringService()
        
        database = Database(
            name="pending_db",
            owner_id=test_user.id,
            status="PENDING",
            physical_db_name="pending_db_physical"
        )
        test_db.add(database)
        test_db.commit()
        test_db.refresh(database)
        
        with pytest.raises(ValueError, match="is not ACTIVE"):
            monitoring_service.get_connections(test_db, database.id)
    
    def test_get_slow_queries(self, test_db: Session, test_database):
        """Test lấy slow queries"""
        monitoring_service = MonitoringService()
        
        # Tạo một số slow queries
        slow_query1 = SlowQuery(
            database_id=test_database.id,
            query_text="SELECT * FROM large_table",
            duration_ms=2500.0,
            rows_examined=10000,
            rows_sent=100
        )
        slow_query2 = SlowQuery(
            database_id=test_database.id,
            query_text="SELECT COUNT(*) FROM huge_table",
            duration_ms=5000.0,
            rows_examined=50000,
            rows_sent=1
        )
        test_db.add_all([slow_query1, slow_query2])
        test_db.commit()
        
        slow_queries = monitoring_service.get_slow_queries(
            test_db,
            test_database.id,
            limit=10,
            min_duration_ms=1000.0
        )
        
        assert len(slow_queries) == 2
        assert slow_queries[0]["duration_ms"] >= 1000.0
    
    def test_get_slow_queries_with_min_duration(self, test_db: Session, test_database):
        """Test lấy slow queries với min_duration filter"""
        monitoring_service = MonitoringService()
        
        # Tạo slow queries với duration khác nhau
        slow_query1 = SlowQuery(
            database_id=test_database.id,
            query_text="Fast query",
            duration_ms=500.0  # Không đủ min_duration
        )
        slow_query2 = SlowQuery(
            database_id=test_database.id,
            query_text="Slow query",
            duration_ms=2000.0  # Đủ min_duration
        )
        test_db.add_all([slow_query1, slow_query2])
        test_db.commit()
        
        slow_queries = monitoring_service.get_slow_queries(
            test_db,
            test_database.id,
            limit=10,
            min_duration_ms=1000.0
        )
        
        # Chỉ có query với duration >= 1000ms
        assert len(slow_queries) == 1
        assert slow_queries[0]["duration_ms"] >= 1000.0
    
    def test_get_performance_summary_database_not_found(self, test_db: Session):
        """Test get performance summary với database không tồn tại"""
        monitoring_service = MonitoringService()
        
        with pytest.raises(ValueError, match="Database .* not found"):
            monitoring_service.get_performance_summary(test_db, 99999)

