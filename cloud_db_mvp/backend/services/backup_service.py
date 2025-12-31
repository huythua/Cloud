"""
backup_service.py - Service để backup và restore database
- Tạo backup bằng mysqldump
- Restore từ backup file
- Quản lý backup files
"""

import os
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from models import Backup, Restore, Database, BackupStatus, RestoreStatus
from services.mysql_service import MySQLService

class BackupService:
    def __init__(self):
        self.mysql_service = MySQLService()
        # Tạo thư mục backups nếu chưa có
        self.backup_dir = Path(os.getenv("BACKUP_DIR", "/backups"))
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, db: Session, database_id: int, name: Optional[str] = None, description: Optional[str] = None) -> Backup:
        """
        Tạo backup record và queue backup job
        """
        # Kiểm tra database tồn tại và user có quyền
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE. Current status: {database.status}")
        
        # Tạo backup record
        backup = Backup(
            database_id=database_id,
            name=name or f"backup_{database_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            description=description,
            status=BackupStatus.PENDING.value
        )
        db.add(backup)
        db.commit()
        db.refresh(backup)
        
        # Thực thi backup ngay (synchronous cho MVP, có thể chuyển sang async sau)
        # Nếu có lỗi, đánh dấu FAILED nhưng vẫn trả về backup record
        try:
            self.execute_backup(db, backup.id)
        except FileNotFoundError as e:
            # mysqldump không có trong container
            backup.status = BackupStatus.FAILED.value
            backup.error_message = f"mysqldump not available: {str(e)}. Please install mysql-client package."
            db.commit()
            # Không raise để vẫn trả về backup record
        except Exception as e:
            backup.status = BackupStatus.FAILED.value
            backup.error_message = str(e)
            db.commit()
            # Log error nhưng không raise để trả về backup record
            import traceback
            print(f"Backup execution error: {e}")
            print(traceback.format_exc())
        
        return backup
    
    def execute_backup(self, db: Session, backup_id: int) -> Backup:
        """
        Thực thi backup bằng mysqldump
        """
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup:
            raise ValueError(f"Backup {backup_id} not found")
        
        database = db.query(Database).filter(Database.id == backup.database_id).first()
        if not database:
            raise ValueError(f"Database {backup.database_id} not found")
        
        # Cập nhật status
        backup.status = BackupStatus.IN_PROGRESS.value
        db.commit()
        
        try:
            # Lấy thông tin kết nối MySQL
            # Dùng admin credentials để backup (vì có quyền full và có thể backup bất kỳ database nào)
            mysql_host = os.getenv('MYSQL_HOST', 'mysql')
            mysql_port = int(os.getenv('MYSQL_PORT', 3306))
            mysql_admin_user = os.getenv('MYSQL_ADMIN_USER', 'root')
            mysql_admin_password = os.getenv('MYSQL_ADMIN_PASSWORD', 'admin@123')
            physical_db_name = database.physical_db_name or f"db_{database.id}"
            
            # Tạo file path
            backup_file = self.backup_dir / f"{backup.database_id}" / f"backup_{backup_id}.sql"
            backup_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Chạy mysqldump với admin credentials
            cmd = [
                "mysqldump",
                f"--host={mysql_host}",
                f"--port={mysql_port}",
                f"--user={mysql_admin_user}",
                f"--password={mysql_admin_password}",
                "--skip-ssl",  # Disable SSL cho internal network
                "--single-transaction",
                "--routines",
                "--triggers",
                physical_db_name
            ]
            
            with open(backup_file, 'w', encoding='utf-8') as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=300  # 5 minutes timeout
                )
            
            if result.returncode != 0:
                raise Exception(f"mysqldump failed: {result.stderr}")
            
            # Tính kích thước file
            file_size_mb = backup_file.stat().st_size / (1024 * 1024)
            
            # Cập nhật backup record
            backup.file_path = str(backup_file)
            backup.size_mb = float(file_size_mb)
            backup.status = BackupStatus.COMPLETED.value
            backup.completed_at = datetime.now()
            db.commit()
            
            return backup
            
        except subprocess.TimeoutExpired:
            backup.status = BackupStatus.FAILED.value
            backup.error_message = "Backup timeout after 5 minutes"
            db.commit()
            raise Exception("Backup timeout")
        except Exception as e:
            backup.status = BackupStatus.FAILED.value
            backup.error_message = str(e)
            db.commit()
            raise
    
    def restore_backup(self, db: Session, database_id: int, backup_id: int) -> Restore:
        """
        Restore database từ backup
        Cho phép restore backup từ database khác (để hỗ trợ clone)
        """
        # Kiểm tra database và backup
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        # Cho phép restore backup từ bất kỳ database nào (không check database_id)
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup:
            raise ValueError(f"Backup {backup_id} not found")
        
        if backup.status != BackupStatus.COMPLETED.value:
            raise ValueError(f"Backup {backup_id} is not completed. Current status: {backup.status}")
        
        if not backup.file_path or not os.path.exists(backup.file_path):
            raise ValueError(f"Backup file not found: {backup.file_path}")
        
        # Tạo restore record
        restore = Restore(
            database_id=database_id,
            backup_id=backup_id,
            status=RestoreStatus.PENDING.value
        )
        db.add(restore)
        db.commit()
        db.refresh(restore)
        
        # Thực thi restore
        try:
            self.execute_restore(db, restore.id)
        except Exception as e:
            restore.status = RestoreStatus.FAILED.value
            restore.error_message = str(e)
            db.commit()
            raise
        
        return restore
    
    def execute_restore(self, db: Session, restore_id: int) -> Restore:
        """
        Thực thi restore từ backup file
        """
        restore = db.query(Restore).filter(Restore.id == restore_id).first()
        if not restore:
            raise ValueError(f"Restore {restore_id} not found")
        
        backup = db.query(Backup).filter(Backup.id == restore.backup_id).first()
        if not backup:
            raise ValueError(f"Backup {restore.backup_id} not found")
        
        database = db.query(Database).filter(Database.id == restore.database_id).first()
        if not database:
            raise ValueError(f"Database {restore.database_id} not found")
        
        # Cập nhật status
        restore.status = RestoreStatus.IN_PROGRESS.value
        db.commit()
        
        try:
            # Lấy thông tin kết nối MySQL
            mysql_host = os.getenv('MYSQL_HOST', 'localhost')
            mysql_port = int(os.getenv('MYSQL_PORT', 3306))
            mysql_user = database.db_username
            mysql_password = self._get_db_password(database)
            physical_db_name = database.physical_db_name or f"db_{database.id}"
            
            # Đọc backup file và restore
            with open(backup.file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Kết nối MySQL và restore
            conn = self.mysql_service.connect()
            cur = conn.cursor()
            
            # Drop và recreate database (hoặc chỉ restore vào database hiện có)
            # Để an toàn, chỉ restore vào database hiện có
            cur.execute(f"USE `{physical_db_name}`;")
            
            # Chạy SQL từ backup file
            # Chia nhỏ thành các statements
            for statement in sql_content.split(';'):
                statement = statement.strip()
                if statement and not statement.startswith('--'):
                    try:
                        cur.execute(statement)
                    except Exception as e:
                        # Một số statements có thể fail (như CREATE DATABASE), bỏ qua
                        if 'CREATE DATABASE' not in statement.upper():
                            print(f"Warning: Failed to execute statement: {e}")
            
            conn.commit()
            cur.close()
            conn.close()
            
            # Cập nhật restore record
            restore.status = RestoreStatus.COMPLETED.value
            restore.completed_at = datetime.now()
            db.commit()
            
            return restore
            
        except Exception as e:
            restore.status = RestoreStatus.FAILED.value
            restore.error_message = str(e)
            db.commit()
            raise
    
    def delete_backup(self, db: Session, backup_id: int) -> bool:
        """
        Xóa backup file và record
        """
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        if not backup:
            raise ValueError(f"Backup {backup_id} not found")
        
        # Xóa file nếu tồn tại
        if backup.file_path and os.path.exists(backup.file_path):
            try:
                os.remove(backup.file_path)
            except Exception as e:
                print(f"Warning: Failed to delete backup file: {e}")
        
        # Đánh dấu backup là DELETED
        backup.status = BackupStatus.DELETED.value
        db.commit()
        
        return True
    
    def list_backups(self, db: Session, database_id: int, status: Optional[str] = None) -> list[Backup]:
        """
        List backups của một database
        """
        query = db.query(Backup).filter(Backup.database_id == database_id)
        
        if status:
            query = query.filter(Backup.status == status)
        
        # Loại bỏ backups đã bị xóa
        query = query.filter(Backup.status != BackupStatus.DELETED.value)
        
        return query.order_by(Backup.created_at.desc()).all()
    
    def _get_db_password(self, database: Database) -> str:
        """
        Lấy password của database
        Trong MVP, dùng admin credentials để backup/restore
        TODO: Trong production, cần lưu password gốc đã encrypted hoặc dùng service account
        """
        # Dùng admin password để backup/restore (vì có quyền full)
        mysql_admin_password = os.getenv('MYSQL_ADMIN_PASSWORD', 'admin@123')
        return mysql_admin_password

