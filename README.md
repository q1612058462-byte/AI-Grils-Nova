# Nora AI Avatar

An interactive browser-based AI avatar built with Next.js, React Three Fiber, Three.js, and VRM.

Nora supports OpenAI-compatible chat APIs, streaming subtitles, browser speech input and output,
avatar expressions, lip sync, multiple conversations, selectable scenes, and configurable VRM
characters.

## Features

- OpenAI-compatible streaming chat, including DeepSeek-compatible endpoints
- Multiple local conversations with independent model context
- Full-screen VRM scene with expression and lip-sync feedback
- Browser speech recognition and text-to-speech
- Sentence-by-sentence automatic or manual subtitle playback
- English and Chinese interface
- 3D, HDRI, PBR, and illustrated background presets
- Selectable system voices, speech rate, and pitch
- Runtime model API settings
- Optional camera rotation, panning, pose debugging, and motion reference tools

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Three.js and React Three Fiber
- `@pixiv/three-vrm`

## Quick Start

Requirements:

- Node.js 20 or newer
- npm
- A modern Chromium browser is recommended for speech recognition

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

On Windows PowerShell, replace the copy command with:

```powershell
Copy-Item .env.example .env.local
```

## Model API Configuration

Configure an OpenAI-compatible Chat Completions endpoint in `.env.local`:

```env
OPENAI_COMPATIBLE_API_KEY=your-api-key
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_MODEL=deepseek-chat
```

The API key remains on the Next.js server. The in-page settings panel can also override the base
URL, model, API key, temperature, top-p, and maximum output tokens. Browser overrides are stored in
localStorage, so server-side environment variables are recommended on shared devices.

Legacy `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` variables remain supported as fallbacks.

## Avatar Configuration

The default VRM file is:

```text
public/models/nora.vrm
```

You can replace it or add more character options:

```env
NEXT_PUBLIC_VRM_MODEL_URL=/models/nora.vrm
NEXT_PUBLIC_VRM_MODEL_NAME_2=Second Avatar
NEXT_PUBLIC_VRM_MODEL_URL_2=/models/second-avatar.vrm
NEXT_PUBLIC_VRM_MODEL_NAME_3=Third Avatar
NEXT_PUBLIC_VRM_MODEL_URL_3=/models/third-avatar.vrm
```

Additional VRM files should contain the standard VRM expression presets, especially blink and
mouth shapes, for complete animation support.

The included `nora.vrm` was introduced as a copy of VRoid Studio's `AvatarSample_A`. Review the
[sample repository](https://github.com/madjin/vrm-samples) and
[VRoid Studio guidelines](https://vroid.pixiv.help/hc/en-us/articles/4402394424089) before
redistributing or commercially using the model.

## Camera And Debug Controls

Normal use disables camera rotation, camera panning, pose debugging, and the motion library.

```env
NEXT_PUBLIC_ENABLE_CAMERA_ROTATION=false
NEXT_PUBLIC_CAMERA_ZOOM_RATIO=1.6
NEXT_PUBLIC_ENABLE_CAMERA_PAN=false
NEXT_PUBLIC_ENABLE_POSE_DEBUG=false
NEXT_PUBLIC_ENABLE_MOTION_LIBRARY=false
```

`NEXT_PUBLIC_CAMERA_ZOOM_RATIO` is clamped between `1.05` and `3`.

Restart the development server after changing any `NEXT_PUBLIC_*` variable.

## Voice Support

- Speech recognition uses the browser Web Speech API.
- Speech output uses `speechSynthesis`.
- Available voices depend on the operating system and browser.
- Microsoft Edge commonly provides additional online Chinese voices.

Microphone access generally requires HTTPS outside localhost.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run start
```

## Deployment

The project can be deployed to Vercel or any Node.js host capable of running Next.js.

For Vercel:

1. Import the GitHub repository.
2. Add the required environment variables.
3. Deploy with the default Next.js settings.

Do not commit `.env.local` or real API keys.

## Asset Licenses

Code is licensed under the MIT License. Assets are licensed separately:

- Poly Haven and ambientCG scene assets are CC0. See
  [`public/assets/ASSET_LICENSES.md`](public/assets/ASSET_LICENSES.md).
- The included VRM model remains subject to its original model license.
- Project-specific illustrated backgrounds and design reference images are not automatically
  covered by the MIT License.

Review [`NOTICE.md`](NOTICE.md) before redistributing the repository or replacing assets.

## Project Structure

```text
app/                 Next.js pages and API routes
components/          Scene, avatar, subtitles, drawers, and settings UI
lib/avatar/          Pose, expression, appearance, and lip-sync logic
lib/dialogue/        Sentence playback helpers
lib/model/           Model API settings
lib/voice/           Browser speech adapters
public/assets/       CC0 HDRI, PBR, and GLB assets
public/backgrounds/  Illustrated background presets
public/models/       VRM characters
types/               Shared TypeScript types
```

## Security

- Keep API keys in `.env.local` or the deployment platform's secret manager.
- Never expose provider keys through `NEXT_PUBLIC_*` variables.
- The model proxy only accepts HTTPS base URLs, except local development endpoints.
