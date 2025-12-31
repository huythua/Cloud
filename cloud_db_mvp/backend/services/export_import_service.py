"""
export_import_service.py - Service để export và import database
- Export: Tạo SQL dump file
- Import: Import SQL dump vào database
"""

import os
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from models import Database, DatabaseImport, ImportStatus
from services.mysql_service import MySQLService

class ExportImportService:
    def __init__(self):
        self.mysql_service = MySQLService()
        # Thư mục lưu export files
        self.export_dir = Path(os.getenv("EXPORT_DIR", "/exports"))
        self.export_dir.mkdir(parents=True, exist_ok=True)
    
    def export_database(self, db: Session, database_id: int) -> Path:
        """
        Export database thành SQL dump file
        Returns: Path to the exported file
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE")
        
        # Tạo tên file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{database.physical_db_name}_{timestamp}.sql"
        file_path = self.export_dir / filename
        
        # Lấy MySQL admin credentials
        mysql_admin_user = os.getenv("MYSQL_ADMIN_USER", "root")
        mysql_admin_password = os.getenv("MYSQL_ADMIN_PASSWORD", "rootpassword")
        mysql_host = os.getenv("MYSQL_HOST", "mysql")
        mysql_port = int(os.getenv("MYSQL_PORT", "3306"))
        
        # Export bằng mysqldump
        cmd = [
            "mysqldump",
            f"--host={mysql_host}",
            f"--port={mysql_port}",
            f"--user={mysql_admin_user}",
            f"--password={mysql_admin_password}",
            "--single-transaction",
            "--routines",
            "--triggers",
            "--skip-ssl",  # Bỏ qua SSL verification cho internal network
            database.physical_db_name
        ]
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                result = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True
                )
            
            return file_path
            
        except FileNotFoundError:
            raise Exception("mysqldump command not found. Please install MySQL client tools.")
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
            raise Exception(f"mysqldump failed: {error_msg}")
    
    def import_database(
        self,
        db: Session,
        database_id: int,
        file_path: str,
        file_name: str,
        file_size_mb: Optional[float] = None
    ) -> DatabaseImport:
        """
        Import SQL dump vào database
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE")
        
        # Tạo import record
        import_op = DatabaseImport(
            database_id=database_id,
            file_name=file_name,
            file_path=file_path,
            file_size_mb=file_size_mb,
            status=ImportStatus.PENDING.value
        )
        db.add(import_op)
        db.commit()
        db.refresh(import_op)
        
        try:
            # Thực hiện import
            self._execute_import(db, import_op, database, file_path)
            
            # Update status
            import_op.status = ImportStatus.COMPLETED.value
            import_op.completed_at = datetime.now()
            db.commit()
            
            return import_op
            
        except Exception as e:
            import_op.status = ImportStatus.FAILED.value
            import_op.error_message = str(e)
            import_op.completed_at = datetime.now()
            db.commit()
            raise
    
    def _execute_import(self, db: Session, import_op: DatabaseImport, database: Database, file_path: str):
        """
        Thực hiện import SQL dump
        """
        import_op.status = ImportStatus.IN_PROGRESS.value
        db.commit()
        
        # Lấy MySQL admin credentials
        mysql_admin_user = os.getenv("MYSQL_ADMIN_USER", "root")
        mysql_admin_password = os.getenv("MYSQL_ADMIN_PASSWORD", "rootpassword")
        mysql_host = os.getenv("MYSQL_HOST", "mysql")
        mysql_port = int(os.getenv("MYSQL_PORT", "3306"))
        
        # Import bằng mysql command
        cmd = [
            "mysql",
            f"--host={mysql_host}",
            f"--port={mysql_port}",
            f"--user={mysql_admin_user}",
            f"--password={mysql_admin_password}",
            "--skip-ssl",  # Bỏ qua SSL verification
            database.physical_db_name
        ]
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                result = subprocess.run(
                    cmd,
                    stdin=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True
                )
        except FileNotFoundError:
            raise Exception("mysql command not found. Please install MySQL client tools.")
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
            raise Exception(f"mysql import failed: {error_msg}")
    
    def get_import_status(self, db: Session, import_id: int) -> DatabaseImport:
        """Lấy trạng thái import operation"""
        import_op = db.query(DatabaseImport).filter(DatabaseImport.id == import_id).first()
        if not import_op:
            raise ValueError(f"Import operation {import_id} not found")
        return import_op
    
    def list_imports(self, db: Session, database_id: int) -> list:
        """Lấy danh sách import operations của một database"""
        imports = db.query(DatabaseImport).filter(
            DatabaseImport.database_id == database_id
        ).order_by(DatabaseImport.created_at.desc()).all()
        return imports

