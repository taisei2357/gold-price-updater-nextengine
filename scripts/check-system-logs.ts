import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkLogs() {
  try {
    console.log("📋 ネクストエンジンシステムの実行履歴（最新10件）\n");

    const logs = await prisma.executionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (logs.length === 0) {
      console.log("実行履歴がありません");
      return;
    }

    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${new Date(log.date).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
      console.log(`   ステータス: ${log.status}`);
      console.log(`   更新商品数: ${log.updatedProducts}件`);
      console.log(`   金変動率: ${log.goldRatio ? (log.goldRatio * 100).toFixed(2) + "%" : "N/A"}`);
      console.log(`   プラチナ変動率: ${log.platinumRatio ? (log.platinumRatio * 100).toFixed(2) + "%" : "N/A"}`);
      console.log(`   実行理由: ${log.executionReason}`);
      if (log.skippedReason) {
        console.log(`   スキップ理由: ${log.skippedReason}`);
      }
      if (log.errorMessage) {
        console.log(`   エラー: ${log.errorMessage}`);
      }
      console.log("");
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLog = logs.find((log) => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (todayLog) {
      console.log("✅ 本日の価格更新: 実行済み");
      console.log(`   ステータス: ${todayLog.status}`);
      console.log(`   更新商品数: ${todayLog.updatedProducts}件`);
    } else {
      console.log("❌ 本日の価格更新: 未実行");
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayLog = logs.find((log) => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === yesterday.getTime();
    });

    console.log("");
    if (yesterdayLog) {
      console.log("✅ 昨日の価格更新: 実行済み");
      console.log(`   ステータス: ${yesterdayLog.status}`);
      console.log(`   更新商品数: ${yesterdayLog.updatedProducts}件`);
    } else {
      console.log("❌ 昨日の価格更新: 未実行");
    }
  } catch (error) {
    console.error("エラー:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
