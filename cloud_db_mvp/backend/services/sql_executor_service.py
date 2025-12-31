"""
sql_executor_service.py - Service để execute SQL queries trên database
- Execute SELECT queries và trả về results
- Execute non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
- Validate SQL queries
- Limit query execution time và result size
"""

import os
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from models import Database
from services.mysql_service import MySQLService
import re

class SQLExecutorService:
    def __init__(self):
        self.mysql_service = MySQLService()
        self.max_result_rows = int(os.getenv("SQL_MAX_RESULT_ROWS", "1000"))
        self.max_execution_time = int(os.getenv("SQL_MAX_EXECUTION_TIME", "30"))  # seconds
    
    def execute_query(
        self,
        db: Session,
        database_id: int,
        query: str,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Execute SQL query trên database
        Returns: {
            "success": bool,
            "columns": List[str],
            "rows": List[List[Any]],
            "row_count": int,
            "execution_time_ms": float,
            "message": str,
            "affected_rows": int (for non-SELECT queries)
        }
        """
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise ValueError(f"Database {database_id} not found")
        
        if database.owner_id != user_id:
            raise ValueError("Access denied")
        
        if database.status != "ACTIVE":
            raise ValueError(f"Database {database_id} is not ACTIVE")
        
        # Validate query
        self._validate_query(query)
        
        # Sanitize query
        query = query.strip()
        if not query:
            raise ValueError("Query cannot be empty")
        
        # Determine query type
        query_type = self._get_query_type(query)
        
        physical_db_name = database.physical_db_name or f"db_{database.id}"
        
        # Lấy thông tin user của DB đó (không dùng root/admin để tránh hack quyền)
        db_username = database.db_username or f"user_{database.id}"
        db_password = database.db_password_hash or ""  # Password được lưu trong db_password_hash
        
        if not db_password:
            raise ValueError(f"Database user password not found. Please reset password first.")
        
        import time
        import pymysql
        from pymysql.constants import CLIENT
        start_time = time.time()
        
        try:
            # Kết nối bằng user của DB đó (không dùng root/admin)
            mysql_host = os.getenv('MYSQL_HOST', 'localhost')
            mysql_port = int(os.getenv('MYSQL_PORT', 3306))
            
            conn = pymysql.connect(
                host=mysql_host,
                port=mysql_port,
                user=db_username,
                password=db_password,
                database=physical_db_name,
                client_flag=CLIENT.MULTI_STATEMENTS,
                autocommit=False,  # Không autocommit để có thể rollback nếu cần
                connect_timeout=10,
                ssl={'check_hostname': False} if mysql_host != 'localhost' else None
            )
            cur = conn.cursor()
            
            # Execute query
            cur.execute(query)
            
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            
            result = {
                "success": True,
                "execution_time_ms": round(execution_time, 2),
                "query_type": query_type
            }
            
            if query_type == "SELECT":
                # Fetch results
                columns = [desc[0] for desc in cur.description] if cur.description else []
                rows = cur.fetchall()
                
                # Limit result size
                if len(rows) > self.max_result_rows:
                    rows = rows[:self.max_result_rows]
                    result["message"] = f"Results limited to {self.max_result_rows} rows. Total rows: {len(rows)}"
                else:
                    result["message"] = f"Query executed successfully. Returned {len(rows)} rows."
                
                # Convert rows to list of lists
                rows_list = []
                for row in rows:
                    rows_list.append([str(val) if val is not None else None for val in row])
                
                result["columns"] = columns
                result["rows"] = rows_list
                result["row_count"] = len(rows_list)
                result["affected_rows"] = cur.rowcount
                
            else:
                # Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
                conn.commit()
                affected_rows = cur.rowcount
                result["columns"] = []
                result["rows"] = []
                result["row_count"] = 0
                result["affected_rows"] = affected_rows
                
                # Thêm warning cho INSERT queries về duplicate data
                if query_type == "INSERT":
                    # Kiểm tra xem có UNIQUE constraint không bằng cách thử query information_schema
                    try:
                        # Lấy tên table từ INSERT query
                        import re
                        insert_match = re.search(r'INSERT\s+INTO\s+`?(\w+)`?', query, re.IGNORECASE)
                        if insert_match:
                            table_name = insert_match.group(1)
                            # Kiểm tra xem table có UNIQUE constraint không
                            check_cur = conn.cursor()
                            check_cur.execute("""
                                SELECT COUNT(*) 
                                FROM information_schema.TABLE_CONSTRAINTS 
                                WHERE TABLE_SCHEMA = DATABASE() 
                                AND TABLE_NAME = %s 
                                AND CONSTRAINT_TYPE = 'UNIQUE'
                            """, (table_name,))
                            has_unique = check_cur.fetchone()[0] > 0
                            check_cur.close()
                            
                            if not has_unique and affected_rows > 0:
                                result["message"] = f"Query executed successfully. {affected_rows} row(s) inserted. ⚠️ Note: This table has no UNIQUE constraint, so duplicate data can be inserted."
                            else:
                                result["message"] = f"Query executed successfully. {affected_rows} row(s) affected."
                        else:
                            result["message"] = f"Query executed successfully. {affected_rows} row(s) affected."
                    except Exception:
                        # Nếu không check được, chỉ hiển thị message thông thường
                        result["message"] = f"Query executed successfully. {affected_rows} row(s) affected."
                else:
                    result["message"] = f"Query executed successfully. {affected_rows} row(s) affected."
            
            cur.close()
            conn.close()
            
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            
            # Kiểm tra duplicate key error (MySQL error code 1062)
            if "Duplicate entry" in error_msg or "1062" in error_msg or "duplicate" in error_msg.lower():
                raise ValueError(f"Duplicate entry detected: {error_msg}. Cannot insert duplicate data due to unique constraint.")
            
            # Kiểm tra foreign key constraint error (MySQL error code 1452)
            if "Cannot add or update a child row" in error_msg or "1452" in error_msg:
                raise ValueError(f"Foreign key constraint violation: {error_msg}")
            
            # Kiểm tra other constraint errors
            if "constraint" in error_msg.lower() or "violation" in error_msg.lower():
                raise ValueError(f"Constraint violation: {error_msg}")
            
            raise Exception(f"SQL execution failed: {error_msg}")
    
    def _validate_query(self, query: str) -> None:
        """Validate SQL query"""
        query_upper = query.upper().strip()
        
        # Block dangerous operations
        dangerous_keywords = [
            "DROP DATABASE",
            "DROP SCHEMA",
            "CREATE DATABASE",
            "CREATE SCHEMA",
            "ALTER DATABASE",
            "GRANT",
            "REVOKE",
            "FLUSH",
            "SHUTDOWN",
            "KILL"
        ]
        
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                raise ValueError(f"Operation '{keyword}' is not allowed for security reasons")
        
        # Check for multiple statements (prevent SQL injection)
        if ';' in query and query.count(';') > 1:
            # Allow single statement ending with semicolon
            statements = [s.strip() for s in query.split(';') if s.strip()]
            if len(statements) > 1:
                raise ValueError("Multiple statements are not allowed. Please execute one query at a time.")
    
    def _get_query_type(self, query: str) -> str:
        """Determine query type"""
        query_upper = query.upper().strip()
        
        if query_upper.startswith("SELECT"):
            return "SELECT"
        elif query_upper.startswith("INSERT"):
            return "INSERT"
        elif query_upper.startswith("UPDATE"):
            return "UPDATE"
        elif query_upper.startswith("DELETE"):
            return "DELETE"
        elif query_upper.startswith("CREATE"):
            return "CREATE"
        elif query_upper.startswith("ALTER"):
            return "ALTER"
        elif query_upper.startswith("DROP"):
            return "DROP"
        elif query_upper.startswith("SHOW"):
            return "SHOW"
        elif query_upper.startswith("DESCRIBE") or query_upper.startswith("DESC"):
            return "DESCRIBE"
        elif query_upper.startswith("EXPLAIN"):
            return "EXPLAIN"
        else:
            return "OTHER"

