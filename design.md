You are Codex acting as a senior full-stack engineer.

Build an MVP web application for an AI digital human / avatar product.

Product goal:
Create a browser-based AI avatar named “Nora”. Nora should appear on screen, listen to the user through the microphone, respond with AI-generated voice, and show simple facial expressions / interaction states. This is an MVP, not a production-grade avatar engine.

Core experience:
1. User opens a web page.
2. User sees a digital human avatar area.
3. User can press a microphone button and speak.
4. Nora listens, thinks, and replies.
5. Nora has visible states:
   - idle
   - listening
   - thinking
   - speaking
   - happy
   - serious
   - comfort
6. Nora’s mouth should animate while speaking.
7. Nora’s response should be concise, warm, and personality-consistent.

Tech stack:
- Next.js with TypeScript
- React components
- Tailwind CSS for styling
- Server route for creating a realtime AI session
- OpenAI Realtime API via WebRTC if possible
- A mock fallback mode if realtime credentials are missing
- No database in v1
- No authentication in v1
- No payment system
- No multi-user system

Important constraint:
Do not overbuild. Make the first version clean, simple, and easy to extend.

Environment variables:
- OPENAI_API_KEY
- OPENAI_REALTIME_MODEL, optional; default to a configurable realtime-capable model string
- NEXT_PUBLIC_USE_MOCK_AVATAR, optional boolean

Application structure:

app/
  page.tsx
  layout.tsx
  api/
    realtime/
      session/
        route.ts

components/
  AvatarStage.tsx
  AvatarFace.tsx
  MicButton.tsx
  TranscriptPanel.tsx
  StatusBadge.tsx

lib/
  avatar/
    expressionState.ts
    expressionMapper.ts
    lipSync.ts
  realtime/
    createRealtimeConnection.ts
    mockRealtimeConnection.ts
  prompts/
    noraSystemPrompt.ts

types/
  avatar.ts
  realtime.ts

styles/
  globals.css

Functional requirements:

1. Main page layout
Create a single-page UI with:
- Center avatar stage
- Bottom microphone control
- Right-side transcript panel
- Small status badge showing current avatar state
- Clean dark UI
- Product title: “Nora — AI Digital Human MVP”

2. Avatar rendering
For v1, do not require a real Live2D asset.
Implement a lightweight placeholder avatar using React/CSS/SVG/canvas:
- Face circle or stylized character
- Eyes
- Mouth
- Simple expression changes
- Idle breathing animation
- Blinking animation
- Mouth open/close animation while speaking

The placeholder should be designed so it can later be replaced by Live2D or VRM.

Create an AvatarStage component that receives:
- state: AvatarState
- mouthOpen: number from 0 to 1
- expression: AvatarExpression

AvatarState enum:
- idle
- listening
- thinking
- speaking

AvatarExpression enum:
- neutral
- smile
- happy
- serious
- comfort
- surprised

3. Lip sync
Implement simple amplitude-based fake lip sync for v1:
- While Nora is speaking, animate mouthOpen using a periodic function or audio analyser if available.
- If real audio analyser is too complex, use a simple requestAnimationFrame loop that varies mouthOpen while speaking.
- Stop mouth movement when speaking ends.

Create lib/avatar/lipSync.ts with:
- startFakeLipSync(callback: (value: number) => void): () => void
- optional support for AnalyserNode if audio element is available

4. Personality prompt
Create lib/prompts/noraSystemPrompt.ts.

Nora’s personality:
- Warm
- Intelligent
- Slightly playful
- Concise
- Not corporate
- Not overly dramatic
- Does not pretend to be human
- Speaks like a calm AI companion with a visible avatar

Nora response rules:
- Keep replies short by default.
- Use natural spoken language.
- Avoid long markdown.
- When user seems frustrated, use comfort expression.
- When explaining something, use serious expression.
- When user says something positive, use happy expression.

The model should be instructed to return structured data when possible:
{
  "reply": string,
  "expression": "neutral" | "smile" | "happy" | "serious" | "comfort" | "surprised"
}

5. Mock mode
Implement a mock realtime connection first, so the app works without API credentials.

Mock behavior:
- User clicks microphone button.
- Simulate listening for 2 seconds.
- Then show a fake user transcript: “我今天想试试和数字人对话。”
- Then Nora enters thinking state.
- Then Nora replies with text:
  “当然可以。我在这里，你可以直接和我说话，不用再面对一个冷冰冰的聊天框。”
- Nora enters speaking state and fake lip sync plays for several seconds.
- Then return to idle.

This mock mode must be the default if OPENAI_API_KEY is missing.

6. OpenAI Realtime route
Create app/api/realtime/session/route.ts.

The route should:
- Validate OPENAI_API_KEY exists.
- Create an ephemeral realtime session using the server-side API key.
- Return the ephemeral session data to the browser.
- Never expose OPENAI_API_KEY to the client.

Write the code defensively:
- If the API request fails, return a meaningful JSON error.
- Keep the implementation isolated so it can be updated easily if the realtime API shape changes.

7. Realtime client
Create lib/realtime/createRealtimeConnection.ts.

Implement a browser-side connection manager with this interface:

type RealtimeEventHandlers = {
  onUserTranscript?: (text: string) => void
  onAssistantTranscript?: (text: string) => void
  onAssistantAudioStart?: () => void
  onAssistantAudioEnd?: () => void
  onStateChange?: (state: AvatarState) => void
  onExpressionChange?: (expression: AvatarExpression) => void
  onError?: (error: Error) => void
}

type RealtimeConnection = {
  connect: () => Promise<void>
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  disconnect: () => void
}

If exact WebRTC API details are uncertain, implement a clean skeleton with TODO comments and preserve mock mode as fully working.

8. UI interaction states
MicButton behavior:
- idle: button says “按住说话” or “Start Talking”
- listening: button says “Listening…”
- thinking: button disabled, says “Thinking…”
- speaking: button says “Nora is speaking…”

Avatar state transitions:
- idle → listening when user starts speaking
- listening → thinking when user stops speaking
- thinking → speaking when assistant response starts
- speaking → idle when response ends

9. Transcript panel
Show messages:
- User messages aligned right
- Nora messages aligned left
- Each message has speaker label
- Keep UI minimal

10. Error handling
If realtime connection fails:
- Show a visible error toast or inline message
- Fall back to mock mode
- Do not crash the app

11. Acceptance criteria
The MVP is successful when:
- `npm install` works
- `npm run dev` works
- The home page loads
- The avatar is visible
- Clicking the mic button triggers a full mock conversation
- Avatar changes state from listening to thinking to speaking to idle
- Mouth animation runs while Nora speaks
- Transcript panel updates
- Code is typed, organized, and easy to extend

12. Do not implement
Do not implement:
- Real Live2D model loading yet
- Real VRM model loading yet
- User accounts
- Database
- Memory system
- Multi-character creation
- Payments
- Admin dashboard
- Complex animation engine

13. Add extension notes
At the end, add a README.md explaining:
- How to run locally
- Environment variables
- How mock mode works
- Where to replace placeholder avatar with Live2D
- Where to replace placeholder avatar with VRM / three-vrm
- Where to improve lip sync
- Where to connect real OpenAI Realtime WebRTC flow