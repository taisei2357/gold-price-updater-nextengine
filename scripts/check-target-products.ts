// scripts/check-target-products.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 個別システムと同じ条件（K18のみ対象）
function shouldUpdateProduct(productName: string): boolean {
  const startsWithTarget = productName.startsWith('【新品】')
  const containsK18 = productName.includes('K18')

  return startsWithTarget && containsK18
}

function getMetalType(productName: string): 'gold' | 'platinum' | null {
  if (!shouldUpdateProduct(productName)) return null

  // K18のみ対象（K24とPtは除外）
  if (productName.includes('K18')) return 'gold'

  return null
}

async function checkTargetProducts() {
  try {
    console.log("🔍 更新対象商品の確認\n");
    console.log("【対象条件】");
    console.log("1. 商品名が「【新品】」で始まる");
    console.log("2. かつ「K18」を含む（K24とPtは除外）\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // NextEngineのマスタートークンを確認
    const masterToken = await prisma.nextEngineToken.findUnique({
      where: { id: 1 },
    });

    if (!masterToken) {
      console.error("❌ マスタートークンが見つかりません");
      return;
    }

    console.log("📡 NextEngineから商品一覧を取得中...\n");

    let allProducts = [];
    let offset = 0;
    const limit = 200;

    // 全商品を取得
    while (true) {
      const params = new URLSearchParams({
        access_token: masterToken.accessToken,
        refresh_token: masterToken.refreshToken,
        fields: "goods_id,goods_name,goods_selling_price",
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(
        "https://api.next-engine.org/api_v1_master_goods/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const data = await response.json();

      // トークン更新
      if (data.access_token && data.refresh_token) {
        await prisma.nextEngineToken.update({
          where: { id: 1 },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          },
        });
      }

      if (data.result !== "success" || !data.data || data.data.length === 0) {
        break;
      }

      allProducts.push(...data.data);
      offset += limit;

      if (data.data.length < limit) break;
    }

    console.log(`📊 全商品数: ${allProducts.length}件\n`);

    // 対象商品をフィルタリング
    const targetProducts = allProducts.filter((p) =>
      shouldUpdateProduct(p.goods_name || "")
    );

    console.log(`✅ 更新対象商品数: ${targetProducts.length}件\n`);

    // 金属種別ごとに集計
    const goldProducts = targetProducts.filter(
      (p) => getMetalType(p.goods_name) === "gold"
    );
    const platinumProducts = targetProducts.filter(
      (p) => getMetalType(p.goods_name) === "platinum"
    );

    console.log(`🥇 金製品: ${goldProducts.length}件`);
    console.log(`🥈 プラチナ製品: ${platinumProducts.length}件\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("【更新対象商品の例】（最初の10件）\n");

    targetProducts.slice(0, 10).forEach((p, index) => {
      const metalType = getMetalType(p.goods_name);
      const icon = metalType === "gold" ? "🥇" : "🥈";
      console.log(
        `${index + 1}. ${icon} ${p.goods_name} - ¥${p.goods_selling_price}`
      );
    });

    if (targetProducts.length > 10) {
      console.log(`\n... 他 ${targetProducts.length - 10}件`);
    }
  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTargetProducts();
