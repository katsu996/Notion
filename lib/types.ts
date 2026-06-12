export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bulleted"
  | "numbered"
  | "toggle"
  | "quote"
  | "callout"
  | "code"
  | "divider"
  | "page";

export interface Block {
  id: string;
  type: BlockType;
  /** インライン HTML(太字・斜体など) */
  html: string;
  /** インデントレベル 0..4 */
  indent: number;
  /** ToDo のチェック状態 */
  checked?: boolean;
  /** トグルの折りたたみ状態 */
  collapsed?: boolean;
  /** page ブロックが参照するページ ID */
  pageId?: string;
  /**
   * バージョン。プログラム側からコンテンツを書き換えたとき(分割・結合など)に
   * インクリメントし、contentEditable を再マウントさせるために使う。
   */
  v?: number;
}

export interface Page {
  id: string;
  title: string;
  icon: string;
  cover: string | null;
  blocks: Block[];
  parentId: string | null;
  childIds: string[];
  favorite: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  pages: Record<string, Page>;
  rootIds: string[];
}
