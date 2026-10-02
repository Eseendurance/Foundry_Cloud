// raw-engine/media/avatar.ts

export interface AvatarOptions {
  avatarStyle: 'corporate' | 'presenter' | 'minimal';
  text: string;
  voicePitch?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export class RawAvatarEngine {
  /**
   * Generates a clean, watermark-free avatar canvas animation loop using standard HTML5 Canvas & Web Speech.
   */
  static renderAvatarCanvas(
    canvas: HTMLCanvasElement,
    options: AvatarOptions,
    onFrameUpdate?: (talking: boolean) => void
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isTalking = false;
    let mouthOpening = 0;

    // Set high-res canvas dimensions
    canvas.width = options.canvasWidth || 1280;
    canvas.height = options.canvasHeight || 720;

    // Web Speech API for localized Speech Synthesis
    const utterance = new SpeechSynthesisUtterance(options.text);
    if (options.voicePitch) utterance.pitch = options.voicePitch;

    utterance.onstart = () => {
      isTalking = true;
    };
    utterance.onend = () => {
      isTalking = false;
      mouthOpening = 0;
    };

    // Render loop
    const draw = () => {
      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 50;

      // Render Avatar Head & Torso
      // Shoulders
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 220, 180, 120, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(centerX - 35, centerY, 70, 80);

      // Head
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 60, 110, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX - 40, centerY - 80, 12, 0, Math.PI * 2);
      ctx.arc(centerX + 40, centerY - 80, 12, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic Lip Sync Movement
      if (isTalking) {
        // Simulate viseme mouth movement while speaking
        mouthOpening = Math.sin(Date.now() / 80) * 18 + 20;
      } else {
        mouthOpening = 4;
      }

      // Mouth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 15, 30, mouthOpening, 0, 0, Math.PI * 2);
      ctx.fill();

      if (onFrameUpdate) onFrameUpdate(isTalking);
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return {
      startSpeech: () => window.speechSynthesis.speak(utterance),
      stopSpeech: () => {
        window.speechSynthesis.cancel();
        cancelAnimationFrame(animationFrameId);
      },
    };
  }
}