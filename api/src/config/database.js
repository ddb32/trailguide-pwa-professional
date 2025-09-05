const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trailguide_dev',
  user: process.env.DB_USER || 'trailguide',
  password: process.env.DB_PASSWORD || 'secure_dev_password_2024',
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  acquireTimeoutMillis: 15000,
  application_name: 'trailguide-api',
};

// Log configuration (without password)
console.log('📋 Database Configuration:');
console.log(`  Host: ${dbConfig.host}`);
console.log(`  Port: ${dbConfig.port}`);
console.log(`  Database: ${dbConfig.database}`);
console.log(`  User: ${dbConfig.user}`);
console.log(`  Connection Timeout: ${dbConfig.connectionTimeoutMillis}ms`);
console.log(`  Pool Size: ${dbConfig.min}-${dbConfig.max} connections`);

const pool = new Pool(dbConfig);

pool.on('connect', (client) => {
  console.log(`🔗 New database connection established to ${dbConfig.host}:${dbConfig.port}`);
});

pool.on('acquire', (client) => {
  console.log('📥 Database connection acquired from pool');
});

pool.on('release', (client) => {
  console.log('📤 Database connection released back to pool');
});

pool.on('error', (err) => {
  console.error('🔥 Unexpected database pool error:', err);
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    errno: err.errno,
    syscall: err.syscall
  });
});

const query = async (text, params, retries = 3) => {
  const start = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Database query attempt ${attempt}/${retries}`);
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
      }
      
      console.log(`✅ Query successful in ${duration}ms`);
      return res;
      
    } catch (error) {
      console.error(`💥 Database query error (attempt ${attempt}/${retries}):`, {
        query: text.substring(0, 100),
        error: error.message,
        code: error.code,
        host: dbConfig.host,
        port: dbConfig.port
      });
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

const getClient = async () => {
  return pool.connect();
};

const testConnection = async () => {
  try {
    console.log('🧪 Starting database connection test...');
    console.log(`🎯 Testing connection to ${dbConfig.host}:${dbConfig.port}`);
    
    const res = await query('SELECT NOW() as current_time, version() as postgres_version, current_user, current_database()');
    
    console.log('✅ Database connection test successful!');
    console.log(`📅 Server time: ${res.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${res.rows[0].postgres_version.split(' ')[0]}`);
    console.log(`👤 Connected as user: ${res.rows[0].current_user}`);
    console.log(`💾 Connected to database: ${res.rows[0].current_database}`);
    
    // Test table access
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`📊 Available tables: ${tablesRes.rows.map(r => r.table_name).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', {
      message: error.message,
      code: error.code,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });
    return false;
  }
};

const closePool = async () => {
  await pool.end();
  console.log('🔌 Database connection pool closed');
};

const setUserContext = async (client, userId) => {
  if (userId) {
    await client.query(`SET app.current_user_id = '${userId}'`);
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  setUserContext
};