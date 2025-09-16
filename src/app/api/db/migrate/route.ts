import { NextRequest } from 'next/server'

/**
 * データベースマイグレーション実行
 */
export async function POST(request: NextRequest) {
  try {
    // Prisma スキーマをデータベースに push
    const { execSync } = require('child_process')
    
    console.log('🚀 Starting database migration...')
    
    // Prisma generate (クライアント生成)
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    // Prisma db push (スキーマをDBに適用)
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    console.log('✅ Database migration completed successfully')
    
    return Response.json({
      success: true,
      message: 'Database migration completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Database migration failed:', error)
    return Response.json({
      success: false,
      error: 'Database migration failed',
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