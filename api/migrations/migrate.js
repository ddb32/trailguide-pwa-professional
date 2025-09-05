#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trailguide_dev',
  user: process.env.DB_USER || 'trailguide',
  password: process.env.DB_PASSWORD || 'secure_dev_password_2024',
};

class MigrationRunner {
  constructor() {
    this.client = new Client(dbConfig);
    this.migrationsDir = __dirname;
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.client.end();
  }

  async createMigrationsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(20) PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await this.client.query(createTableQuery);
      console.log('✅ Migrations tracking table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error.message);
      throw error;
    }
  }

  async getAppliedMigrations() {
    try {
      const result = await this.client.query(
        'SELECT version FROM schema_migrations ORDER BY version ASC'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      return [];
    }
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql') && file.match(/^\d{3}_/))
        .sort();
    } catch (error) {
      console.error('❌ Failed to read migrations directory:', error.message);
      return [];
    }
  }

  async runMigration(filename) {
    const version = filename.split('_')[0];
    const description = filename.replace(/^\d{3}_/, '').replace(/\.sql$/, '');
    const filePath = path.join(this.migrationsDir, filename);

    try {
      console.log(`\n🔄 Running migration: ${filename}`);
      
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Begin transaction
      await this.client.query('BEGIN');
      
      // Execute migration SQL
      await this.client.query(sql);
      
      // Record migration
      await this.client.query(
        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
        [version, description]
      );
      
      // Commit transaction
      await this.client.query('COMMIT');
      
      console.log(`✅ Migration ${version} completed: ${description}`);
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration ${version} failed:`, error.message);
      throw error;
    }
  }

  async runPendingMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();
    
    const pendingMigrations = migrationFiles.filter(file => {
      const version = file.split('_')[0];
      return !appliedMigrations.includes(version);
    });

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to run');
      return;
    }

    console.log(`\n📋 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(file => {
      console.log(`   - ${file}`);
    });

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log(`\n🎉 Successfully applied ${pendingMigrations.length} migration(s)`);
  }

  async showStatus() {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    console.log('\n📊 Migration Status:');
    console.log('===================');

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    migrationFiles.forEach(file => {
      const version = file.split('_')[0];
      const status = appliedMigrations.includes(version) ? '✅' : '⏳';
      console.log(`${status} ${file}`);
    });

    console.log(`\nTotal migrations: ${migrationFiles.length}`);
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`);
  }
}

async function main() {
  const command = process.argv[2] || 'migrate';
  const runner = new MigrationRunner();

  try {
    await runner.connect();
    await runner.createMigrationsTable();

    switch (command) {
      case 'migrate':
        await runner.runPendingMigrations();
        break;
      case 'status':
        await runner.showStatus();
        break;
      case 'reset':
        console.log('⚠️  Database reset not implemented for safety');
        break;
      default:
        console.log('Usage: node migrate.js [migrate|status|reset]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { MigrationRunner };