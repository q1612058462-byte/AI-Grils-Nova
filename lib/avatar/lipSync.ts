type LipSyncCleanup = () => void;

export function startFakeLipSync(callback: (value: number) => void): LipSyncCleanup {
  let frameId = 0;
  const start = performance.now();
  let active = true;

  const tick = (now: number) => {
    if (!active) return;
    const elapsed = (now - start) / 1000;
    const wave = Math.sin(elapsed * 9.2) * 0.5 + Math.sin(elapsed * 15.5) * 0.25;
    const flutter = (Math.sin(elapsed * 3.7) + 1) * 0.1;
    const value = Math.max(0.12, Math.min(1, 0.35 + wave * 0.22 + flutter * 0.18));
    callback(value);
    frameId = window.requestAnimationFrame(tick);
  };

  frameId = window.requestAnimationFrame(tick);

  return () => {
    active = false;
    window.cancelAnimationFrame(frameId);
    callback(0);
  };
}

export function startAnalyserLipSync(
  analyser: AnalyserNode,
  callback: (value: number) => void
): LipSyncCleanup {
  const buffer = new Uint8Array(analyser.fftSize);
  let frameId = 0;
  let active = true;

  const tick = () => {
    if (!active) return;
    analyser.getByteTimeDomainData(buffer);
    let sumSquares = 0;

    for (let i = 0; i < buffer.length; i += 1) {
      const centered = (buffer[i] - 128) / 128;
      sumSquares += centered * centered;
    }

    const rms = Math.sqrt(sumSquares / buffer.length);
    callback(Math.min(1, Math.max(0, rms * 2.8)));
    frameId = window.requestAnimationFrame(tick);
  };

  frameId = window.requestAnimationFrame(tick);

  return () => {
    active = false;
    window.cancelAnimationFrame(frameId);
    callback(0);
  };
}
