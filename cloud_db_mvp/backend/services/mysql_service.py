"""
mysql_service.py - Quản lý kết nối MySQL vật lý
- Tách biệt logic kết nối MySQL khỏi provisioner
- Dễ mở rộng cho các thao tác DB vật lý khác
"""

import os
import pymysql
from pymysql.constants import CLIENT

class MySQLService:
    def __init__(self):
        self.host = os.getenv('MYSQL_HOST', 'localhost')
        self.port = int(os.getenv('MYSQL_PORT', 3306))
        self.user = os.getenv('MYSQL_ADMIN_USER', 'root')
        self.password = os.getenv('MYSQL_ADMIN_PASSWORD', 'admin@123')
        self.conn = None

    def connect(self):
        # Đóng connection cũ nếu có (tránh connection stale)
        if self.conn:
            try:
                self.conn.close()
            except:
                pass
            self.conn = None
        
        try:
            # PyMySQL không hỗ trợ allow_public_key_retrieval trực tiếp
            # Thay vào đó, thử kết nối với ssl disabled hoặc dùng connection string
            # Hoặc có thể cần thay đổi authentication plugin của MySQL user
            self.conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                client_flag=CLIENT.MULTI_STATEMENTS,
                autocommit=True,
                connect_timeout=10,  # Timeout 10 giây
                ssl={'check_hostname': False} if self.host != 'localhost' else None
            )
            return self.conn
        except Exception as e:
            error_msg = str(e)
            # Nếu vẫn gặp lỗi Public Key Retrieval, thử giải pháp thay thế
            if 'Public Key Retrieval' in error_msg or 'caching_sha2_password' in error_msg.lower():
                print(f"WARNING: MySQL connection error (possibly Public Key Retrieval issue): {error_msg}")
                print("Attempting to fix by changing user authentication method...")
                # Thử kết nối lại với ssl disabled hoàn toàn
                try:
                    self.conn = pymysql.connect(
                        host=self.host,
                        port=self.port,
                        user=self.user,
                        password=self.password,
                        client_flag=CLIENT.MULTI_STATEMENTS,
                        autocommit=True,
                        connect_timeout=10,
                        ssl=None  # Disable SSL completely
                    )
                    return self.conn
                except Exception as e2:
                    print(f"ERROR connecting to MySQL (retry failed): {e2}")
                    print(f"Host: {self.host}, Port: {self.port}, User: {self.user}")
                    print("\nSOLUTION: You may need to change MySQL user authentication method:")
                    print(f"  ALTER USER '{self.user}'@'localhost' IDENTIFIED WITH mysql_native_password BY '{self.password}';")
                    print(f"  FLUSH PRIVILEGES;")
                    raise
            else:
                print(f"ERROR connecting to MySQL: {error_msg}")
                print(f"Host: {self.host}, Port: {self.port}, User: {self.user}")
                raise

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None
