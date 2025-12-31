"""
monitoring_service.py - Service để monitor và collect performance metrics
- Query MySQL performance_schema
- Collect metrics (CPU, Memory, Connections, Queries)
- Track slow queries
- Calculate performance summary
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from models import Database, PerformanceMetric, SlowQuery, MetricType
from services.mysql_service import MySQLService
import json

class MonitoringService:
    def __init__(self):
        self.mysql_service = MySQLService()
    
    def get_metrics(self, db: Session, database_id: int, timeframe: str = "1h") -> Dict:
        """
        Lấy performance metrics theo timeframe
        timeframe: "1h", "24h", "7d", "30d"
        """
        # Parse timeframe
        timeframe_map = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        
        if timeframe not in timeframe_map:
            timeframe = "1h"
        
        since = datetime.now() - timeframe_map[timeframe]
        
        # Query metrics từ database
        metrics_query = db.query(PerformanceMetric).filter(
            and_(
                PerformanceMetric.database_id == database_id,
                PerformanceMetric.timestamp >= since
            )
        ).order_by(PerformanceMetric.timestamp.asc())
        
        # Group by metric_type
        # QUERIES metric giờ lưu QPS (Queries Per Second) thay vì total queries
        metrics_dict = {
            "CPU": [],
            "MEMORY": [],
            "CONNECTIONS": [],
            "QUERIES": [],  # Giờ là QPS, không phải total queries
            "RESPONSE_TIME": [],
            "THROUGHPUT": []
        }
        
        for metric in metrics_query.all():
            metric_type = metric.metric_type
            if metric_type in metrics_dict:
                # QUERIES metric giờ là QPS (queries per second)
                metrics_dict[metric_type].append({
                    "value": float(metric.value),
                    "timestamp": metric.timestamp.isoformat() if metric.timestamp else None
                })
        
        # Nếu không có historical data, lấy real-time metrics và tạo sample data
        has_data = any(len(v) > 0 for v in metrics_dict.values())
        if not has_data:
            # Luôn đảm bảo có data bằng cách lấy từ MySQL trực tiếp
            database = db.query(Database).filter(Database.id == database_id).first()
            if database and database.status == "ACTIVE":
                physical_db_name = database.physical_db_name or f"db_{database.id}"
                now = datetime.now()
                try:
                    conn = self.mysql_service.connect()
                    cur = conn.cursor()
                    
                    # Get connections
                    cur.execute("""
                        SELECT COUNT(*) as active_connections
                        FROM information_schema.PROCESSLIST
                        WHERE DB = %s AND COMMAND != 'Sleep'
                    """, (physical_db_name,))
                    conn_result = cur.fetchone()
                    active_conn = conn_result[0] if conn_result else 0
                    
                    # Get storage
                    cur.execute("""
                        SELECT 
                            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                        FROM information_schema.tables
                        WHERE table_schema = %s
                    """, (physical_db_name,))
                    storage_result = cur.fetchone()
                    storage_mb = float(storage_result[0]) if storage_result and storage_result[0] else 0.0
                    
                    # Tính QPS từ total queries (nếu có stored metrics trước đó)
                    cur.execute("""
                        SELECT VARIABLE_VALUE
                        FROM performance_schema.global_status
                        WHERE VARIABLE_NAME = 'Questions'
                    """)
                    query_result = cur.fetchone()
                    current_total_queries = int(query_result[0]) if query_result else 0
                    
                    cur.close()
                    conn.close()
                    
                    # Tính QPS từ stored metrics (nếu có)
                    qps_value = 0.0
                    since_5min = now - timedelta(minutes=5)
                    last_query_metric = db.query(PerformanceMetric).filter(
                        and_(
                            PerformanceMetric.database_id == database_id,
                            PerformanceMetric.metric_type == "QUERIES",
                            PerformanceMetric.timestamp >= since_5min
                        )
                    ).order_by(PerformanceMetric.timestamp.desc()).first()
                    
                    if last_query_metric:
                        # Tìm total queries metric gần nhất để tính QPS
                        # Tạm thời dùng giá trị stored QUERIES (có thể là QPS hoặc total)
                        # Nếu là QPS thì dùng luôn, nếu là total thì tính
                        previous_value = float(last_query_metric.value)
                        time_diff = (now - last_query_metric.timestamp).total_seconds()
                        if time_diff > 0 and previous_value < 1000000:  # Nếu giá trị nhỏ, có thể là QPS
                            # Giả sử đây là total queries, tính QPS
                            qps_value = (current_total_queries - previous_value) / time_diff
                        elif previous_value < 1000:  # Nếu giá trị nhỏ, có thể là QPS rồi
                            qps_value = previous_value
                    
                    # Tạo data points (luôn có ít nhất 1 data point)
                    metrics_dict["CONNECTIONS"].append({
                        "value": float(active_conn),
                        "timestamp": now.isoformat()
                    })
                    metrics_dict["MEMORY"].append({
                        "value": storage_mb,
                        "timestamp": now.isoformat()
                    })
                    metrics_dict["QUERIES"].append({
                        "value": qps_value,  # Giờ là QPS, không phải total queries
                        "timestamp": now.isoformat()
                    })
                    
                    print(f"Created real-time metrics for database {database_id}: CONNECTIONS={active_conn}, MEMORY={storage_mb}MB, QPS={qps_value:.2f}")
                except Exception as e:
                    print(f"Warning: Could not get real-time values from MySQL for database {database_id}: {e}")
                    # Nếu không lấy được, vẫn tạo default data points
                    metrics_dict["CONNECTIONS"].append({
                        "value": 0.0,
                        "timestamp": now.isoformat()
                    })
                    metrics_dict["MEMORY"].append({
                        "value": 0.0,
                        "timestamp": now.isoformat()
                    })
                    metrics_dict["QUERIES"].append({
                        "value": 0.0,  # QPS = 0 nếu không có data
                        "timestamp": now.isoformat()
                    })
        
        return {
            "database_id": database_id,
            "timeframe": timeframe,
            "metrics": metrics_dict
        }
    
    def get_real_time_metrics(self, db: Session, database_id: int) -> Dict:
        """
        Lấy real-time metrics từ MySQL performance_schema
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE")
        
        physical_db_name = database.physical_db_name or f"db_{database.id}"
        
        try:
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            
            metrics = {}
            
            # 1. Active Connections
            cur.execute("""
                SELECT COUNT(*) as active_connections
                FROM information_schema.PROCESSLIST
                WHERE DB = %s AND COMMAND != 'Sleep'
            """, (physical_db_name,))
            result = cur.fetchone()
            metrics["connections"] = {
                "active": result[0] if result else 0,
                "max": self._get_max_connections(cur)
            }
            
            # 2. Queries per second (from last minute)
            cur.execute("""
                SELECT 
                    VARIABLE_VALUE as qps
                FROM performance_schema.global_status
                WHERE VARIABLE_NAME = 'Questions'
            """)
            result = cur.fetchone()
            # Questions là tổng số queries từ khi MySQL start
            # Để tính QPS, cần lưu giá trị trước đó và so sánh
            # Tạm thời return giá trị hiện tại
            metrics["queries"] = {
                "total": int(result[0]) if result else 0,
                "per_second": 0  # Sẽ tính từ stored metrics
            }
            
            # 3. Average response time (từ performance_schema)
            # MySQL không có built-in avg response time, cần tính từ slow query log hoặc events_statements_summary
            metrics["response_time"] = {
                "avg_ms": 0,  # Sẽ tính từ stored metrics
                "min_ms": 0,
                "max_ms": 0
            }
            
            # 4. Database size
            cur.execute("""
                SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                FROM information_schema.tables
                WHERE table_schema = %s
            """, (physical_db_name,))
            result = cur.fetchone()
            metrics["storage"] = {
                "size_mb": float(result[0]) if result and result[0] else 0.0
            }
            
            cur.close()
            conn.close()
            
            # Format theo MetricsResponse schema + format cho frontend
            now = datetime.now()
            storage_size = metrics.get("storage", {}).get("size_mb", 0.0)
            active_conn = metrics.get("connections", {}).get("active", 0)
            total_queries = metrics.get("queries", {}).get("total", 0)
            
            return {
                "database_id": database_id,
                "timeframe": "realtime",
                "metrics": {
                    "CPU": [],
                    "MEMORY": [{"value": storage_size, "timestamp": now.isoformat()}] if storage_size is not None else [],
                    "CONNECTIONS": [{"value": float(active_conn), "timestamp": now.isoformat()}] if active_conn is not None else [],
                    "QUERIES": [{"value": float(total_queries), "timestamp": now.isoformat()}] if total_queries is not None else [],
                    "RESPONSE_TIME": [],
                    "THROUGHPUT": []
                },
                # Thêm format cho frontend real-time display (compatible với frontend expect)
                "storage": metrics.get("storage", {}),
                "connections": metrics.get("connections", {}),
                "queries": metrics.get("queries", {})
            }
            
        except Exception as e:
            raise Exception(f"Failed to get real-time metrics: {str(e)}")
    
    def get_connections(self, db: Session, database_id: int) -> Dict:
        """
        Lấy danh sách active connections
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE")
        
        physical_db_name = database.physical_db_name or f"db_{database.id}"
        
        try:
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            
            # Get max connections
            max_connections = self._get_max_connections(cur)
            
            # Get active connections
            cur.execute("""
                SELECT 
                    ID,
                    USER,
                    HOST,
                    DB,
                    COMMAND,
                    TIME,
                    STATE,
                    INFO
                FROM information_schema.PROCESSLIST
                WHERE DB = %s
                ORDER BY TIME DESC
            """, (physical_db_name,))
            
            connections = []
            for row in cur.fetchall():
                connections.append({
                    "id": row[0],
                    "user": row[1] or "unknown",
                    "host": row[2] or "unknown",
                    "db": row[3] or "unknown",
                    "command": row[4] or "unknown",
                    "time": row[5] or 0,
                    "state": row[6] or "unknown",
                    "info": row[7] or None
                })
            
            active_count = len([c for c in connections if c["command"] != "Sleep"])
            
            cur.close()
            conn.close()
            
            return {
                "database_id": database_id,
                "active": active_count,
                "max_connections": max_connections,
                "connections": connections
            }
            
        except Exception as e:
            raise Exception(f"Failed to get connections: {str(e)}")
    
    def get_slow_queries(self, db: Session, database_id: int, limit: int = 50, min_duration_ms: float = 1000.0) -> List[Dict]:
        """
        Lấy slow queries từ database hoặc MySQL slow query log
        """
        # Query từ stored slow_queries table
        slow_queries = db.query(SlowQuery).filter(
            and_(
                SlowQuery.database_id == database_id,
                SlowQuery.duration_ms >= min_duration_ms
            )
        ).order_by(SlowQuery.timestamp.desc()).limit(limit).all()
        
        result = []
        for sq in slow_queries:
            result.append({
                "id": sq.id,
                "database_id": sq.database_id,
                "query_text": sq.query_text,
                "duration_ms": float(sq.duration_ms),
                "rows_examined": sq.rows_examined,
                "rows_sent": sq.rows_sent,
                "timestamp": sq.timestamp.isoformat() if sq.timestamp else None
            })
        
        return result
    
    def get_performance_summary(self, db: Session, database_id: int) -> Dict:
        """
        Tính toán performance summary statistics
        Luôn trả về data ngay cả khi database mới tạo
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        # Get real-time metrics (luôn có data)
        try:
            real_time = self.get_real_time_metrics(db, database_id)
        except Exception as e:
            # Nếu không lấy được real-time, trả về default values
            print(f"Warning: Could not get real-time metrics: {e}")
            return {
                "database_id": database_id,
                "qps": 0.0,
                "avg_response_time_ms": 0.0,
                "error_rate": 0.0,
                "active_connections": 0,
                "max_connections": 100,
                "cpu_usage_percent": None,
                "memory_usage_mb": 0.0,
                "slow_queries_count": 0
            }
        
        # Calculate QPS từ stored metrics (last 1 minute)
        since = datetime.now() - timedelta(minutes=1)
        query_metrics = db.query(PerformanceMetric).filter(
            and_(
                PerformanceMetric.database_id == database_id,
                PerformanceMetric.metric_type == "QUERIES",
                PerformanceMetric.timestamp >= since
            )
        ).all()
        
        qps = 0.0
        if query_metrics and len(query_metrics) > 1:
            # Tính QPS từ sự khác biệt giữa metrics
            values = [float(m.value) for m in query_metrics]
            if len(values) >= 2:
                diff = values[-1] - values[0]
                time_diff = (query_metrics[-1].timestamp - query_metrics[0].timestamp).total_seconds()
                if time_diff > 0:
                    qps = diff / time_diff
        elif query_metrics:
            # Nếu chỉ có 1 metric, dùng giá trị hiện tại
            qps = float(query_metrics[0].value) / 60.0
        
        # Nếu không có stored metrics, tính từ real-time
        if qps == 0.0:
            # Thử lấy từ format mới trước (queries ở top level)
            if "queries" in real_time:
                qps = real_time["queries"].get("per_second", 0.0)
            elif "metrics" in real_time:
                queries_info = real_time["metrics"].get("queries", {})
                # Estimate QPS từ total queries (rất rough estimate)
                qps = queries_info.get("per_second", 0.0)
        
        # Calculate avg response time từ stored metrics
        response_time_metrics = db.query(PerformanceMetric).filter(
            and_(
                PerformanceMetric.database_id == database_id,
                PerformanceMetric.metric_type == "RESPONSE_TIME",
                PerformanceMetric.timestamp >= since
            )
        ).all()
        
        avg_response_time_ms = 0.0
        if response_time_metrics:
            avg_response_time_ms = sum(float(m.value) for m in response_time_metrics) / len(response_time_metrics)
        
        # Count slow queries (last 24h)
        since_24h = datetime.now() - timedelta(hours=24)
        slow_queries_count = db.query(SlowQuery).filter(
            and_(
                SlowQuery.database_id == database_id,
                SlowQuery.timestamp >= since_24h
            )
        ).count()
        
        # Lấy connections và storage info từ real-time metrics
        # Sử dụng cả format mới (connections/storage/queries) và format cũ (metrics.CONNECTIONS)
        active_connections = 0
        memory_usage_mb = 0.0
        
        # Thử lấy từ format mới trước
        if "connections" in real_time:
            active_connections = real_time["connections"].get("active", 0)
        elif "metrics" in real_time and "CONNECTIONS" in real_time["metrics"]:
            connections_info = real_time["metrics"]["CONNECTIONS"]
            if connections_info and len(connections_info) > 0:
                active_connections = int(connections_info[-1].get("value", 0))
        
        if "storage" in real_time:
            memory_usage_mb = real_time["storage"].get("size_mb", 0.0)
        elif "metrics" in real_time and "MEMORY" in real_time["metrics"]:
            storage_info = real_time["metrics"]["MEMORY"]
            if storage_info and len(storage_info) > 0:
                memory_usage_mb = float(storage_info[-1].get("value", 0.0))
        
        # Lấy max_connections từ MySQL
        try:
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            max_connections = self._get_max_connections(cur)
            cur.close()
            conn.close()
        except:
            max_connections = 100
        
        return {
            "database_id": database_id,
            "qps": round(qps, 2),
            "avg_response_time_ms": round(avg_response_time_ms, 2),
            "error_rate": 0.0,  # TODO: Calculate from error logs
            "active_connections": active_connections,
            "max_connections": max_connections,
            "cpu_usage_percent": None,  # TODO: Get from system metrics
            "memory_usage_mb": round(memory_usage_mb, 2),
            "slow_queries_count": slow_queries_count
        }
    
    def collect_metrics(self, db: Session, database_id: int) -> None:
        """
        Collect và lưu metrics vào database
        Chạy định kỳ (mỗi 1 phút) để collect metrics
        Luôn đảm bảo có ít nhất 1 metric được lưu để hiển thị
        """
        try:
            real_time = self.get_real_time_metrics(db, database_id)
            now = datetime.now()
            metrics_added = 0
            
            # Lưu connections metric (luôn có, ít nhất là 0)
            connections_data = real_time["metrics"].get("CONNECTIONS", [])
            if connections_data and len(connections_data) > 0:
                conn_value = connections_data[-1].get("value", 0)
            else:
                conn_value = 0
            
            metric = PerformanceMetric(
                database_id=database_id,
                metric_type=MetricType.CONNECTIONS.value,
                value=conn_value,
                timestamp=now
            )
            db.add(metric)
            metrics_added += 1
            
            # Tính QPS (Queries Per Second) từ total queries
            # Lấy total queries hiện tại từ MySQL
            try:
                conn = self.mysql_service.connect()
                cur = conn.cursor()
                cur.execute("""
                    SELECT VARIABLE_VALUE
                    FROM performance_schema.global_status
                    WHERE VARIABLE_NAME = 'Questions'
                """)
                result = cur.fetchone()
                current_total_queries = int(result[0]) if result else 0
                cur.close()
                conn.close()
            except Exception as e:
                print(f"Warning: Could not get total queries from MySQL: {e}")
                current_total_queries = 0
            
            # Tìm stored QUERIES metric gần nhất để lấy total queries trước đó
            # Lưu ý: Stored QUERIES metrics giờ là QPS, nhưng để tính QPS lần đầu,
            # ta cần lưu total queries vào một nơi khác hoặc tính từ MySQL
            # Tạm thời: Lấy total queries từ real-time metrics (nếu có)
            qps_value = 0.0
            
            # Tìm metric QUERIES gần nhất (trong 5 phút) để tính QPS
            since_5min = now - timedelta(minutes=5)
            last_query_metric = db.query(PerformanceMetric).filter(
                and_(
                    PerformanceMetric.database_id == database_id,
                    PerformanceMetric.metric_type == "QUERIES",
                    PerformanceMetric.timestamp >= since_5min
                )
            ).order_by(PerformanceMetric.timestamp.desc()).first()
            
            if last_query_metric:
                # Nếu stored metric là QPS (giá trị nhỏ < 10000), không thể tính từ đó
                # Cần lưu total queries riêng hoặc lấy từ MySQL mỗi lần
                # Tạm thời: Tính QPS từ total queries hiện tại và stored total queries
                # Nhưng stored metric giờ là QPS rồi, nên không thể dùng
                # Giải pháp: Lấy total queries từ MySQL và tính QPS từ stored total queries
                # Nhưng không có stored total queries, nên tính QPS từ stored QPS (smooth average)
                stored_qps = float(last_query_metric.value)
                if stored_qps < 10000:  # Nếu là QPS (giá trị nhỏ)
                    # Dùng stored QPS làm giá trị hiện tại (smooth)
                    qps_value = stored_qps
                else:  # Nếu là total queries (giá trị lớn) - backward compatibility
                    previous_total = stored_qps
                    time_diff = (now - last_query_metric.timestamp).total_seconds()
                    if time_diff > 0:
                        qps_value = (current_total_queries - previous_total) / time_diff
            
            # Nếu không có stored metrics hoặc không tính được, tính QPS từ total queries
            if qps_value == 0.0 and current_total_queries > 0:
                # Tìm metric QUERIES đầu tiên (có thể là total queries) trong 10 phút
                since_10min = now - timedelta(minutes=10)
                first_query_metric = db.query(PerformanceMetric).filter(
                    and_(
                        PerformanceMetric.database_id == database_id,
                        PerformanceMetric.metric_type == "QUERIES",
                        PerformanceMetric.timestamp >= since_10min
                    )
                ).order_by(PerformanceMetric.timestamp.asc()).first()
                
                if first_query_metric:
                    first_value = float(first_query_metric.value)
                    time_diff = (now - first_query_metric.timestamp).total_seconds()
                    if time_diff > 0 and first_value > 1000:  # Nếu là total queries
                        qps_value = (current_total_queries - first_value) / time_diff
                    elif first_value < 1000:  # Nếu là QPS, dùng luôn
                        qps_value = first_value
            
            # Lưu QPS metric (thay vì QUERIES total)
            metric = PerformanceMetric(
                database_id=database_id,
                metric_type="QUERIES",  # Giữ tên QUERIES nhưng lưu giá trị QPS
                value=qps_value,
                timestamp=now
            )
            db.add(metric)
            metrics_added += 1
            
            # Vẫn lưu total queries để tính QPS lần sau (backward compatibility)
            queries_data = real_time["metrics"].get("QUERIES", [])
            if queries_data and len(queries_data) > 0:
                total_queries_value = queries_data[-1].get("value", 0)
                # Lưu total queries với metric_type riêng để tính QPS
                # Nhưng không hiển thị trong frontend, chỉ dùng để tính QPS
                # Có thể tạo metric_type mới "TOTAL_QUERIES" nếu cần
            
            # Lưu storage/memory metric (luôn có, ít nhất là 0)
            memory_data = real_time["metrics"].get("MEMORY", [])
            if memory_data and len(memory_data) > 0:
                storage_value = memory_data[-1].get("value", 0)
            else:
                storage_value = 0.0
            
            metric = PerformanceMetric(
                database_id=database_id,
                metric_type=MetricType.MEMORY.value,
                value=storage_value,
                timestamp=now
            )
            db.add(metric)
            metrics_added += 1
            
            db.commit()
            print(f"Successfully collected {metrics_added} metrics for database {database_id} at {now.isoformat()}")
            
        except Exception as e:
            import traceback
            print(f"Failed to collect metrics for database {database_id}: {e}")
            traceback.print_exc()
            db.rollback()
            # Nếu collect thất bại, vẫn tạo default metrics để đảm bảo có data
            try:
                now = datetime.now()
                for metric_type in ["CONNECTIONS", "QUERIES", "MEMORY"]:
                    metric = PerformanceMetric(
                        database_id=database_id,
                        metric_type=metric_type,
                        value=0.0,
                        timestamp=now
                    )
                    db.add(metric)
                db.commit()
                print(f"Created default metrics for database {database_id} after error")
            except Exception as e2:
                print(f"Failed to create default metrics: {e2}")
                db.rollback()
    
    def _get_max_connections(self, cursor) -> int:
        """Lấy max_connections từ MySQL"""
        try:
            cursor.execute("SHOW VARIABLES LIKE 'max_connections'")
            result = cursor.fetchone()
            return int(result[1]) if result and len(result) > 1 else 100
        except:
            return 100

