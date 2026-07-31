import { useEffect, useRef, useState } from 'react';
import { INK, PAPER } from '../data';

/**
 * Live camera capture.
 *
 * `getUserMedia` is preferred over `<input type="file" capture>` because it
 * keeps the rep inside the app — the file-picker route bounces out to the
 * system camera and back, which loses the framing guides and, on some
 * tablets, the app's scroll position. The file input remains as a fallback
 * for browsers that refuse camera access.
 */
export function CameraSheet({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The camera is unavailable.');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(29,45,61,.96)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', color: PAPER, borderBottom: '1px solid rgba(242,242,243,.18)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>Take a photo of the elevation</span>
        <button onClick={onClose} className="btn" style={{ marginLeft: 'auto', height: 46, padding: '0 18px', background: 'rgba(242,242,243,.1)', border: '1px solid rgba(242,242,243,.3)', color: PAPER }}>
          Cancel
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: 16, position: 'relative' }}>
        {error ? (
          <div style={{ color: PAPER, maxWidth: 460, textAlign: 'center' }}>
            <h3 style={{ color: PAPER }}>The camera is unavailable</h3>
            <p style={{ opacity: .75, fontSize: 14.5 }}>{error}</p>
            <p style={{ opacity: .75, fontSize: 14.5 }}>Use “Upload from tablet” instead — it accepts anything in the photo roll.</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', background: '#000' }}
          />
        )}
      </div>

      {!error && (
        <div style={{ flex: 'none', padding: '16px 20px 22px', display: 'grid', placeItems: 'center', gap: 10 }}>
          <div style={{ color: PAPER, opacity: .7, fontSize: 13.5 }}>
            Stand square to the wall and get the roofline and the ground in frame.
          </div>
          <button
            onClick={shoot}
            disabled={!ready}
            className="btn btn-primary"
            style={{ height: 66, padding: '0 40px', fontSize: 18, fontFamily: 'var(--font-heading)', letterSpacing: '.06em', textTransform: 'uppercase', opacity: ready ? 1 : .5, color: PAPER, background: INK }}
          >
            {ready ? 'Capture' : 'Starting camera…'}
          </button>
        </div>
      )}
    </div>
  );
}
