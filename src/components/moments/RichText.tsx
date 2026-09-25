import { Fragment } from "react";

type Node = { type: string; text?: string; marks?: { type: string }[]; content?: Node[] };

function parse(body: string): Node | null {
  try {
    const j = JSON.parse(body);
    return j && typeof j === "object" && j.type === "doc" ? j : null;
  } catch {
    return null;
  }
}

/** Plain text of a moment body (for previews, search, empty checks). */
export function plainText(body: string): string {
  const doc = parse(body);
  if (!doc) return body;
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.text) out.push(n.text);
    n.content?.forEach(walk);
    if (n.type === "paragraph" || n.type === "listItem") out.push(" ");
  };
  walk(doc);
  return out.join("").replace(/\s+/g, " ").trim();
}

function renderText(n: Node, key: number) {
  let el: React.ReactNode = n.text;
  for (const m of n.marks ?? []) {
    if (m.type === "bold") el = <strong>{el}</strong>;
    else if (m.type === "italic") el = <em>{el}</em>;
    else if (m.type === "strike") el = <s>{el}</s>;
    else if (m.type === "code") el = <code className="font-mono text-[0.9em]">{el}</code>;
  }
  return <Fragment key={key}>{el}</Fragment>;
}

function renderNodes(nodes: Node[] = []): React.ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "text":
        return renderText(n, i);
      case "hardBreak":
        return <br key={i} />;
      case "paragraph":
        return <p key={i}>{renderNodes(n.content)}</p>;
      case "bulletList":
        return <ul key={i} className="list-disc pl-5">{renderNodes(n.content)}</ul>;
      case "orderedList":
        return <ol key={i} className="list-decimal pl-5">{renderNodes(n.content)}</ol>;
      case "listItem":
        return <li key={i}>{renderNodes(n.content)}</li>;
      case "blockquote":
        return <blockquote key={i} className="border-l-2 border-line pl-3 italic">{renderNodes(n.content)}</blockquote>;
      default:
        return <Fragment key={i}>{renderNodes(n.content)}</Fragment>;
    }
  });
}

export function RichText({ body, className }: { body: string; className?: string }) {
  const doc = parse(body);
  return (
    <div className={className}>
      {doc ? renderNodes(doc.content) : body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}
