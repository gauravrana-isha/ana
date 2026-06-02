"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TiptapEditorProps {
  content: string;
  onChange: (json: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Write…",
  minHeight = "160px",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: parseContent(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "outline-none font-serif text-[17px] leading-[1.65] text-ink prose prose-invert max-w-none",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content) {
      const parsed = parseContent(content);
      const current = JSON.stringify(editor.getJSON());
      const incoming = JSON.stringify(parsed);
      if (current !== incoming) {
        editor.commands.setContent(parsed);
      }
    }
  }, [content, editor]);

  return (
    <div className="bg-surface-2 rounded-[10px] p-[11px_13px] border border-line">
      <EditorContent editor={editor} />
      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--ink-soft);
          opacity: 0.7;
          font-style: italic;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap {
          min-height: ${minHeight};
        }
        .tiptap p {
          margin-bottom: 0.5em;
        }
        .tiptap ul, .tiptap ol {
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }
        .tiptap blockquote {
          border-left: 2px solid var(--accent);
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}

function parseContent(content: string) {
  if (!content) return "";
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}
