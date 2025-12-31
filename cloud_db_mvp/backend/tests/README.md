# Backend Tests

## Setup

Cài đặt dependencies:
```bash
pip install -r requirements.txt
```

## Chạy Tests

Chạy tất cả tests:
```bash
pytest
```

Chạy tests với verbose output:
```bash
pytest -v
```

Chạy tests cụ thể:
```bash
pytest tests/test_backup_service.py
pytest tests/test_backup_api.py
```

Chạy một test cụ thể:
```bash
pytest tests/test_backup_service.py::TestBackupService::test_create_backup_record
```

Chạy tests với coverage:
```bash
pytest --cov=. --cov-report=html
```

## Test Structure

- `conftest.py`: Pytest fixtures và configuration
- `test_backup_service.py`: Tests cho BackupService
- `test_backup_api.py`: Tests cho Backup & Restore API endpoints

## Test Database

Tests sử dụng SQLite in-memory database để đảm bảo isolation và tốc độ.

## Notes

- Một số tests có thể fail nếu MySQL service không available (như execute_backup, execute_restore)
- Trong production, cần mock MySQL service hoặc sử dụng test MySQL instance
- Tests tự động cleanup sau mỗi test function

