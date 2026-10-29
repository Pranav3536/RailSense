"""
Unit tests for database engine and read-only query guard (app.db.engine).
"""

import pytest
from app.db.engine import validate_read_only_query, ReadOnlyViolationError


class TestReadOnlyQueryGuard:
    # -------------------------------------------------------------
    # Permitted Queries
    # -------------------------------------------------------------
    @pytest.mark.parametrize(
        "sql",
        [
            "SELECT 1",
            "SELECT * FROM train_records LIMIT 50",
            "select id, train_number, start_date from train_records where seq = 1;",
            "SHOW STATUS LIKE 'Ssl_cipher'",
            "SHOW TABLES",
            "DESCRIBE train_records",
            "DESC train_records",
            "EXPLAIN SELECT * FROM train_records",
            "explain format=tree select count(*) from train_records",
            "WITH cte AS (SELECT id FROM train_records LIMIT 10) SELECT * FROM cte",
            "/* leading comment */ SELECT 1",
            "-- single line comment\nSELECT 1",
            "# hash comment\nSELECT 1",
            "SELECT 1 -- trailing comment",
            "SELECT 1 /* inline comment */ AS val",
            "SELECT 'this is not a DELETE string' AS sample_text",
            "SELECT 'INSERT INTO table' AS mock_query",
        ],
    )
    def test_permitted_queries_pass(self, sql):
        result = validate_read_only_query(sql)
        assert result == sql

    # -------------------------------------------------------------
    # Rejected Queries
    # -------------------------------------------------------------
    @pytest.mark.parametrize(
        "sql,match_phrase",
        [
            ("", "must not be empty"),
            ("   \n\t  ", "must not be empty"),
            ("-- only comment\n", "only comments or whitespace"),
            ("/* only block comment */", "only comments or whitespace"),
            ("INSERT INTO train_records (id) VALUES (1)", "Query must begin with one of"),
            ("UPDATE train_records SET status = 'DELAYED'", "Query must begin with one of"),
            ("DELETE FROM train_records", "Query must begin with one of"),
            ("DROP TABLE train_records", "Query must begin with one of"),
            ("ALTER TABLE train_records ADD COLUMN foo INT", "Query must begin with one of"),
            ("CREATE TABLE new_table (id INT)", "Query must begin with one of"),
            ("TRUNCATE TABLE train_records", "Query must begin with one of"),
            ("REPLACE INTO train_records (id) VALUES (1)", "Query must begin with one of"),
            ("GRANT ALL PRIVILEGES ON *.* TO 'hacker'@'%'", "Query must begin with one of"),
            ("REVOKE ALL PRIVILEGES ON *.* FROM 'user'", "Query must begin with one of"),
            ("FLUSH PRIVILEGES", "Query must begin with one of"),
            ("KILL 123", "Query must begin with one of"),
            ("CALL some_procedure()", "Query must begin with one of"),
            ("SET GLOBAL max_connections = 1000", "Query must begin with one of"),
            # Multi-statement injection attempts
            ("SELECT 1; DROP TABLE train_records", "Multi-statement execution rejected"),
            ("SELECT 1; SELECT 2", "Multi-statement execution rejected"),
            ("SELECT 1; DELETE FROM train_records;", "Multi-statement execution rejected"),
            ("SHOW TABLES; INSERT INTO test VALUES (1);", "Multi-statement execution rejected"),
            # Comment-based bypass attempts
            ("SELECT 1; /* bypass */ DROP TABLE train_records", "Multi-statement execution rejected"),
            # DML inside CTE
            ("WITH cte AS (SELECT 1) DELETE FROM train_records", "Disallowed keyword"),
            ("WITH cte AS (SELECT 1) INSERT INTO train_records (id) VALUES (2)", "Disallowed keyword"),
        ],
    )
    def test_rejected_queries_fail(self, sql, match_phrase):
        with pytest.raises(ReadOnlyViolationError, match=match_phrase):
            validate_read_only_query(sql)
