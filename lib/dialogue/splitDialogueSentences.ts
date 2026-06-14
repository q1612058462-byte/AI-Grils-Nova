const SENTENCE_END = /(?:[。！？!?…]+["'”’」』）】》]*|[.]+["'”’）】》]*(?=\s|$))/g;

export function splitDialogueSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let start = 0;

  for (const match of normalized.matchAll(SENTENCE_END)) {
    const end = (match.index ?? 0) + match[0].length;
    const sentence = normalized.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
  }

  const remainder = normalized.slice(start).trim();
  if (remainder) {
    const clauses = remainder
      .split(/(?<=[；;])\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    sentences.push(...clauses);
  }

  return sentences;
}

export function getSentenceDisplayDuration(sentence: string): number {
  const cjkCount = (sentence.match(/[\u3400-\u9fff]/g) ?? []).length;
  const otherCount = sentence.length - cjkCount;
  return Math.min(9000, Math.max(2200, 1200 + cjkCount * 150 + otherCount * 70));
}
