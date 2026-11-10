package com.dacn.assistant.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Converts legacy VARCHAR text columns to NVARCHAR so Vietnamese is stored correctly.
 *
 * Why this exists: Hibernate's ddl-auto=update creates missing tables/columns but never changes
 * the type of an existing column. A database first created with VARCHAR columns keeps replacing
 * characters outside its code page (ầ, ọ, ạ, ự, ệ ...) with '?' even though the entities now ask
 * for NVARCHAR. The conversion is idempotent: once a column is NVARCHAR it is skipped.
 *
 * Note: rows that were ALREADY saved with '?' cannot be recovered; re-enter them once.
 */
@Component
@Order(0)
public class UnicodeColumnMigrator implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(UnicodeColumnMigrator.class);

  private static final Set<String> TABLES = Set.of(
      "app_users", "projects", "requirements", "user_stories",
      "acceptance_criteria", "sprints", "tasks", "documents");
  private static final Set<String> TEXT_COLUMNS = Set.of(
      "name", "title", "description", "ai_analysis", "narrative",
      "given_text", "when_text", "then_text", "goal", "filename");

  private final JdbcTemplate jdbc;

  public UnicodeColumnMigrator(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @Override
  public void run(ApplicationArguments args) {
    List<Map<String, Object>> columns;
    try {
      columns = jdbc.queryForList(
          "SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE "
              + "FROM INFORMATION_SCHEMA.COLUMNS "
              + "WHERE TABLE_SCHEMA = 'dbo' AND DATA_TYPE = 'varchar'");
    } catch (Exception ex) {
      log.warn("Unicode check skipped (cannot read INFORMATION_SCHEMA): {}", ex.getMessage());
      return;
    }
    for (Map<String, Object> c : columns) {
      String table = String.valueOf(c.get("TABLE_NAME"));
      String column = String.valueOf(c.get("COLUMN_NAME"));
      if (!TABLES.contains(table) || !TEXT_COLUMNS.contains(column)) continue;
      int length = ((Number) c.get("CHARACTER_MAXIMUM_LENGTH")).intValue();
      String type = length == -1 ? "nvarchar(max)" : "nvarchar(" + length + ")";
      String nullability = "YES".equals(c.get("IS_NULLABLE")) ? "NULL" : "NOT NULL";
      String sql = "ALTER TABLE dbo.[" + table + "] ALTER COLUMN [" + column + "] " + type + " " + nullability;
      try {
        jdbc.execute(sql);
        log.info("Converted {}.{} to {} for Vietnamese (Unicode) support", table, column, type);
      } catch (Exception ex) {
        log.error("Could not convert {}.{} to NVARCHAR; run database/03-fix-vietnamese-unicode.sql in SSMS. {}",
            table, column, ex.getMessage());
      }
    }
  }
}
