import type { AvatarExpression, AvatarState } from "@/types/avatar";

const positiveKeywords = ["好", "喜欢", "谢谢", "太棒", "开心", "喜欢你", "厉害"];
const frustratedKeywords = ["烦", "气死", "难受", "崩溃", "不行了", "糟糕", "好难"];
const explanationKeywords = ["怎么", "为什么", "原理", "解释", "教程", "步骤", "区别"];

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

export function deriveExpressionFromText(text: string, fallback: AvatarExpression = "neutral") {
  const normalized = text.trim();
  if (!normalized) return fallback;

  if (frustratedKeywords.some((keyword) => normalized.includes(keyword))) {
    return "comfort";
  }

  if (positiveKeywords.some((keyword) => normalized.includes(keyword))) {
    return "happy";
  }

  if (explanationKeywords.some((keyword) => normalized.includes(keyword))) {
    return "serious";
  }

  if (/[!?？！]{2,}/.test(normalized)) {
    return "surprised";
  }

  return fallback;
}
