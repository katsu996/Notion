"use client";

import { memo, useRef, type ClipboardEvent, type KeyboardEvent, type FormEvent, type FocusEvent } from "react";
import type { Block } from "@/lib/types";

export interface BlockHandlers {
  onInput: (e: FormEvent<HTMLDivElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLDivElement>) => void;
  onFocus: (e: FocusEvent<HTMLDivElement>) => void;
  onBlur: (e: FocusEvent<HTMLDivElement>) => void;
}

interface Props {
  block: Block;
  className: string;
  placeholder: string;
  handlers: BlockHandlers;
}

/**
 * 非制御 contentEditable。
 * マウント時の HTML を固定し、入力中の再レンダリングでキャレットが
 * 飛ばないようにする。プログラムから書き換えるときは block.v を
 * インクリメントして再マウントさせる(親側で key に v を含める)。
 */
export const EditableBlock = memo(
  function EditableBlock({ block, className, placeholder, handlers }: Props) {
    const initialHtml = useRef(block.html);
    return (
      <div
        data-block-id={block.id}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className={`block-content relative min-w-0 flex-1 ${className}`}
        data-placeholder={placeholder}
        onInput={handlers.onInput}
        onKeyDown={handlers.onKeyDown}
        onPaste={handlers.onPaste}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
        dangerouslySetInnerHTML={{ __html: initialHtml.current }}
      />
    );
  },
  (prev, next) =>
    prev.block.id === next.block.id &&
    (prev.block.v ?? 0) === (next.block.v ?? 0) &&
    prev.className === next.className &&
    prev.placeholder === next.placeholder &&
    prev.handlers === next.handlers
);
