# Development Roadmap - CloudDB DBaaS Features

## 📋 Quy trình phát triển

Mỗi tính năng sẽ được phát triển theo quy trình sau:

```
1. Dev API (Backend)
   ├── Thiết kế API endpoints
   ├── Implement business logic
   ├── Database schema (nếu cần)
   └── API documentation

2. Auto Test (Backend)
   ├── Unit tests
   ├── Integration tests
   ├── API endpoint tests
   └── Test coverage >= 80%

3. Pass ✅
   └── Tất cả tests pass

4. Dev FE (Frontend)
   ├── UI/UX design
   ├── Component implementation
   ├── API integration
   └── Error handling

5. Auto Test (Frontend)
   ├── Component tests
   ├── Integration tests
   ├── E2E tests (nếu cần)
   └── UI/UX validation

6. Pass ✅
   └── Tất cả tests pass

7. Tính năng tiếp theo →
```

---

## 🗺️ Roadmap Development

### Phase 1: Core Features (HIGH Priority)

#### Feature 1: Backup & Restore ⚠️ QUAN TRỌNG NHẤT

**Mục tiêu:** Cho phép user backup và restore database

**Backend API:**
- [ ] **Design API**
  - [ ] `POST /db/{db_id}/backup` - Tạo backup
    - Request: `{ "name": "optional", "description": "optional" }`
    - Response: `{ "backup_id": 1, "status": "PENDING", "created_at": "..." }`
  - [ ] `GET /db/{db_id}/backups` - Danh sách backups
    - Query params: `?status=COMPLETED&limit=10&offset=0`
    - Response: `[{ "backup_id": 1, "name": "...", "size_mb": 100, "status": "COMPLETED", "created_at": "..." }]`
  - [ ] `GET /db/{db_id}/backups/{backup_id}` - Chi tiết backup
  - [ ] `POST /db/{db_id}/restore` - Restore từ backup
    - Request: `{ "backup_id": 1 }`
    - Response: `{ "restore_id": 1, "status": "PENDING" }`
  - [ ] `DELETE /db/{db_id}/backups/{backup_id}` - Xóa backup
  - [ ] `GET /db/{db_id}/backups/{backup_id}/download` - Download backup file

- [ ] **Database Schema**
  ```sql
  CREATE TABLE backups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    name VARCHAR(255),
    description TEXT,
    file_path VARCHAR(500),
    size_mb DECIMAL(10,2),
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'DELETED'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (database_id) REFERENCES databases(id)
  );
  
  CREATE TABLE restores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    backup_id INT NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (database_id) REFERENCES databases(id),
    FOREIGN KEY (backup_id) REFERENCES backups(id)
  );
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `backup_service.py`
    - [ ] `create_backup(db_id, name, description)` - Tạo backup job
    - [ ] `execute_backup(backup_id)` - Chạy mysqldump
    - [ ] `list_backups(db_id, filters)` - List backups
    - [ ] `get_backup(backup_id)` - Get backup details
    - [ ] `delete_backup(backup_id)` - Xóa backup file và record
    - [ ] `restore_backup(db_id, backup_id)` - Restore database
  - [ ] Background job: `backup_worker.py`
    - [ ] Async backup execution
    - [ ] Progress tracking
    - [ ] Error handling
  - [ ] Storage: `backup_storage.py`
    - [ ] Local storage: `/backups/{db_id}/{backup_id}.sql`
    - [ ] S3 storage (optional): `s3://clouddb-backups/{db_id}/{backup_id}.sql`
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] `test_backup_api.py`
    - [ ] Test create backup
    - [ ] Test list backups
    - [ ] Test get backup details
    - [ ] Test delete backup
    - [ ] Test restore backup
    - [ ] Test download backup
    - [ ] Test backup permissions (only owner)
  - [ ] `test_backup_service.py`
    - [ ] Test backup creation
    - [ ] Test backup execution (mock mysqldump)
    - [ ] Test restore execution
    - [ ] Test error handling
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Component: `BackupManagement.jsx`
    - [ ] List backups table
    - [ ] Create backup form
    - [ ] Backup details modal
    - [ ] Restore confirmation modal
    - [ ] Download backup button
    - [ ] Delete backup confirmation
  - [ ] Page: `Databases.jsx` - Thêm tab "Backups"
  - [ ] API integration: `api/backups.js`
  - [ ] Loading states
  - [ ] Error handling với ErrorMessage component

- [ ] **Frontend Tests**
  - [ ] Component tests
  - [ ] API integration tests
  - [ ] UI/UX validation

**Estimated Time:** 3-4 days
**Dependencies:** None

---

#### Feature 2: Database Monitoring & Performance Metrics ⚠️ QUAN TRỌNG

**Mục tiêu:** Giám sát hiệu suất database real-time

**Backend API:**
- [ ] **Design API**
  - [ ] `GET /db/{db_id}/metrics` - Performance metrics
    - Query params: `?timeframe=1h|24h|7d|30d`
    - Response: `{ "cpu": [...], "memory": [...], "connections": [...], "queries": [...] }`
  - [ ] `GET /db/{db_id}/connections` - Active connections
    - Response: `{ "active": 10, "max": 100, "connections": [...] }`
  - [ ] `GET /db/{db_id}/slow-queries` - Slow queries log
    - Query params: `?limit=50&min_duration=1s`
    - Response: `[{ "query": "...", "duration": 2.5, "timestamp": "..." }]`
  - [ ] `GET /db/{db_id}/performance` - Performance summary
    - Response: `{ "qps": 100, "avg_response_time": 0.05, "error_rate": 0.01 }`

- [ ] **Database Schema**
  ```sql
  CREATE TABLE performance_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    metric_type ENUM('CPU', 'MEMORY', 'CONNECTIONS', 'QUERIES', 'SLOW_QUERY'),
    value DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (database_id) REFERENCES databases(id),
    INDEX idx_db_timestamp (database_id, timestamp)
  );
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `monitoring_service.py`
    - [ ] `get_metrics(db_id, timeframe)` - Query performance_schema
    - [ ] `get_connections(db_id)` - Get active connections
    - [ ] `get_slow_queries(db_id, limit, min_duration)` - Query slow query log
    - [ ] `get_performance_summary(db_id)` - Calculate summary stats
  - [ ] Background job: `metrics_collector.py`
    - [ ] Collect metrics every 1 minute
    - [ ] Store to database
    - [ ] Cleanup old metrics (>30 days)
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] `test_monitoring_api.py`
    - [ ] Test get metrics
    - [ ] Test get connections
    - [ ] Test get slow queries
    - [ ] Test get performance summary
  - [ ] `test_monitoring_service.py`
    - [ ] Test metrics collection
    - [ ] Test query performance_schema
    - [ ] Test slow query detection
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Component: `DatabaseMonitoring.jsx`
    - [ ] Metrics charts (Chart.js hoặc Recharts)
      - [ ] CPU usage chart
      - [ ] Memory usage chart
      - [ ] Connections chart
      - [ ] Queries per second chart
    - [ ] Slow queries table
    - [ ] Performance summary cards
    - [ ] Real-time updates (polling hoặc WebSocket)
  - [ ] Page: `Databases.jsx` - Thêm tab "Monitoring"
  - [ ] API integration: `api/monitoring.js`
  - [ ] Loading states
  - [ ] Error handling

- [ ] **Frontend Tests**
  - [ ] Component tests
  - [ ] Chart rendering tests
  - [ ] Real-time update tests

**Estimated Time:** 4-5 days
**Dependencies:** None

---

#### Feature 3: Database Access Control & IP Whitelist ⚠️ QUAN TRỌNG (Security)

**Mục tiêu:** Quản lý IP whitelist để giới hạn access

**Backend API:**
- [ ] **Design API**
  - [ ] `GET /db/{db_id}/whitelist` - IP whitelist
    - Response: `[{ "id": 1, "ip": "192.168.1.1", "description": "...", "created_at": "..." }]`
  - [ ] `POST /db/{db_id}/whitelist` - Add IP
    - Request: `{ "ip": "192.168.1.1", "description": "optional" }`
    - Response: `{ "id": 1, "ip": "...", "status": "ACTIVE" }`
  - [ ] `PUT /db/{db_id}/whitelist/{whitelist_id}` - Update IP
  - [ ] `DELETE /db/{db_id}/whitelist/{whitelist_id}` - Remove IP
  - [ ] `POST /db/{db_id}/whitelist/enable` - Enable whitelist
  - [ ] `POST /db/{db_id}/whitelist/disable` - Disable whitelist

- [ ] **Database Schema**
  ```sql
  CREATE TABLE ip_whitelist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL, -- Support IPv6
    description VARCHAR(255),
    status ENUM('ACTIVE', 'INACTIVE'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (database_id) REFERENCES databases(id),
    UNIQUE KEY unique_db_ip (database_id, ip_address)
  );
  
  ALTER TABLE databases ADD COLUMN whitelist_enabled BOOLEAN DEFAULT FALSE;
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `whitelist_service.py`
    - [ ] `add_ip(db_id, ip, description)` - Add IP to whitelist
    - [ ] `remove_ip(db_id, whitelist_id)` - Remove IP
    - [ ] `list_ips(db_id)` - List all IPs
    - [ ] `enable_whitelist(db_id)` - Enable whitelist
    - [ ] `disable_whitelist(db_id)` - Disable whitelist
    - [ ] `update_mysql_user_host(db_id)` - Update MySQL user host restrictions
  - [ ] MySQL integration: Update user host trong MySQL
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] `test_whitelist_api.py`
    - [ ] Test add IP
    - [ ] Test list IPs
    - [ ] Test remove IP
    - [ ] Test enable/disable whitelist
    - [ ] Test IP validation (IPv4/IPv6)
  - [ ] `test_whitelist_service.py`
    - [ ] Test MySQL user host update
    - [ ] Test IP format validation
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Component: `IPWhitelist.jsx`
    - [ ] IP whitelist table
    - [ ] Add IP form (IP + description)
    - [ ] Edit IP modal
    - [ ] Delete IP confirmation
    - [ ] Enable/Disable toggle
    - [ ] IP validation (IPv4/IPv6)
  - [ ] Page: `Databases.jsx` - Thêm tab "Security"
  - [ ] API integration: `api/whitelist.js`
  - [ ] Loading states
  - [ ] Error handling

- [ ] **Frontend Tests**
  - [ ] Component tests
  - [ ] IP validation tests
  - [ ] Form submission tests

**Estimated Time:** 2-3 days
**Dependencies:** None

---

### Phase 2: Medium Priority Features

#### Feature 4: Database Cloning

**Mục tiêu:** Clone database để tạo bản sao

**Backend API:**
- [ ] `POST /db/{db_id}/clone` - Clone database
  - Request: `{ "name": "new_db_name", "description": "optional" }`
  - Response: `{ "new_db_id": 2, "status": "PENDING" }`

- [ ] **Backend Implementation**
  - [ ] Service: `clone_service.py`
    - [ ] `clone_database(source_db_id, name, description)` - Clone DB
    - [ ] Use backup + restore logic
  - [ ] API endpoint trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test clone database
  - [ ] Test clone permissions
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Clone button trong database card
  - [ ] Clone modal với form
  - [ ] API integration

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 1-2 days
**Dependencies:** Feature 1 (Backup & Restore)

---

#### Feature 5: Database Export/Import

**Mục tiêu:** Export/Import database dưới dạng SQL dump

**Backend API:**
- [ ] `GET /db/{db_id}/export` - Export database
  - Response: File download (SQL dump)
- [ ] `POST /db/{db_id}/import` - Import database
  - Request: Multipart file upload
  - Response: `{ "import_id": 1, "status": "PENDING" }`

- [ ] **Backend Implementation**
  - [ ] Service: `export_import_service.py`
    - [ ] `export_database(db_id)` - Generate SQL dump
    - [ ] `import_database(db_id, file)` - Import SQL dump
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test export database
  - [ ] Test import database
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Export button
  - [ ] Import form với file upload
  - [ ] Progress indicator

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 2-3 days
**Dependencies:** None

---

#### Feature 6: Database Logs & Audit Trail

**Mục tiêu:** Xem logs và audit trail của database

**Backend API:**
- [ ] `GET /db/{db_id}/logs` - Database logs
  - Query params: `?level=ERROR&limit=100&offset=0`
- [ ] `GET /db/{db_id}/audit` - Audit trail
  - Query params: `?action=CREATE&limit=100&offset=0`

- [ ] **Database Schema**
  ```sql
  CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (database_id) REFERENCES databases(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_db_created (database_id, created_at)
  );
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `audit_service.py`
    - [ ] `log_action(db_id, user_id, action, details)`
    - [ ] `get_logs(db_id, filters)`
    - [ ] `get_audit_trail(db_id, filters)`
  - [ ] Middleware: Log all database actions
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test log creation
  - [ ] Test get logs
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Logs viewer component
  - [ ] Audit trail table
  - [ ] Filters (level, action, date range)

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 2-3 days
**Dependencies:** None

---

#### Feature 7: Database Alerts & Notifications

**Mục tiêu:** Cảnh báo khi database có vấn đề

**Backend API:**
- [ ] `GET /db/{db_id}/alerts` - Database alerts
- [ ] `POST /db/{db_id}/alerts` - Create alert rule
- [ ] `PUT /db/{db_id}/alerts/{alert_id}` - Update alert
- [ ] `DELETE /db/{db_id}/alerts/{alert_id}` - Delete alert

- [ ] **Database Schema**
  ```sql
  CREATE TABLE alert_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    name VARCHAR(255),
    metric_type ENUM('CPU', 'MEMORY', 'CONNECTIONS', 'STORAGE', 'ERROR_RATE'),
    threshold DECIMAL(10,2),
    condition ENUM('GT', 'LT', 'EQ'),
    notification_methods JSON, -- ['email', 'sms']
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (database_id) REFERENCES databases(id)
  );
  
  CREATE TABLE alert_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_rule_id INT NOT NULL,
    database_id INT NOT NULL,
    metric_value DECIMAL(10,2),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id),
    FOREIGN KEY (database_id) REFERENCES databases(id)
  );
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `alert_service.py`
    - [ ] `create_alert_rule(db_id, rule)`
    - [ ] `check_alerts(db_id)` - Check metrics against rules
    - [ ] `send_notification(alert, methods)` - Email/SMS
  - [ ] Background job: `alert_checker.py`
    - [ ] Check alerts every 5 minutes
  - [ ] Email service integration
  - [ ] API endpoints trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test alert creation
  - [ ] Test alert triggering
  - [ ] Test notifications
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Alert rules management
  - [ ] Alert history
  - [ ] Notification settings

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 3-4 days
**Dependencies:** Feature 2 (Monitoring)

---

### Phase 3: Low Priority Features

#### Feature 8: Database Scaling

**Mục tiêu:** Scale up/down database resources

**Backend API:**
- [ ] `POST /db/{db_id}/scale` - Scale database
  - Request: `{ "cpu": 2, "memory_mb": 4096, "storage_mb": 10240 }`

- [ ] **Backend Implementation**
  - [ ] Service: `scaling_service.py`
    - [ ] `scale_database(db_id, resources)`
  - [ ] API endpoint trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test scaling
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Scaling form
  - [ ] Resource sliders

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 2-3 days
**Dependencies:** None (MVP không cần thiết)

---

#### Feature 9: Database Health Check

**Mục tiêu:** Kiểm tra health status của database

**Backend API:**
- [ ] `GET /db/{db_id}/health` - Health check
  - Response: `{ "status": "HEALTHY", "checks": {...} }`

- [ ] **Backend Implementation**
  - [ ] Service: `health_service.py`
    - [ ] `check_health(db_id)` - Check connectivity, performance
  - [ ] API endpoint trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test health check
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Health status indicator
  - [ ] Health check details

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 1-2 days
**Dependencies:** Feature 2 (Monitoring)

---

#### Feature 10: Database Maintenance Window

**Mục tiêu:** Schedule maintenance windows

**Backend API:**
- [ ] `POST /db/{db_id}/maintenance` - Schedule maintenance
  - Request: `{ "start_time": "...", "duration_minutes": 60, "reason": "..." }`

- [ ] **Database Schema**
  ```sql
  CREATE TABLE maintenance_windows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    database_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL,
    reason VARCHAR(500),
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (database_id) REFERENCES databases(id)
  );
  ```

- [ ] **Backend Implementation**
  - [ ] Service: `maintenance_service.py`
    - [ ] `schedule_maintenance(db_id, window)`
  - [ ] API endpoint trong `main.py`

- [ ] **Backend Tests**
  - [ ] Test maintenance scheduling
  - [ ] Coverage: >= 80%

- [ ] **Frontend Implementation**
  - [ ] Maintenance scheduling form
  - [ ] Maintenance calendar

- [ ] **Frontend Tests**
  - [ ] Component tests

**Estimated Time:** 2-3 days
**Dependencies:** None

---

## 📅 Timeline Estimate

### Phase 1 (HIGH Priority): ~10-12 days
- Feature 1: Backup & Restore - 3-4 days
- Feature 2: Monitoring - 4-5 days
- Feature 3: IP Whitelist - 2-3 days

### Phase 2 (MEDIUM Priority): ~10-12 days
- Feature 4: Cloning - 1-2 days (depends on Feature 1)
- Feature 5: Export/Import - 2-3 days
- Feature 6: Logs & Audit - 2-3 days
- Feature 7: Alerts - 3-4 days (depends on Feature 2)

### Phase 3 (LOW Priority): ~5-8 days
- Feature 8: Scaling - 2-3 days
- Feature 9: Health Check - 1-2 days (depends on Feature 2)
- Feature 10: Maintenance - 2-3 days

**Total Estimated Time:** ~25-32 days (5-6 weeks)

---

## 🧪 Testing Strategy

### Backend Testing
- **Unit Tests:** pytest với coverage >= 80%
- **Integration Tests:** Test API endpoints với test database
- **Test Files Structure:**
  ```
  backend/tests/
  ├── test_backup_api.py
  ├── test_backup_service.py
  ├── test_monitoring_api.py
  └── ...
  ```

### Frontend Testing
- **Component Tests:** React Testing Library
- **Integration Tests:** Test API integration
- **E2E Tests:** Playwright hoặc Cypress (cho critical flows)
- **Test Files Structure:**
  ```
  frontend/src/
  ├── components/
  │   └── __tests__/
  │       ├── BackupManagement.test.jsx
  │       └── ...
  └── pages/
      └── __tests__/
          └── ...
  ```

---

## 📝 Development Checklist Template

Cho mỗi tính năng, sử dụng checklist này:

```markdown
### Feature X: [Tên tính năng]

#### Backend Development
- [ ] Design API endpoints
- [ ] Create database schema (nếu cần)
- [ ] Implement service layer
- [ ] Implement API endpoints
- [ ] Add error handling
- [ ] Add logging

#### Backend Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Run tests
- [ ] Fix failing tests
- [ ] Achieve >= 80% coverage
- [ ] ✅ All tests pass

#### Frontend Development
- [ ] Design UI/UX
- [ ] Create components
- [ ] Integrate API
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success messages

#### Frontend Testing
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Run tests
- [ ] Fix failing tests
- [ ] ✅ All tests pass

#### Documentation
- [ ] Update API documentation
- [ ] Update user guide (nếu cần)
- [ ] Update CHANGELOG.md

#### Deployment
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Test on staging
- [ ] Deploy to production
```

---

## 🎯 Success Criteria

Mỗi tính năng được coi là hoàn thành khi:
1. ✅ Backend API hoàn chỉnh và tested
2. ✅ Frontend UI hoàn chỉnh và tested
3. ✅ Tất cả tests pass
4. ✅ Code review passed
5. ✅ Documentation updated
6. ✅ Deployed to production
7. ✅ User acceptance testing passed

---

## 📚 Resources & Tools

### Backend
- **Framework:** FastAPI
- **Testing:** pytest, pytest-asyncio
- **Database:** MySQL 8.0
- **ORM:** SQLAlchemy

### Frontend
- **Framework:** React + Vite
- **Testing:** Vitest, React Testing Library
- **Charts:** Chart.js hoặc Recharts
- **HTTP Client:** Fetch API

### DevOps
- **CI/CD:** GitHub Actions hoặc GitLab CI
- **Container:** Docker
- **Monitoring:** (TBD)

---

## 🔄 Review & Update

Kế hoạch này sẽ được review và update hàng tuần:
- ✅ Update progress
- ✅ Adjust timeline nếu cần
- ✅ Add/remove features dựa trên feedback
- ✅ Update priorities

---

**Last Updated:** 2025-12-12
**Version:** 1.0

