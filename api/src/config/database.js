const { Pool } = require('pg');
require('dotenv').config();

// Validate critical environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Critical environment variables missing:', missingVars);
  console.error('📝 Please ensure these are set in your .env file');
  process.exit(1);
}

// Security: Validate JWT_SECRET is present and secure
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required for security');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters for security');
  process.exit(1);
}

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  acquireTimeoutMillis: 15000,
  application_name: 'trailguide-api',
  // Security: Enable SSL based on environment variable (respects DB_SSL_ENABLED)
  ssl: process.env.DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
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

// Enhanced query statistics tracking
let queryStats = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  totalDuration: 0,
  slowQueries: 0,
  avgDuration: 0,
  lastError: null,
  constraintViolations: 0
};

const query = async (text, params, retries = 3) => {
  const start = Date.now();
  const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  queryStats.totalQueries++;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [${queryId}] Database query attempt ${attempt}/${retries}`);
      }
      
      // Enhanced parameter validation
      if (params && Array.isArray(params)) {
        params.forEach((param, index) => {
          if (param === undefined) {
            throw new Error(`Parameter ${index + 1} is undefined`);
          }
        });
      }
      
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Update statistics
      queryStats.successfulQueries++;
      queryStats.totalDuration += duration;
      queryStats.avgDuration = queryStats.totalDuration / queryStats.successfulQueries;
      
      // Track slow queries
      if (duration > 500) { // Consider queries > 500ms as slow
        queryStats.slowQueries++;
        console.warn(`🐌 [${queryId}] Slow query (${duration}ms):`, text.substring(0, 150));
      } else if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`⚠️ [${queryId}] Moderate query (${duration}ms):`, text.substring(0, 100));
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [${queryId}] Query successful in ${duration}ms`);
      }
      
      return res;
      
    } catch (error) {
      const duration = Date.now() - start;
      queryStats.failedQueries++;
      queryStats.lastError = {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        timestamp: new Date(),
        query: text.substring(0, 150),
        duration
      };
      
      // Track constraint violations specifically
      if (error.code && error.code.startsWith('23')) {
        queryStats.constraintViolations++;
      }
      
      console.error(`💥 [${queryId}] Database query error (attempt ${attempt}/${retries}):`, {
        query: text.substring(0, 150),
        params: params ? JSON.stringify(params).substring(0, 200) : null,
        error: error.message,
        code: error.code,
        constraint: error.constraint,
        duration,
        host: dbConfig.host,
        port: dbConfig.port
      });
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Determine if error is retryable
      const nonRetryableErrors = ['23505', '23503', '23502', '23514']; // Constraint violations
      if (nonRetryableErrors.includes(error.code)) {
        console.log(`🚫 [${queryId}] Non-retryable error (${error.code}), failing immediately`);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`⏳ [${queryId}] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

const getClient = async (timeout = 5000) => {
  const start = Date.now();
  
  try {
    // Add timeout to client acquisition
    const clientPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Client acquisition timeout')), timeout);
    });
    
    const client = await Promise.race([clientPromise, timeoutPromise]);
    const acquisitionTime = Date.now() - start;
    
    if (acquisitionTime > 1000) {
      console.warn(`⏰ Slow client acquisition: ${acquisitionTime}ms`);
    }
    
    // Enhance client with monitoring
    const originalQuery = client.query.bind(client);
    client.query = async (...args) => {
      const queryStart = Date.now();
      try {
        const result = await originalQuery(...args);
        const queryDuration = Date.now() - queryStart;
        
        if (queryDuration > 1000) {
          console.warn(`🐌 Slow client query: ${queryDuration}ms`);
        }
        
        return result;
      } catch (error) {
        console.error('❌ Client query error:', {
          error: error.message,
          code: error.code,
          constraint: error.constraint
        });
        throw error;
      }
    };
    
    // Add client release monitoring
    const originalRelease = client.release.bind(client);
    client.release = (err) => {
      const totalClientTime = Date.now() - start;
      if (totalClientTime > 30000) {
        console.warn(`⏰ Long-lived client: ${totalClientTime}ms`);
      }
      return originalRelease(err);
    };
    
    return client;
    
  } catch (error) {
    console.error('❌ Failed to acquire database client:', {
      error: error.message,
      acquisitionTime: Date.now() - start,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    });
    throw error;
  }
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
    // Fixed: Use parameterized query to prevent SQL injection
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
  }
};

// Add database statistics and health monitoring
const getStats = () => {
  return {
    ...queryStats,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    },
    uptime: Date.now() - queryStats.startTime || Date.now(),
    successRate: queryStats.totalQueries > 0 ? 
      (queryStats.successfulQueries / queryStats.totalQueries * 100).toFixed(2) : 0,
    constraintViolationRate: queryStats.totalQueries > 0 ? 
      (queryStats.constraintViolations / queryStats.totalQueries * 100).toFixed(2) : 0
  };
};

const getHealthStatus = () => {
  const stats = getStats();
  const health = {
    status: 'healthy',
    checks: {
      connection: true,
      pool: true,
      performance: true
    },
    metrics: stats
  };
  
  // Check connection health
  if (stats.failedQueries / stats.totalQueries > 0.1) {
    health.status = 'unhealthy';
    health.checks.connection = false;
  }
  
  // Check pool health
  if (stats.pool.waiting > 5) {
    health.status = 'degraded';
    health.checks.pool = false;
  }
  
  // Check performance
  if (stats.avgDuration > 1000) {
    health.status = 'degraded';
    health.checks.performance = false;
  }
  
  return health;
};

// Initialize statistics start time
queryStats.startTime = Date.now();

// Periodic statistics logging (only in development)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getStats();
    if (stats.totalQueries > 0) {
      console.log('📊 Database Statistics:', {
        totalQueries: stats.totalQueries,
        successRate: `${stats.successRate}%`,
        avgDuration: `${stats.avgDuration.toFixed(1)}ms`,
        slowQueries: stats.slowQueries,
        constraintViolations: stats.constraintViolations,
        poolConnections: `${stats.pool.idle}/${stats.pool.total}`,
        uptime: `${(stats.uptime / 1000 / 60).toFixed(1)}min`
      });
    }
  }, 300000); // Log every 5 minutes
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
  setUserContext,
  getStats,
  getHealthStatus,
  queryStats
};