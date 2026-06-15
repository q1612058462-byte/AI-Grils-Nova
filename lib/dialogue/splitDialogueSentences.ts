const SENTENCE_END = /(?:[。！？!?…]+["'”’」』）】》]*|[.]+["'”’）】》]*(?=\s|$))/g;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)]|[（(]?\d+[）)])\s+/;
const HEADING = /^\s{0,3}#{1,6}\s+/;
const CODE_FENCE = /^\s*```/;

export function splitDialogueSentences(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const units: string[] = [];
  const lines = normalized.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let codeBlock: string[] = [];
  let insideCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const value = paragraph.map((line) => line.trim()).filter(Boolean).join("\n");
    paragraph = [];
    if (!value) return;

    if (value.includes("\n")) {
      units.push(value);
      return;
    }

    units.push(...splitPlainParagraph(value));
  };

  const flushList = () => {
    if (list.length === 0) return;
    units.push(list.join("\n"));
    list = [];
  };

  const flushCodeBlock = () => {
    if (codeBlock.length === 0) return;
    units.push(codeBlock.join("\n"));
    codeBlock = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (CODE_FENCE.test(line)) {
      flushParagraph();
      flushList();
      codeBlock.push(line);
      insideCodeBlock = !insideCodeBlock;
      if (!insideCodeBlock) flushCodeBlock();
      continue;
    }

    if (insideCodeBlock) {
      codeBlock.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (LIST_ITEM.test(line)) {
      flushParagraph();
      list.push(line.trim());
      continue;
    }

    flushList();
    if (HEADING.test(line)) {
      flushParagraph();
      units.push(line.trim());
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushCodeBlock();

  return units;
}

function splitPlainParagraph(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (const match of text.matchAll(SENTENCE_END)) {
    const end = (match.index ?? 0) + match[0].length;
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
  }

  const remainder = text.slice(start).trim();
  if (remainder) {
    sentences.push(
      ...remainder
        .split(/(?<=[；;])\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
    );
  }

  return sentences;
}

export function getSentenceDisplayDuration(sentence: string): number {
  const cjkCount = (sentence.match(/[\u3400-\u9fff]/g) ?? []).length;
  const otherCount = sentence.length - cjkCount;
  return Math.min(9000, Math.max(2200, 1200 + cjkCount * 150 + otherCount * 70));
}
