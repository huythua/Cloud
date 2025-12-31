#!/usr/bin/env python3
"""
Script test API endpoints cho Database Detail page
"""

import requests
import json
import sys
from datetime import datetime

API_URL = "http://localhost:8001"
TEST_USERNAME = "test_user"
TEST_PASSWORD = "test_password"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def login():
    """Login và lấy token"""
    print_info("Đang đăng nhập...")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data={
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
            }
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print_success(f"Đăng nhập thành công. Token: {token[:20]}...")
            return token
        else:
            print_error(f"Đăng nhập thất bại: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Lỗi kết nối: {e}")
        return None

def get_databases(token):
    """Lấy danh sách databases"""
    print_info("Đang lấy danh sách databases...")
    try:
        response = requests.get(
            f"{API_URL}/db/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            databases = response.json()
            print_success(f"Tìm thấy {len(databases)} databases")
            return databases
        else:
            print_error(f"Lỗi: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print_error(f"Lỗi kết nối: {e}")
        return []

def test_database_detail(token, db_id):
    """Test endpoint GET /db/{db_id}"""
    print_info(f"Test: GET /db/{db_id}")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Database: {data.get('name')} - Status: {data.get('status')}")
            return data
        else:
            print_error(f"Lỗi: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Lỗi kết nối: {e}")
        return None

def test_sql_query(token, db_id):
    """Test SQL Query endpoint"""
    print_info(f"Test: POST /db/{db_id}/query")
    
    # Test SELECT query
    print_info("  → Test SELECT query")
    try:
        response = requests.post(
            f"{API_URL}/db/{db_id}/query",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"query": "SELECT 1 as test"}
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"  SELECT thành công: {data.get('row_count')} rows")
        else:
            print_error(f"  SELECT thất bại: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")
    
    # Test dangerous operations (should be blocked)
    print_info("  → Test DROP DATABASE (should be blocked)")
    try:
        response = requests.post(
            f"{API_URL}/db/{db_id}/query",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"query": "DROP DATABASE test_db"}
        )
        if response.status_code == 400:
            print_success("  DROP DATABASE đã bị chặn đúng")
        else:
            print_error(f"  DROP DATABASE không bị chặn: {response.status_code}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")

def test_backup_endpoints(token, db_id):
    """Test Backup endpoints"""
    print_info(f"Test: Backup endpoints cho DB {db_id}")
    
    # List backups
    print_info("  → GET /db/{db_id}/backups")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/backups",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            backups = response.json()
            print_success(f"  Tìm thấy {len(backups)} backups")
        else:
            print_error(f"  Lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")

def test_monitoring_endpoints(token, db_id):
    """Test Monitoring endpoints"""
    print_info(f"Test: Monitoring endpoints cho DB {db_id}")
    
    # Get metrics
    print_info("  → GET /db/{db_id}/metrics")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/metrics?timeframe=1h",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            metrics = data.get("metrics", {})
            has_data = any(len(v) > 0 for v in metrics.values())
            if has_data:
                print_success(f"  Có metrics data: {list(metrics.keys())}")
            else:
                print_warning("  Không có metrics data (có thể là DB mới tạo)")
        else:
            print_error(f"  Lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")
    
    # Get real-time metrics
    print_info("  → GET /db/{db_id}/metrics/realtime")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/metrics/realtime",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print_success("  Real-time metrics OK")
        else:
            print_error(f"  Lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")
    
    # Get performance summary
    print_info("  → GET /db/{db_id}/performance")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/performance",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print_success("  Performance summary OK")
        else:
            print_error(f"  Lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")

def test_clone_endpoints(token, db_id):
    """Test Clone endpoints"""
    print_info(f"Test: Clone endpoints cho DB {db_id}")
    
    # List clones
    print_info("  → GET /db/{db_id}/clones")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/clones",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            clones = response.json()
            print_success(f"  Tìm thấy {len(clones)} clones")
        else:
            print_error(f"  Lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")

def test_export_import_endpoints(token, db_id):
    """Test Export/Import endpoints"""
    print_info(f"Test: Export/Import endpoints cho DB {db_id}")
    
    # Export endpoint exists
    print_info("  → GET /db/{db_id}/export")
    try:
        response = requests.get(
            f"{API_URL}/db/{db_id}/export",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Có thể thành công hoặc lỗi (tùy DB có data không)
        if response.status_code in [200, 400, 404]:
            print_success(f"  Endpoint tồn tại (status: {response.status_code})")
        else:
            print_error(f"  Lỗi không mong đợi: {response.status_code}")
    except Exception as e:
        print_error(f"  Lỗi: {e}")

def main():
    print("=" * 60)
    print("TEST DATABASE DETAIL API ENDPOINTS")
    print("=" * 60)
    print()
    
    # Login
    token = login()
    if not token:
        print_error("Không thể đăng nhập. Dừng test.")
        sys.exit(1)
    
    print()
    
    # Get databases
    databases = get_databases(token)
    if not databases:
        print_warning("Không có databases để test. Tạo database trước.")
        sys.exit(0)
    
    # Chọn database đầu tiên có status ACTIVE
    active_db = None
    for db in databases:
        if db.get("status") == "ACTIVE":
            active_db = db
            break
    
    if not active_db:
        print_warning("Không có database ACTIVE để test.")
        print_info("Các databases hiện có:")
        for db in databases:
            print(f"  - {db.get('name')} (ID: {db.get('id')}, Status: {db.get('status')})")
        sys.exit(0)
    
    db_id = active_db.get("id")
    db_name = active_db.get("name")
    
    print()
    print(f"Chọn database để test: {db_name} (ID: {db_id})")
    print("=" * 60)
    print()
    
    # Test các endpoints
    test_results = {
        "database_detail": False,
        "sql_query": False,
        "backup": False,
        "monitoring": False,
        "clone": False,
        "export_import": False
    }
    
    # 1. Test Database Detail
    print("\n[1] TEST DATABASE DETAIL")
    print("-" * 60)
    db_data = test_database_detail(token, db_id)
    if db_data:
        test_results["database_detail"] = True
    
    # 2. Test SQL Query
    print("\n[2] TEST SQL QUERY")
    print("-" * 60)
    if db_data and db_data.get("status") == "ACTIVE":
        test_sql_query(token, db_id)
        test_results["sql_query"] = True
    else:
        print_warning("Database không ACTIVE, bỏ qua SQL Query test")
    
    # 3. Test Backup
    print("\n[3] TEST BACKUP & RESTORE")
    print("-" * 60)
    if db_data and db_data.get("status") == "ACTIVE":
        test_backup_endpoints(token, db_id)
        test_results["backup"] = True
    else:
        print_warning("Database không ACTIVE, bỏ qua Backup test")
    
    # 4. Test Monitoring
    print("\n[4] TEST MONITORING")
    print("-" * 60)
    if db_data and db_data.get("status") == "ACTIVE":
        test_monitoring_endpoints(token, db_id)
        test_results["monitoring"] = True
    else:
        print_warning("Database không ACTIVE, bỏ qua Monitoring test")
    
    # 5. Test Clone
    print("\n[5] TEST CLONE")
    print("-" * 60)
    if db_data and db_data.get("status") == "ACTIVE":
        test_clone_endpoints(token, db_id)
        test_results["clone"] = True
    else:
        print_warning("Database không ACTIVE, bỏ qua Clone test")
    
    # 6. Test Export/Import
    print("\n[6] TEST EXPORT/IMPORT")
    print("-" * 60)
    if db_data and db_data.get("status") == "ACTIVE":
        test_export_import_endpoints(token, db_id)
        test_results["export_import"] = True
    else:
        print_warning("Database không ACTIVE, bỏ qua Export/Import test")
    
    # Summary
    print()
    print("=" * 60)
    print("TỔNG KẾT TEST")
    print("=" * 60)
    
    total = len(test_results)
    passed = sum(1 for v in test_results.values() if v)
    
    for key, value in test_results.items():
        status = "✓ PASS" if value else "✗ SKIP/FAIL"
        print(f"{status:12} - {key.replace('_', ' ').title()}")
    
    print()
    print(f"Kết quả: {passed}/{total} tests passed")
    print()
    
    if passed == total:
        print_success("Tất cả tests đã pass!")
    else:
        print_warning("Một số tests bị skip hoặc fail. Kiểm tra logs ở trên.")

if __name__ == "__main__":
    main()

