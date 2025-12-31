"""
test_clone_service.py - Tests cho CloneService
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.clone_service import CloneService
from models import Database, DatabaseClone, CloneStatus
from sqlalchemy.orm import Session

class TestCloneService:
    """Tests cho CloneService"""
    
    def test_clone_database_source_not_found(self, test_db: Session):
        """Test clone với source database không tồn tại"""
        clone_service = CloneService()
        
        with pytest.raises(ValueError, match="Source database .* not found"):
            clone_service.clone_database(
                db=test_db,
                source_database_id=99999,
                name="cloned_db",
                owner_id=1
            )
    
    def test_clone_database_source_not_active(self, test_db: Session, test_user):
        """Test clone với source database không ACTIVE"""
        clone_service = CloneService()
        
        # Tạo database với status PENDING
        source_db = Database(
            name="pending_db",
            owner_id=test_user.id,
            status="PENDING",
            physical_db_name="pending_db_physical"
        )
        test_db.add(source_db)
        test_db.commit()
        test_db.refresh(source_db)
        
        with pytest.raises(ValueError, match="is not ACTIVE"):
            clone_service.clone_database(
                db=test_db,
                source_database_id=source_db.id,
                name="cloned_db",
                owner_id=test_user.id
            )
    
    def test_get_clone_status_not_found(self, test_db: Session):
        """Test get clone status với clone không tồn tại"""
        clone_service = CloneService()
        
        with pytest.raises(ValueError, match="Clone operation .* not found"):
            clone_service.get_clone_status(test_db, 99999)
    
    def test_list_clones(self, test_db: Session, test_database):
        """Test list clones"""
        clone_service = CloneService()
        
        # Tạo một số clone operations
        clone1 = DatabaseClone(
            source_database_id=test_database.id,
            name="clone1",
            status=CloneStatus.COMPLETED.value
        )
        clone2 = DatabaseClone(
            source_database_id=test_database.id,
            name="clone2",
            status=CloneStatus.PENDING.value
        )
        test_db.add_all([clone1, clone2])
        test_db.commit()
        
        clones = clone_service.list_clones(test_db, test_database.id)
        
        assert len(clones) == 2
        assert clones[0].name == "clone2"  # Sắp xếp theo created_at desc

