"""
clone_service.py - Service để clone database
- Sử dụng backup + restore logic
- Tạo database mới với data từ source database
"""

from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models import Database, DatabaseClone, CloneStatus
from services.backup_service import BackupService
from services.mysql_service import MySQLService
from provisioner import Provisioner

class CloneService:
    def __init__(self):
        self.backup_service = BackupService()
        self.mysql_service = MySQLService()
        self.provisioner = Provisioner()
    
    def clone_database(
        self,
        db: Session,
        source_database_id: int,
        name: str,
        description: Optional[str] = None,
        owner_id: int = None
    ) -> DatabaseClone:
        """
        Clone database từ source database
        - Tạo clone operation record
        - Tạo backup của source database
        - Tạo database mới
        - Restore backup vào database mới
        """
        # Kiểm tra source database
        source_db = db.query(Database).filter(Database.id == source_database_id).first()
        if not source_db:
            raise ValueError(f"Source database {source_database_id} not found")
        
        if source_db.status != "ACTIVE":
            raise ValueError(f"Source database {source_db.id} is not ACTIVE")
        
        # Tạo clone operation record
        clone_op = DatabaseClone(
            source_database_id=source_database_id,
            name=name,
            description=description,
            status=CloneStatus.PENDING.value
        )
        db.add(clone_op)
        db.commit()
        db.refresh(clone_op)
        
        try:
            # Thực hiện clone
            cloned_db = self._execute_clone(
                db=db,
                source_db=source_db,
                clone_op=clone_op,
                name=name,
                owner_id=owner_id or source_db.owner_id
            )
            
            # Update clone operation
            clone_op.cloned_database_id = cloned_db.id
            clone_op.status = CloneStatus.COMPLETED.value
            clone_op.completed_at = datetime.now()
            db.commit()
            
            return clone_op
            
        except Exception as e:
            clone_op.status = CloneStatus.FAILED.value
            clone_op.error_message = str(e)
            clone_op.completed_at = datetime.now()
            db.commit()
            raise
    
    def _execute_clone(
        self,
        db: Session,
        source_db: Database,
        clone_op: DatabaseClone,
        name: str,
        owner_id: int
    ) -> Database:
        """
        Thực hiện clone: tạo backup, tạo DB mới, restore backup
        """
        clone_op.status = CloneStatus.IN_PROGRESS.value
        db.commit()
        
        # 1. Tạo temporary backup của source database
        backup = self.backup_service.create_backup(
            db=db,
            database_id=source_db.id,
            name=f"Clone backup for {name}",
            description=f"Temporary backup for cloning database {source_db.name}"
        )
        
        # 2. Execute backup
        backup = self.backup_service.execute_backup(db=db, backup_id=backup.id)
        
        if backup.status != "COMPLETED":
            raise Exception(f"Backup failed: {backup.error_message}")
        
        # 3. Tạo database mới với provisioner
        # Tạo metadata record trước
        new_db = Database(
            name=name,
            owner_id=owner_id,
            quota_mb=source_db.quota_mb,
            status="PENDING",
            quota_status="NORMAL"
        )
        db.add(new_db)
        db.commit()
        db.refresh(new_db)
        
        # Tạo database vật lý
        try:
            import secrets
            import string
            # Generate random user/password cho clone DB
            db_user = f"user_{new_db.id}"
            # Generate random password 16 ký tự
            alphabet = string.ascii_letters + string.digits
            db_password = ''.join(secrets.choice(alphabet) for _ in range(16))
            
            actual_db_name = self.provisioner.create_database_with_user(
                name, new_db.id, db_user, db_password, new_db.quota_mb
            )
            new_db.physical_db_name = actual_db_name
            new_db.db_username = db_user
            new_db.db_password_hash = db_password
            new_db.hostname = self.mysql_service.host
            new_db.port = self.mysql_service.port
            new_db.status = "ACTIVE"
            db.commit()
            db.refresh(new_db)
        except Exception as e:
            new_db.status = "FAILED"
            db.commit()
            raise Exception(f"Failed to create physical database: {str(e)}")
        
        # 4. Restore backup vào database mới
        restore = self.backup_service.restore_backup(
            db=db,
            database_id=new_db.id,
            backup_id=backup.id
        )
        
        # 5. Execute restore
        restore = self.backup_service.execute_restore(db=db, restore_id=restore.id)
        
        if restore.status != "COMPLETED":
            # Nếu restore fail, xóa database mới
            try:
                self.provisioner.delete_database(db=db, database_id=new_db.id)
            except:
                pass
            raise Exception(f"Restore failed: {restore.error_message}")
        
        return new_db
    
    def get_clone_status(self, db: Session, clone_id: int) -> DatabaseClone:
        """Lấy trạng thái clone operation"""
        clone_op = db.query(DatabaseClone).filter(DatabaseClone.id == clone_id).first()
        if not clone_op:
            raise ValueError(f"Clone operation {clone_id} not found")
        return clone_op
    
    def list_clones(self, db: Session, database_id: int) -> list:
        """Lấy danh sách clone operations của một database"""
        clones = db.query(DatabaseClone).filter(
            DatabaseClone.source_database_id == database_id
        ).order_by(DatabaseClone.created_at.desc()).all()
        return clones

