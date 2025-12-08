"""
provisioner.py - Provisioning logic for physical DB
- Create/drop MySQL DB & user
- Dùng MySQLService để quản lý kết nối MySQL
"""

from services.mysql_service import MySQLService

class Provisioner:
    def __init__(self):
        self.mysql_service = MySQLService()

    def create_database_with_user(self, db_name, db_id, db_user, db_password, quota_mb=None):
        """
        Tạo database vật lý với tên do user nhập (đã sanitize)
        db_name: Tên database do user nhập (sẽ được sanitize)
        db_id: ID của database (dùng làm fallback nếu tên không hợp lệ)
        """
        import re
        conn = None
        try:
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            
            # Sanitize tên database: chỉ cho phép chữ, số, underscore, hyphen
            # Loại bỏ ký tự đặc biệt và khoảng trắng
            safe_db_name = re.sub(r'[^a-zA-Z0-9_-]', '_', db_name)
            # Loại bỏ underscore/hyphen ở đầu/cuối
            safe_db_name = safe_db_name.strip('_-')
            # Giới hạn độ dài (MySQL limit: 64 characters)
            if len(safe_db_name) > 64:
                safe_db_name = safe_db_name[:64]
            # Nếu sau khi sanitize rỗng hoặc không hợp lệ, dùng db_{id}
            if not safe_db_name or safe_db_name.startswith('_') or safe_db_name.startswith('-'):
                safe_db_name = f"db_{db_id}"
            
            # Đảm bảo tên database không trùng với các database hệ thống
            if safe_db_name.lower() in ['mysql', 'information_schema', 'performance_schema', 'sys', 'test']:
                safe_db_name = f"db_{db_id}"
            
            safe_user = db_user
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{safe_db_name}`;")
            cur.execute(f"""CREATE USER IF NOT EXISTS '{safe_user}'@'%' IDENTIFIED BY '{db_password}';""")
            cur.execute(f"""GRANT ALL PRIVILEGES ON `{safe_db_name}`.* TO '{safe_user}'@'%';""")
            cur.execute("FLUSH PRIVILEGES;")
            
            # Lưu quota info vào database để có thể check sau
            # MySQL không có built-in quota enforcement, nhưng có thể monitor và cảnh báo
            try:
                cur.execute(f"USE `{safe_db_name}`;")
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS `_quota_info` (
                        `id` INT PRIMARY KEY AUTO_INCREMENT,
                        `quota_mb` INT NOT NULL DEFAULT {quota_mb},
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB;
                """)
                # Insert hoặc update quota
                cur.execute(f"""
                    INSERT INTO `_quota_info` (`id`, `quota_mb`) VALUES (1, {quota_mb})
                    ON DUPLICATE KEY UPDATE `quota_mb` = {quota_mb}, `updated_at` = CURRENT_TIMESTAMP;
                """)
            except Exception as e:
                # Nếu không tạo được quota table, chỉ log warning (không fail việc tạo DB)
                print(f"Warning: Could not create quota info table in {safe_db_name}: {e}")
            
            # Note: MySQL không có built-in quota enforcement
            # Quota được enforce ở application level (khi tạo DB, check tổng quota)
            # Có thể thêm monitoring job để check và cảnh báo khi vượt quota
            
            # Trả về tên database thực tế đã tạo (để lưu vào metadata)
            return safe_db_name
        except Exception as e:
            # Đóng connection nếu có lỗi
            if conn:
                try:
                    conn.close()
                except:
                    pass
            # Reset connection trong service để lần sau tạo connection mới
            self.mysql_service.conn = None
            raise  # Re-raise để caller xử lý

    def drop_database_and_user(self, db_name, db_user):
        """Xóa database và user. db_name nên là format db_{id}"""
        conn = None
        try:
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            safe_db = db_name
            safe_user = db_user
            cur.execute(f"DROP DATABASE IF EXISTS `{safe_db}`;")
            cur.execute(f"DROP USER IF EXISTS '{safe_user}'@'%';")
            cur.execute("FLUSH PRIVILEGES;")
        except Exception as e:
            # Log error nhưng không raise để tránh lỗi khi DB/user đã bị xóa
            import traceback
            print(f"Warning: Error dropping DB/user: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise  # Re-raise để caller biết có lỗi
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
