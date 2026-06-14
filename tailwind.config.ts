import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(110, 231, 183, 0.14), 0 24px 80px rgba(6, 10, 24, 0.45)",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -6px, 0)" },
        },
        patrolIdle: {
          "0%": { transform: "translate3d(-6px, 0, 0)" },
          "25%": { transform: "translate3d(10px, -2px, 0)" },
          "50%": { transform: "translate3d(22px, 0, 0)" },
          "75%": { transform: "translate3d(8px, -1px, 0)" },
          "100%": { transform: "translate3d(-6px, 0, 0)" },
        },
        patrolListen: {
          "0%": { transform: "translate3d(-18px, 0, 0)" },
          "20%": { transform: "translate3d(12px, -3px, 0)" },
          "50%": { transform: "translate3d(30px, 0, 0)" },
          "80%": { transform: "translate3d(4px, -2px, 0)" },
          "100%": { transform: "translate3d(-18px, 0, 0)" },
        },
        patrolSpeak: {
          "0%": { transform: "translate3d(-24px, 0, 0)" },
          "25%": { transform: "translate3d(16px, -4px, 0)" },
          "50%": { transform: "translate3d(36px, 0, 0)" },
          "75%": { transform: "translate3d(14px, -3px, 0)" },
          "100%": { transform: "translate3d(-24px, 0, 0)" },
        },
        bobSoft: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -4px, 0)" },
        },
        bobTalk: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -7px, 0)" },
        },
        blink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "94%, 96%": { transform: "scaleY(0.08)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.016)" },
        },
      },
      animation: {
        drift: "drift 7s ease-in-out infinite",
        "patrol-idle": "patrolIdle 9s ease-in-out infinite",
        "patrol-listen": "patrolListen 6.5s ease-in-out infinite",
        "patrol-speak": "patrolSpeak 4.8s ease-in-out infinite",
        "bob-soft": "bobSoft 3.6s ease-in-out infinite",
        "bob-talk": "bobTalk 1.15s ease-in-out infinite",
        blink: "blink 6.5s ease-in-out infinite",
        breathe: "breathe 4.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
