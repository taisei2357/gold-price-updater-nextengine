import { NextRequest } from 'next/server'

/**
 * 手動でデータベーステーブルを作成
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Creating database tables manually...')
    
    // DATABASE_URLから接続情報を取得
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    
    // PostgreSQL クライアントを使用してテーブル作成
    const { Client } = require('pg')
    const client = new Client({ connectionString: databaseUrl })
    
    await client.connect()
    
    // NextEngineTokenテーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS nextengine_tokens (
        id SERIAL PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        client_id TEXT,
        client_secret TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // PriceHistoryテーブル作成（Prismaスキーマと一致）
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP UNIQUE NOT NULL,
        gold_price DECIMAL(10,2) NOT NULL,
        platinum_price DECIMAL(10,2),
        source TEXT DEFAULT 'tanaka',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // ExecutionLogテーブル作成（Prismaスキーマと一致）
    await client.query(`
      CREATE TABLE IF NOT EXISTS execution_logs (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP UNIQUE NOT NULL,
        status TEXT NOT NULL,
        updated_products INTEGER DEFAULT 0,
        gold_ratio DECIMAL(10,6),
        platinum_ratio DECIMAL(10,6),
        execution_reason TEXT NOT NULL,
        error_message TEXT,
        skipped_reason TEXT,
        duration_seconds DECIMAL(10,3),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // KeepAliveLogテーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS keepalive_logs (
        id SERIAL PRIMARY KEY,
        status TEXT NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    // PlatformSyncLogテーブル作成（新規追加）
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_sync_logs (
        id SERIAL PRIMARY KEY,
        synced_at TIMESTAMP NOT NULL,
        product_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    await client.end()
    
    console.log('✅ Database tables created successfully')
    
    return Response.json({
      success: true,
      message: 'Database tables created successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Database table creation failed:', error)
    return Response.json({
      success: false,
      error: 'Database table creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'Use POST method to run database migration',
    endpoints: {
      migrate: 'POST /api/db/migrate'
    }
  })
}