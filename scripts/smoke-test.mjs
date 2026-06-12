/* 静的エクスポートされたアプリのスモークテスト(Playwright) */
import { chromium } from "playwright";

const BASE = "http://localhost:3100";
let failures = 0;

function check(name, cond) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => {
  failures++;
  console.log(`  ✗ ページエラー: ${e.message}`);
});

console.log("1. 初期表示");
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
check(
  "ウェルカムページのタイトルが表示される",
  await page.locator("h1", { hasText: "はじめに" }).count() > 0
);
check(
  "サイドバーが表示される",
  await page.locator("text=マイワークスペース").count() > 0
);
check(
  "シードブロックが表示される",
  await page.locator('[data-block-id]').count() > 10
);

console.log("2. ブロック編集");
const firstPara = page.locator('[data-block-id]').nth(1);
await firstPara.click();
await page.keyboard.press("End");
await page.keyboard.press("Enter");
await page.keyboard.type("新しいテスト段落です");
await page.waitForTimeout(400);
check(
  "Enter で新ブロックを作成して入力できる",
  await page.locator("text=新しいテスト段落です").count() > 0
);

console.log("3. スラッシュメニュー");
await page.keyboard.press("Enter");
await page.keyboard.type("/");
await page.waitForTimeout(300);
check(
  "スラッシュメニューが開く",
  await page.locator("text=ベーシック").count() > 0
);
await page.keyboard.type("みだし");
await page.waitForTimeout(300);
check(
  "クエリでフィルタされる",
  await page.locator("button", { hasText: "見出し1" }).count() > 0
);
await page.keyboard.press("Enter");
await page.keyboard.type("テスト見出し");
await page.waitForTimeout(400);
check(
  "見出しブロックに変換される",
  await page.locator('[data-block-id].font-bold', { hasText: "テスト見出し" }).count() > 0
);

console.log("4. Markdown ショートカット");
await page.keyboard.press("Enter");
await page.keyboard.type("- ");
await page.keyboard.type("箇条書きアイテム");
await page.waitForTimeout(400);
const bulletRow = page.locator("div.group", { hasText: "箇条書きアイテム" }).last();
check(
  "「- 」で箇条書きになる",
  (await bulletRow.locator("span", { hasText: "•" }).count()) > 0
);

console.log("5. LocalStorage 永続化");
await page.waitForTimeout(800); // デバウンス保存を待つ
const saved = await page.evaluate(() =>
  localStorage.getItem("notion-clone:data:v1")
);
check("LocalStorage に保存される", !!saved && saved.includes("新しいテスト段落です"));

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
check(
  "リロード後もデータが残る",
  await page.locator("text=新しいテスト段落です").count() > 0
);

console.log("6. 新規ページ作成と検索");
await page.locator("button", { hasText: "新規ページ" }).first().click();
await page.waitForTimeout(500);
await page.locator("h1[contenteditable]").click();
await page.keyboard.type("プロジェクト計画");
await page.waitForTimeout(600);
check(
  "新規ページのタイトルを入力できる",
  (await page.locator("aside").textContent()).includes("プロジェクト計画")
);
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.keyboard.type("はじめに");
await page.waitForTimeout(400);
check(
  "検索モーダルでページが見つかる",
  await page.locator("div.fixed button", { hasText: "はじめに" }).count() > 0
);
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check(
  "検索結果からページを開ける",
  await page.locator("h1", { hasText: "はじめに" }).count() > 0
);

console.log("7. ダークモード");
await page.locator("button", { hasText: "ダークモード" }).click();
await page.waitForTimeout(300);
check(
  "ダークモードが有効になる",
  await page.evaluate(() => document.documentElement.classList.contains("dark"))
);

console.log("8. モバイルビューポート");
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.waitForTimeout(800);
check(
  "モバイルではサイドバーが閉じている",
  (await mobile.locator("text=マイワークスペース").count()) === 0
);
await mobile.locator('button[aria-label="サイドバーを開く"]').click();
await mobile.waitForTimeout(300);
check(
  "ハンバーガーでサイドバーが開く",
  await mobile.locator("text=マイワークスペース").count() > 0
);

await page.screenshot({ path: "/tmp/desktop.png", fullPage: false });
await mobile.screenshot({ path: "/tmp/mobile.png" });

await browser.close();
console.log(failures === 0 ? "\nすべて成功" : `\n失敗: ${failures} 件`);
process.exit(failures === 0 ? 0 : 1);
