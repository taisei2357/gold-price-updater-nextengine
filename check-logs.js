#!/usr/bin/env node
/**
 * NextEngineアプリの価格更新ログを確認するCLIツール
 * 本番環境のAPIエンドポイントにアクセスして最新のログ情報を取得
 */

const https = require('https');

// 環境設定
const APP_URL = process.env.VERCEL_URL || process.env.APP_URL || 'your-app-url.vercel.app';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: APP_URL.replace('https://', '').replace('http://', ''),
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'NextEngine-Log-Checker/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function checkLogs() {
  console.log('🔍 NextEngine価格更新ログを確認中...');
  console.log(`📡 接続先: ${APP_URL}`);
  console.log('');

  try {
    // 実行ログを取得
    console.log('📊 実行ログを取得中...');
    const logsResponse = await makeRequest('/api/debug/execution-logs');
    
    if (!logsResponse.success) {
      console.error('❌ ログ取得失敗:', logsResponse.error);
      return;
    }

    const logs = logsResponse.data;

    // 最後の成功した価格更新
    if (logs.lastSuccessfulUpdate) {
      console.log('✅ 最後の成功した価格更新:');
      console.log(`   日時: ${new Date(logs.lastSuccessfulUpdate.createdAt).toLocaleString('ja-JP')}`);
      console.log(`   更新商品数: ${logs.lastSuccessfulUpdate.updatedProducts}件`);
      console.log(`   実行理由: ${logs.lastSuccessfulUpdate.executionReason}`);
    } else {
      console.log('❌ 成功した価格更新が見つかりません');
    }

    console.log('');

    // 最新実行結果
    if (logs.lastExecution) {
      const status = logs.lastExecution.status;
      const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '⏸️';
      
      console.log(`${statusEmoji} 最新実行結果:`);
      console.log(`   日時: ${new Date(logs.lastExecution.createdAt).toLocaleString('ja-JP')}`);
      console.log(`   ステータス: ${status}`);
      console.log(`   更新商品数: ${logs.lastExecution.updatedProducts}件`);
      console.log(`   実行理由: ${logs.lastExecution.executionReason}`);
      
      if (logs.lastExecution.errorMessage) {
        console.log(`   エラー: ${logs.lastExecution.errorMessage}`);
      }
      
      if (logs.lastExecution.skippedReason) {
        console.log(`   スキップ理由: ${logs.lastExecution.skippedReason}`);
      }
    }

    console.log('');

    // 統計情報
    console.log('📈 統計情報:');
    console.log(`   総実行数: ${logs.stats.totalLogs}`);
    console.log(`   成功: ${logs.stats.successCount}`);
    console.log(`   失敗: ${logs.stats.failedCount}`);
    console.log(`   スキップ: ${logs.stats.skippedCount}`);

    console.log('');

    // 最近の実行履歴
    if (logs.recentLogs.length > 0) {
      console.log('📝 最近の実行履歴 (最新5件):');
      logs.recentLogs.slice(0, 5).forEach((log, index) => {
        const statusEmoji = log.status === 'SUCCESS' ? '✅' : log.status === 'FAILED' ? '❌' : '⏸️';
        console.log(`   ${index + 1}. ${statusEmoji} ${new Date(log.createdAt).toLocaleString('ja-JP')} - ${log.status} (${log.updatedProducts}件)`);
        if (log.errorMessage) {
          console.log(`      エラー: ${log.errorMessage}`);
        }
      });
    }

    // 価格履歴も確認
    console.log('');
    console.log('💰 価格履歴を確認中...');
    
    const priceResponse = await makeRequest('/api/debug/price-history');
    
    if (priceResponse.success && priceResponse.data.latestPrice) {
      const price = priceResponse.data.latestPrice;
      console.log('📈 最新価格情報:');
      console.log(`   取得日: ${new Date(price.date).toLocaleString('ja-JP')}`);
      console.log(`   金価格: ${price.goldPrice.toLocaleString()}円/g`);
      console.log(`   プラチナ価格: ${price.platinumPrice?.toLocaleString() || 'N/A'}円/g`);
      console.log(`   データソース: ${price.source}`);
      console.log(`   今日の価格: ${priceResponse.data.hasTodayPrice ? 'あり' : 'なし'}`);
    } else {
      console.log('❌ 価格履歴が見つかりません');
    }

    console.log('');
    console.log(`🔗 詳細な管理画面: https://${APP_URL}/admin`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.log('');
    console.log('💡 トラブルシューティング:');
    console.log('   1. APP_URLが正しく設定されているか確認');
    console.log('   2. アプリケーションが正常にデプロイされているか確認');
    console.log('   3. データベースが接続できるか確認');
  }
}

// 実行
if (require.main === module) {
  if (!APP_URL || APP_URL.includes('your-app-url')) {
    console.error('❌ APP_URLが設定されていません');
    console.log('使用方法: APP_URL=your-app-url.vercel.app node check-logs.js');
    console.log('または: export APP_URL=your-app-url.vercel.app');
    process.exit(1);
  }
  
  checkLogs();
}