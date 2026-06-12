/* PR 添付用スクリーンショットの撮影 */
import { chromium } from "playwright";

const BASE = "http://localhost:3200/Notion/";
const browser = await chromium.launch();

/* 1. デスクトップ(ライト)— ウェルカムページ */
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
await desktop.goto(BASE, { waitUntil: "networkidle" });
await desktop.waitForTimeout(1000);
await desktop.screenshot({ path: "/workspace/shots/01-desktop-light.png" });

/* 2. スラッシュメニュー */
const blocks = desktop.locator("[data-block-id]");
await blocks.nth(1).click();
await desktop.keyboard.press("End");
await desktop.keyboard.press("Enter");
await desktop.keyboard.type("/");
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: "/workspace/shots/02-slash-menu.png" });
await desktop.keyboard.press("Escape");
await desktop.keyboard.press("Backspace");

/* 3. 検索モーダル */
await desktop.keyboard.press("Control+k");
await desktop.waitForTimeout(300);
await desktop.keyboard.type("はじめ");
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: "/workspace/shots/03-search.png" });
await desktop.keyboard.press("Escape");

/* 4. ダークモード */
await desktop.locator("button", { hasText: "ダークモード" }).click();
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: "/workspace/shots/04-dark-mode.png" });
await desktop.close();

/* 5. モバイル(エディタ表示) */
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
});
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: "/workspace/shots/05-mobile-editor.png" });

/* 6. モバイル(ドロワーサイドバー) */
await mobile.locator('button[aria-label="サイドバーを開く"]').click();
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/shots/06-mobile-sidebar.png" });
await mobile.close();

await browser.close();
console.log("完了");
