import type { AvatarExpression, AvatarState } from "@/types/avatar";

const positiveKeywords = [
  "好",
  "喜欢",
  "谢谢",
  "太棒",
  "开心",
  "厉害",
  "glad",
  "great",
  "happy",
  "wonderful",
];
const frustratedKeywords = [
  "烦",
  "气死",
  "难受",
  "崩溃",
  "糟糕",
  "好难",
  "sad",
  "sorry",
  "upset",
  "difficult",
];
const explanationKeywords = [
  "怎么",
  "为什么",
  "原理",
  "解释",
  "教程",
  "步骤",
  "区别",
  "how",
  "why",
  "explain",
  "steps",
];

const expressionAliases: Array<{
  expression: AvatarExpression;
  aliases: string[];
  emojis: string[];
}> = [
  {
    expression: "happy",
    aliases: ["happy", "joy", "excited", "开心", "高兴", "大笑", "兴奋"],
    emojis: ["😀", "😃", "😄", "😁", "🥰", "😍", "🎉"],
  },
  {
    expression: "smile",
    aliases: ["smile", "gentle", "warm", "微笑", "浅笑", "温柔", "眨眼"],
    emojis: ["🙂", "😊", "😉", "☺️"],
  },
  {
    expression: "comfort",
    aliases: ["comfort", "sad", "sorry", "sympathy", "安慰", "难过", "伤心", "心疼", "抱抱"],
    emojis: ["😢", "😭", "🥺", "😞", "😔", "💔", "🫂"],
  },
  {
    expression: "surprised",
    aliases: ["surprised", "shock", "amazed", "惊讶", "震惊", "吃惊"],
    emojis: ["😮", "😲", "😯", "🤯", "😳"],
  },
  {
    expression: "serious",
    aliases: ["serious", "angry", "focused", "严肃", "生气", "认真", "思考"],
    emojis: ["😠", "😡", "🤔", "🧐", "😤"],
  },
  {
    expression: "neutral",
    aliases: ["neutral", "calm", "平静", "自然", "中性"],
    emojis: ["😐", "😌"],
  },
];

const emojiPattern = new RegExp(
  expressionAliases.flatMap((item) => item.emojis).map(escapeRegExp).join("|"),
  "gu"
);

const stageDirectionPattern =
  /(?:\[(?:expression|emotion|表情)\s*[:：]\s*([^\]]+)\]|<(?:expression\s*[:=]\s*)?([^>]+)>|[（(【[*]\s*(微笑|浅笑|温柔|眨眼|开心|高兴|大笑|兴奋|安慰|难过|伤心|心疼|抱抱|惊讶|震惊|吃惊|严肃|生气|认真|思考|smiles?|happy|excited|comfort(?:ing)?|sad|surprised|shocked|serious|angry|thinking)\s*[）)】\]*])/giu;

export function deriveExpressionFromState(state: AvatarState): AvatarExpression {
  switch (state) {
    case "listening":
      return "smile";
    case "thinking":
      return "serious";
    case "speaking":
      return "neutral";
    default:
      return "neutral";
  }
}

export function deriveExpressionFromText(
  text: string,
  fallback: AvatarExpression = "neutral"
) {
  return parseAvatarResponse(text, fallback).expression;
}

export function parseAvatarResponse(
  text: string,
  fallback: AvatarExpression = "neutral"
): {
  text: string;
  expression: AvatarExpression;
  hasExpressionCue: boolean;
} {
  let expression = findExplicitExpression(text) ?? fallback;
  const hasExpressionCue = expression !== fallback || hasKnownEmoji(text);
  let cleaned = text
    .replace(/^\s*\[(?:expression|emotion|表情)\s*[:：][^\]\n]*(?:\]|$)/iu, "")
    .replace(stageDirectionPattern, "")
    .replace(emojiPattern, "")
    .replace(/[ \t]+([，。！？,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!hasExpressionCue) {
    const normalized = text.trim().toLowerCase();
    if (frustratedKeywords.some((keyword) => normalized.includes(keyword))) {
      expression = "comfort";
    } else if (positiveKeywords.some((keyword) => normalized.includes(keyword))) {
      expression = "happy";
    } else if (explanationKeywords.some((keyword) => normalized.includes(keyword))) {
      expression = "serious";
    } else if (/[!?？！]{2,}/.test(normalized)) {
      expression = "surprised";
    }
  }

  cleaned = cleaned.replace(/^[，。！？,.!?\s]+|[，,\s]+$/g, "").trim();
  return { text: cleaned, expression, hasExpressionCue };
}

export function getSpeakableText(text: string) {
  return parseAvatarResponse(text).text
    .replace(/^[.…]+$|^\s*$/, "")
    .trim();
}

function findExplicitExpression(text: string): AvatarExpression | null {
  for (const item of expressionAliases) {
    if (item.emojis.some((emoji) => text.includes(emoji))) return item.expression;
  }

  const matches = Array.from(text.matchAll(stageDirectionPattern));
  for (const match of matches) {
    const cue = (match[1] ?? match[2] ?? match[3] ?? "").toLowerCase();
    for (const item of expressionAliases) {
      if (item.aliases.some((alias) => cue.includes(alias))) return item.expression;
    }
  }
  return null;
}

function hasKnownEmoji(text: string) {
  emojiPattern.lastIndex = 0;
  return emojiPattern.test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
