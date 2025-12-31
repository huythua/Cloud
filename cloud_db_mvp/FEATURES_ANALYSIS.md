# 📋 Phân Tích Chức Năng Hệ Thống DB Cloud

## 1. 🗺️ Tổng Quan Các Chức Năng (Feature Overview)

```mermaid
mindmap
  root((DB Cloud<br/>Features))
    Authentication
      Email/Password
      Google OAuth
      JWT Token
      Password Reset
    User Management
      Profile Management
      Change Password
      Logout
    Database Management
      Create Database
      List Databases
      View Database Details
      Update Database
      Delete Database
      Connection Info
      Reset DB Password
    Database Operations
      SQL Query Executor
      Query Validation
      Security Checks
      Result Display
    Backup & Restore
      Create Backup
      List Backups
      Download Backup
      Delete Backup
      Restore from Backup
    Monitoring & Analytics
      Real-time Metrics
      Historical Metrics
      QPS Tracking
      Connection Monitoring
      Storage Monitoring
      Performance Summary
      Slow Query Analysis
    Database Cloning
      Clone Database
      Clone Status Tracking
      Clone History
    Export/Import
      Export to SQL
      Import from SQL
      Import Status Tracking
    Subscription Management
      View Plans
      Subscribe to Plan
      Cancel Subscription
      Auto-renew Toggle
      Active Subscription
    Payment System
      VNPay Integration
      Payment History
      Balance Management
      Invoice Generation
    Usage & Statistics
      Storage Usage
      Database Stats
      Usage Statistics
```

## 2. 🎯 Phân Loại Chức Năng Theo Module

```mermaid
graph TB
    subgraph "🔐 Authentication Module"
        A1[Email/Password Login]
        A2[Google OAuth Login]
        A3[User Registration]
        A4[Password Reset]
        A5[JWT Token Management]
    end

    subgraph "👤 User Management Module"
        U1[View Profile]
        U2[Update Profile]
        U3[Change Password]
        U4[View Balance/Points]
    end

    subgraph "🗄️ Database Core Module"
        D1[Create Database]
        D2[List Databases]
        D3[View Database Details]
        D4[Update Database Info]
        D5[Delete Database]
        D6[Connection Information]
        D7[Reset DB Password]
    end

    subgraph "💻 SQL Operations Module"
        S1[Execute SQL Query]
        S2[Query Validation]
        S3[Security Checks]
        S4[Result Formatting]
        S5[Error Handling]
        S6[Warning Detection]
    end

    subgraph "💾 Backup & Restore Module"
        B1[Create Backup]
        B2[List Backups]
        B3[Download Backup]
        B4[Delete Backup]
        B5[Restore Database]
        B6[Backup Status Tracking]
    end

    subgraph "📊 Monitoring Module"
        M1[Real-time Metrics]
        M2[Historical Metrics]
        M3[QPS Calculation]
        M4[Connection Monitoring]
        M5[Storage Tracking]
        M6[Performance Summary]
        M7[Slow Query Detection]
    end

    subgraph "📋 Clone Module"
        C1[Clone Database]
        C2[Clone Status]
        C3[Clone History]
    end

    subgraph "📤 Export/Import Module"
        E1[Export to SQL File]
        E2[Import from SQL File]
        E3[Import Status]
        E4[Import History]
    end

    subgraph "💳 Subscription Module"
        SUB1[View Pricing Plans]
        SUB2[Subscribe to Plan]
        SUB3[Cancel Subscription]
        SUB4[Auto-renew Toggle]
        SUB5[Active Subscription Info]
    end

    subgraph "💰 Payment Module"
        P1[VNPay Payment]
        P2[Payment History]
        P3[Balance Top-up]
        P4[Invoice Generation]
    end

    subgraph "📈 Usage & Analytics Module"
        UA1[Storage Usage Stats]
        UA2[Database Statistics]
        UA3[Usage Reports]
    end

    style A1 fill:#e1f5ff
    style D1 fill:#61dafb
    style S1 fill:#4479a1
    style B1 fill:#ff9800
    style M1 fill:#009688
```

## 3. 🔗 Mối Quan Hệ Giữa Các Chức Năng (Feature Dependencies)

```mermaid
graph LR
    subgraph "Prerequisites"
        Auth[🔐 Authentication]
        User[👤 User Account]
    end

    subgraph "Core Features"
        CreateDB[➕ Create Database]
        ViewDB[👁️ View Database]
        SQLQuery[💻 SQL Query]
    end

    subgraph "Dependent Features"
        Backup[💾 Backup]
        Restore[🔄 Restore]
        Clone[📋 Clone]
        Export[📤 Export]
        Import[📥 Import]
        Monitor[📊 Monitoring]
    end

    subgraph "Supporting Features"
        Subscribe[💳 Subscribe]
        Payment[💰 Payment]
        Usage[📈 Usage Stats]
    end

    Auth --> User
    User --> CreateDB
    User --> Subscribe
    CreateDB --> ViewDB
    ViewDB --> SQLQuery
    ViewDB --> Backup
    ViewDB --> Clone
    ViewDB --> Export
    ViewDB --> Import
    ViewDB --> Monitor
    Backup --> Restore
    SQLQuery --> Monitor
    Subscribe --> Payment
    Payment --> Usage
    CreateDB --> Usage

    style Auth fill:#e1f5ff
    style CreateDB fill:#61dafb
    style SQLQuery fill:#4479a1
    style Monitor fill:#009688
```

## 4. 👣 User Journey Map - Luồng Người Dùng

```mermaid
journey
    title User Journey - Từ Đăng Ký đến Quản Lý Database
    
    section Đăng Ký & Đăng Nhập
      Truy cập website: 5: User
      Đăng ký tài khoản: 4: User
      Xác nhận email: 3: User
      Đăng nhập: 5: User
      Xem Dashboard: 5: User
    
    section Khám Phá Gói Dịch Vụ
      Xem danh sách gói: 4: User
      So sánh giá: 5: User
      Chọn gói phù hợp: 4: User
    
    section Thanh Toán & Kích Hoạt
      Nạp tiền vào tài khoản: 3: User, VNPay
      Thanh toán gói: 3: User, VNPay
      Kích hoạt gói: 5: System
    
    section Tạo Database
      Click "Tạo Database": 5: User
      Điền thông tin: 4: User
      Chọn quota: 4: User
      Xác nhận tạo: 5: User
      Đợi provisioning: 3: User, System
      Nhận thông tin kết nối: 5: User, System
    
    section Sử Dụng Database
      Xem chi tiết database: 5: User
      Lấy connection info: 5: User
      Chạy SQL query: 5: User
      Xem kết quả: 5: User
      Theo dõi monitoring: 5: User
    
    section Backup & Bảo Vệ
      Tạo backup: 4: User
      Download backup: 5: User
      Restore database: 4: User
    
    section Quản Lý Nâng Cao
      Clone database: 4: User
      Export database: 4: User
      Import database: 4: User
      Xem usage stats: 4: User
```

## 5. 🎨 Chi Tiết Chức Năng - Database Management

```mermaid
flowchart TD
    Start([👤 User]) --> Auth{Đã đăng nhập?}
    Auth -->|Chưa| Login[🔐 Đăng nhập]
    Auth -->|Rồi| Dashboard[📊 Dashboard]
    
    Login --> Dashboard
    
    Dashboard --> Menu{Chọn hành động}
    
    Menu -->|Tạo mới| CreateDB[➕ Tạo Database]
    Menu -->|Xem danh sách| ListDB[📋 Danh sách DB]
    Menu -->|Quản lý gói| Subscription[💳 Subscription]
    Menu -->|Thanh toán| Payment[💰 Payment]
    
    CreateDB --> FillForm[📝 Điền form<br/>- Tên database<br/>- Quota MB]
    FillForm --> Validate{Validate}
    Validate -->|Invalid| FillForm
    Validate -->|Valid| Submit[🚀 Submit]
    Submit --> Backend[🐍 Backend API<br/>POST /db/create]
    Backend --> Provision[⚙️ Provisioning<br/>- Tạo DB<br/>- Tạo user<br/>- Set permissions]
    Provision --> Success[✅ Thành công]
    Success --> DBDetail[📋 Database Detail]
    
    ListDB --> SelectDB[👆 Chọn Database]
    SelectDB --> DBDetail
    
    DBDetail --> Tabs{Chọn Tab}
    Tabs -->|Overview| Overview[📊 Overview<br/>- Connection Info<br/>- Reset Password<br/>- Stats]
    Tabs -->|SQL| SQLTab[💻 SQL Query<br/>- Execute queries<br/>- View results]
    Tabs -->|Backup| BackupTab[💾 Backup/Restore<br/>- Create backup<br/>- Restore]
    Tabs -->|Monitor| MonitorTab[📈 Monitoring<br/>- Real-time<br/>- Historical]
    Tabs -->|Clone| CloneTab[📋 Clone<br/>- Clone DB]
    Tabs -->|Export| ExportTab[📤 Export/Import<br/>- Export SQL<br/>- Import SQL]
    
    SQLTab --> ExecuteQuery[▶️ Execute Query]
    ExecuteQuery --> ValidateSQL{Validate SQL}
    ValidateSQL -->|Dangerous| Block[🚫 Block query]
    ValidateSQL -->|Safe| RunQuery[▶️ Run on MySQL]
    RunQuery --> CollectMetrics[📊 Collect Metrics]
    CollectMetrics --> ShowResult[📋 Show Results]
    
    BackupTab --> CreateBackup[💾 Create Backup]
    CreateBackup --> Mysqldump[🗄️ mysqldump]
    Mysqldump --> SaveFile[💾 Save file]
    SaveFile --> BackupList[📋 Backup List]
    
    MonitorTab --> FetchMetrics[📊 Fetch Metrics]
    FetchMetrics --> Display[📈 Display Charts]
    Display --> AutoRefresh[🔄 Auto Refresh<br/>every 30s]
    AutoRefresh --> FetchMetrics
    
    style Dashboard fill:#e1f5ff
    style CreateDB fill:#61dafb
    style DBDetail fill:#009688
    style SQLTab fill:#4479a1
    style MonitorTab fill:#ff9800
```

## 6. 🔄 Luồng Tương Tác Giữa Các Chức Năng

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as ⚛️ Frontend
    participant BE as 🐍 Backend
    participant Auth as 🔐 Auth Service
    participant DB as 🗄️ MySQL Service
    participant Backup as 💾 Backup Service
    participant Monitor as 📊 Monitor Service
    participant SQL as 💻 SQL Service

    Note over U,SQL: 1. Tạo Database và Sử Dụng
    
    U->>FE: Login
    FE->>Auth: POST /auth/login
    Auth-->>FE: JWT Token
    FE->>FE: Store token
    
    U->>FE: Tạo Database
    FE->>BE: POST /db/create
    BE->>DB: Create database
    DB->>DB: Provision user & permissions
    DB-->>BE: Database created
    BE->>Monitor: collect_metrics(db_id)
    Monitor-->>BE: Metrics collected
    BE-->>FE: Database info
    
    Note over U,SQL: 2. Chạy SQL Query
    
    U->>FE: Execute SQL Query
    FE->>BE: POST /db/{id}/query
    BE->>SQL: execute_query()
    SQL->>SQL: Validate & check security
    SQL->>DB: Execute query (as db_user)
    DB-->>SQL: Query result
    SQL->>SQL: Check for warnings
    SQL-->>BE: Result + warnings
    BE->>Monitor: collect_metrics(db_id)
    Monitor-->>BE: Updated metrics
    BE-->>FE: Query result
    
    Note over U,SQL: 3. Backup Database
    
    U->>FE: Create Backup
    FE->>BE: POST /db/{id}/backup
    BE->>Backup: create_backup()
    Backup->>DB: mysqldump
    DB-->>Backup: SQL dump
    Backup->>Backup: Save to file
    Backup-->>BE: Backup info
    BE-->>FE: Backup created
    
    Note over U,SQL: 4. Monitoring
    
    U->>FE: Open Monitoring Tab
    FE->>BE: GET /db/{id}/metrics
    BE->>Monitor: get_metrics()
    Monitor->>DB: Query metrics
    DB-->>Monitor: Real-time + historical
    Monitor->>Monitor: Calculate QPS
    Monitor-->>BE: Metrics response
    BE-->>FE: Metrics data
    FE->>FE: Render charts
```

## 7. 📊 Feature Matrix - Ma Trận Chức Năng

```mermaid
graph TB
    subgraph "User Roles & Permissions"
        Guest[👤 Guest<br/>Chưa đăng nhập]
        User[👤 User<br/>Đã đăng nhập]
        Owner[👑 Owner<br/>Chủ sở hữu DB]
    end

    subgraph "Features by Role"
        F1[View Plans]
        F2[Register/Login]
        F3[Create Database]
        F4[View Own DBs]
        F5[View DB Details]
        F6[Execute SQL]
        F7[Create Backup]
        F8[Restore Backup]
        F9[Clone DB]
        F10[Export/Import]
        F11[View Metrics]
        F12[Manage Subscriptions]
        F13[Make Payments]
    end

    Guest --> F1
    Guest --> F2
    
    User --> F1
    User --> F3
    User --> F4
    User --> F12
    User --> F13
    
    Owner --> F5
    Owner --> F6
    Owner --> F7
    Owner --> F8
    Owner --> F9
    Owner --> F10
    Owner --> F11

    style Guest fill:#fee2e2
    style User fill:#dbeafe
    style Owner fill:#d1fae5
```

## 8. 🎯 Feature Priority & Status Matrix

```mermaid
quadrantChart
    title Feature Priority Matrix
    x-axis Low Priority --> High Priority
    y-axis Low Complexity --> High Complexity
    quadrant-1 Nice to Have
    quadrant-2 Quick Wins
    quadrant-3 Major Projects
    quadrant-4 Strategic Initiatives
    Login: [0.8, 0.2]
    Register: [0.8, 0.2]
    Create DB: [0.9, 0.6]
    SQL Query: [1.0, 0.7]
    Backup: [0.95, 0.5]
    Restore: [0.95, 0.5]
    Monitoring: [0.9, 0.8]
    Clone: [0.7, 0.6]
    Export/Import: [0.75, 0.65]
    Payments: [0.85, 0.7]
    Subscriptions: [0.8, 0.6]
    Google OAuth: [0.6, 0.4]
    Slow Query Analysis: [0.7, 0.7]
    Usage Stats: [0.65, 0.5]
```

## 9. 🔐 Security Features & Validations

```mermaid
graph TD
    subgraph "Authentication Security"
        A1[JWT Token]
        A2[Password Hashing<br/>bcrypt]
        A3[OAuth 2.0]
        A4[Token Expiration]
    end

    subgraph "Database Security"
        D1[User-specific DB Users]
        D2[Least Privilege Access]
        D3[Password Encryption]
        D4[Connection Isolation]
    end

    subgraph "SQL Security"
        S1[SQL Injection Prevention]
        S2[Query Validation]
        S3[Block Dangerous Commands<br/>DROP, ALTER, GRANT]
        S4[Single Statement Only]
        S5[User-specific Permissions]
    end

    subgraph "Authorization"
        Z1[Ownership Verification]
        Z2[Resource-based Access]
        Z3[API Route Protection]
    end

    subgraph "Data Protection"
        P1[Backup Encryption]
        P2[Secure File Storage]
        P3[Audit Logging]
    end

    A1 --> Z3
    A2 --> A1
    A3 --> A1
    Z1 --> D1
    Z2 --> D2
    S1 --> S2
    S2 --> S3
    S3 --> S5
    S5 --> D1

    style A1 fill:#e1f5ff
    style D1 fill:#61dafb
    style S3 fill:#fee2e2
    style Z1 fill:#d1fae5
```

## 10. 📈 Monitoring & Analytics Features

```mermaid
flowchart LR
    subgraph "Data Collection"
        DC1[SQL Query Trigger]
        DC2[DB Creation Trigger]
        DC3[Manual Refresh]
        DC4[Scheduled Collection]
    end

    subgraph "Metrics Collected"
        M1[Active Connections]
        M2[Storage Size MB]
        M3[Total Queries]
        M4[Memory Usage]
        M5[CPU Usage]
        M6[Response Time]
    end

    subgraph "Calculated Metrics"
        C1[QPS<br/>Queries Per Second]
        C2[Min/Avg/Max]
        C3[Growth Rate]
        C4[Trend Analysis]
    end

    subgraph "Display"
        D1[Real-time Cards]
        D2[Historical Table]
        D3[Performance Summary]
        D4[Slow Query List]
    end

    DC1 --> M1
    DC2 --> M1
    DC3 --> M1
    DC4 --> M1
    
    M1 --> C1
    M2 --> C2
    M3 --> C1
    M4 --> C2
    M5 --> C2
    M6 --> C2
    
    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D4
    
    style DC1 fill:#e1f5ff
    style M1 fill:#61dafb
    style C1 fill:#4479a1
    style D1 fill:#009688
```

## 11. 💳 Payment & Subscription Flow

```mermaid
stateDiagram-v2
    [*] --> ViewPlans: User browses
    
    ViewPlans --> SelectPlan: Choose plan
    ViewPlans --> CheckBalance: Check balance
    
    CheckBalance --> TopUp: Insufficient
    CheckBalance --> Subscribe: Sufficient
    
    TopUp --> VNPay: Initiate payment
    VNPay --> PaymentSuccess: Payment OK
    VNPay --> PaymentFailed: Payment Failed
    
    PaymentSuccess --> UpdateBalance: Add to balance
    PaymentFailed --> TopUp: Retry
    
    SelectPlan --> Subscribe: Confirm
    UpdateBalance --> Subscribe
    
    Subscribe --> Active: Subscription created
    Active --> Monitoring: Track usage
    Active --> Cancel: User cancels
    Active --> Expired: Time expires
    
    Cancel --> Cancelled: Status updated
    Expired --> Renew: Auto-renew ON
    Expired --> Lapsed: Auto-renew OFF
    
    Renew --> Active: Renewed
    Cancelled --> [*]
    Lapsed --> [*]
    Monitoring --> [*]
```

## 12. 🗄️ Database Lifecycle Management

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create request
    
    PENDING --> PROVISIONING: Start creation
    PROVISIONING --> ACTIVE: Success
    PROVISIONING --> FAILED: Error
    
    ACTIVE --> OPERATIONS: Use database
    OPERATIONS --> SQL: Execute queries
    OPERATIONS --> BACKUP: Create backup
    OPERATIONS --> CLONE: Clone database
    OPERATIONS --> MONITOR: View metrics
    OPERATIONS --> EXPORT: Export data
    OPERATIONS --> IMPORT: Import data
    
    SQL --> OPERATIONS: Continue
    BACKUP --> OPERATIONS: Continue
    CLONE --> NEW_DB: Clone created
    MONITOR --> OPERATIONS: Continue
    EXPORT --> OPERATIONS: Continue
    IMPORT --> OPERATIONS: Continue
    
    NEW_DB --> ACTIVE: New database
    
    OPERATIONS --> RESTORE: Restore from backup
    RESTORE --> OPERATIONS: Restored
    
    OPERATIONS --> UPDATE: Update info
    UPDATE --> OPERATIONS: Updated
    
    OPERATIONS --> DELETE: Delete request
    DELETE --> DELETED: Database deleted
    
    FAILED --> [*]
    DELETED --> [*]
    
    note right of ACTIVE
        Main operational state
        All features available
    end note
    
    note right of OPERATIONS
        Active operations:
        - SQL queries
        - Backups
        - Monitoring
        - Clone/Export/Import
    end note
```

## 13. 🔄 Feature Integration Points

```mermaid
graph TB
    subgraph "Core Services"
        MySQL[🗄️ MySQL Service]
        Auth[🔐 Auth Service]
        Monitor[📊 Monitor Service]
    end

    subgraph "Database Features"
        Create[➕ Create DB]
        Query[💻 SQL Query]
        Backup[💾 Backup]
        Clone[📋 Clone]
        Export[📤 Export/Import]
    end

    subgraph "User Features"
        Profile[👤 Profile]
        Subscribe[💳 Subscription]
        Payment[💰 Payment]
    end

    Create --> MySQL
    Create --> Monitor
    Query --> MySQL
    Query --> Monitor
    Backup --> MySQL
    Clone --> MySQL
    Export --> MySQL
    
    Profile --> Auth
    Subscribe --> Auth
    Payment --> Auth
    
    Monitor --> MySQL
    Monitor --> MySQL
    
    style MySQL fill:#4479a1
    style Monitor fill:#009688
    style Auth fill:#e1f5ff
```

## 14. 📱 API Endpoints by Feature Group

```mermaid
mindmap
  root((API Endpoints))
    Authentication
      POST /auth/register
      POST /auth/login
      GET /auth/google
      POST /auth/google/callback
    User Management
      GET /me
      PUT /me
      POST /me/change-password
    Database CRUD
      POST /db/create
      GET /db/list
      GET /db/{id}
      PUT /db/{id}
      DELETE /db/{id}
      GET /db/{id}/stats
      GET /db/{id}/connection
      POST /db/{id}/reset-password
    SQL Operations
      POST /db/{id}/query
    Backup & Restore
      POST /db/{id}/backup
      GET /db/{id}/backups
      GET /db/{id}/backups/{id}
      DELETE /db/{id}/backups/{id}
      GET /db/{id}/backups/{id}/download
      POST /db/{id}/restore
      GET /db/{id}/restores
      GET /db/{id}/restores/{id}
    Monitoring
      GET /db/{id}/metrics
      GET /db/{id}/metrics/realtime
      GET /db/{id}/connections
      GET /db/{id}/slow-queries
      GET /db/{id}/performance
    Clone
      POST /db/{id}/clone
      GET /db/{id}/clones
      GET /clones/{id}
    Export/Import
      GET /db/{id}/export
      POST /db/{id}/import
      GET /db/{id}/imports
      GET /imports/{id}
    Subscription
      GET /plans
      GET /subscriptions
      POST /subscriptions
      POST /subscriptions/{id}/cancel
      POST /subscriptions/{id}/auto-renew
      GET /subscriptions/active
    Payment
      POST /payments/create
      GET /payments/vnpay/callback
      GET /invoices
    Usage & Stats
      GET /subscription/storage-info
      GET /usage/stats
```

## 15. 🎯 Feature Success Metrics

```mermaid
graph LR
    subgraph "User Engagement"
        UE1[Daily Active Users]
        UE2[Session Duration]
        UE3[Pages per Session]
        UE4[Return Rate]
    end

    subgraph "Database Operations"
        DO1[Databases Created]
        DO2[SQL Queries Executed]
        DO3[Backups Created]
        DO4[Successful Restores]
    end

    subgraph "Performance"
        P1[API Response Time]
        P2[Query Execution Time]
        P3[Backup Duration]
        P4[Uptime Percentage]
    end

    subgraph "Business Metrics"
        BM1[Subscriptions Created]
        BM2[Payment Success Rate]
        BM3[Revenue]
        BM4[Churn Rate]
    end

    subgraph "System Health"
        SH1[Error Rate]
        SH2[System Load]
        SH3[Storage Usage]
        SH4[Database Connections]
    end

    style UE1 fill:#e1f5ff
    style DO1 fill:#61dafb
    style P1 fill:#4479a1
    style BM1 fill:#009688
    style SH1 fill:#ff9800
```

## 16. 🚀 Feature Roadmap & Evolution

```mermaid
gantt
    title Feature Development Roadmap
    dateFormat YYYY-MM-DD
    section Core Features
    Authentication          :done, auth, 2024-01-01, 2024-01-15
    Database Management     :done, db, 2024-01-15, 2024-02-15
    SQL Executor            :done, sql, 2024-02-01, 2024-02-20
    Backup/Restore          :done, backup, 2024-02-15, 2024-03-01
    
    section Advanced Features
    Monitoring              :done, monitor, 2024-03-01, 2024-03-15
    Clone Database          :done, clone, 2024-03-10, 2024-03-20
    Export/Import           :done, export, 2024-03-15, 2024-03-25
    
    section Business Features
    Subscriptions           :done, sub, 2024-03-20, 2024-04-01
    VNPay Integration       :done, payment, 2024-04-01, 2024-04-10
    Usage Statistics        :done, stats, 2024-04-05, 2024-04-15
    
    section Future Features
    Real-time Notifications :active, notify, 2024-12-29, 2025-01-15
    Advanced Analytics      :analytics, 2025-01-15, 2025-02-15
    Multi-region Support    :region, 2025-02-15, 2025-03-15
    API Access Control      :api, 2025-03-15, 2025-04-15
```

## 17. 🔍 Feature Testing Coverage

```mermaid
graph TD
    subgraph "Unit Tests"
        UT1[Service Tests]
        UT2[Model Tests]
        UT3[Utility Tests]
    end

    subgraph "Integration Tests"
        IT1[API Endpoint Tests]
        IT2[Database Integration]
        IT3[External Service Tests]
    end

    subgraph "Feature Tests"
        FT1[Authentication Flow]
        FT2[Database CRUD]
        FT3[SQL Execution]
        FT4[Backup/Restore]
        FT5[Monitoring]
        FT6[Clone/Export/Import]
        FT7[Payment Flow]
    end

    subgraph "E2E Tests"
        E2E1[User Journey]
        E2E2[Complete Workflows]
        E2E3[Error Scenarios]
    end

    UT1 --> IT1
    UT2 --> IT2
    UT3 --> IT3
    
    IT1 --> FT1
    IT2 --> FT2
    IT3 --> FT3
    
    FT1 --> E2E1
    FT2 --> E2E2
    FT3 --> E2E3
    FT4 --> E2E2
    FT5 --> E2E1
    FT6 --> E2E2
    FT7 --> E2E3

    style UT1 fill:#e1f5ff
    style IT1 fill:#61dafb
    style FT1 fill:#4479a1
    style E2E1 fill:#009688
```

## 18. 📊 Feature Usage Analytics

```mermaid
pie title Feature Usage Distribution
    "SQL Query Executor" : 35
    "Monitoring" : 25
    "Backup/Restore" : 15
    "Database Creation" : 10
    "Export/Import" : 8
    "Clone Database" : 5
    "Subscription Management" : 2
```

## 19. 🎨 UI/UX Feature Breakdown

```mermaid
graph TB
    subgraph "Page Components"
        P1[Login Page]
        P2[Register Page]
        P3[Dashboard Page]
        P4[Databases List Page]
        P5[Database Detail Page]
        P6[Payments Page]
        P7[Profile Page]
    end

    subgraph "Component Library"
        C1[BackupManager]
        C2[SQLQueryExecutor]
        C3[DatabaseMonitoring]
        C4[CloneDatabase]
        C5[ExportImportDatabase]
        C6[ConnectionInfo]
        C7[ResetPassword]
        C8[ErrorMessage]
        C9[SuccessMessage]
    end

    P5 --> C1
    P5 --> C2
    P5 --> C3
    P5 --> C4
    P5 --> C5
    P5 --> C6
    P5 --> C7
    
    P1 --> C8
    P2 --> C8
    P3 --> C8
    P4 --> C8
    P5 --> C8
    P6 --> C8
    
    P1 --> C9
    P2 --> C9
    P3 --> C9
    P4 --> C9
    P5 --> C9
    P6 --> C9

    style P5 fill:#009688
    style C2 fill:#4479a1
    style C3 fill:#ff9800
```

## 20. 🔄 Data Flow Between Features

```mermaid
flowchart TD
    Start([User Action]) --> Auth{Authenticated?}
    Auth -->|No| Login[Login Required]
    Auth -->|Yes| Action[Feature Action]
    
    Action -->|Create DB| Create[Create Database]
    Action -->|Query| Query[SQL Query]
    Action -->|Backup| Backup[Create Backup]
    Action -->|Monitor| Monitor[View Metrics]
    
    Create --> DB[🗄️ MySQL<br/>New Database]
    Query --> DB
    Backup --> DB
    Monitor --> DB
    
    DB --> Metrics[📊 Metrics Collection]
    Metrics --> Storage[(Metrics Storage)]
    
    Create --> Usage[📈 Usage Stats]
    Query --> Usage
    Usage --> Storage
    
    Backup --> Files[💾 File Storage]
    Files --> Restore[Restore Feature]
    
    style DB fill:#4479a1
    style Metrics fill:#009688
    style Storage fill:#ff9800
    style Files fill:#61dafb
```

---

## 📝 Tóm Tắt

### Core Features (Tính năng cốt lõi)
1. **Authentication & Authorization** - Đăng nhập, đăng ký, xác thực
2. **Database Management** - Tạo, xóa, quản lý database
3. **SQL Query Execution** - Thực thi và quản lý SQL queries
4. **Backup & Restore** - Sao lưu và khôi phục database
5. **Monitoring & Analytics** - Giám sát hiệu suất và phân tích

### Advanced Features (Tính năng nâng cao)
6. **Database Cloning** - Sao chép database
7. **Export/Import** - Xuất/nhập SQL files
8. **Subscription Management** - Quản lý gói dịch vụ
9. **Payment Integration** - Tích hợp thanh toán VNPay
10. **Usage Statistics** - Thống kê sử dụng

### Security Features (Tính năng bảo mật)
- JWT-based authentication
- User-specific database users
- SQL injection prevention
- Query validation & filtering
- Ownership verification
- Secure password handling

### Monitoring Features (Tính năng giám sát)
- Real-time metrics (Connections, Storage, QPS)
- Historical metrics với min/avg/max
- Performance summary
- Slow query detection
- Auto-refresh capabilities

Tất cả các tính năng được tích hợp chặt chẽ và hỗ trợ lẫn nhau để tạo ra một hệ thống quản lý database cloud hoàn chỉnh.

