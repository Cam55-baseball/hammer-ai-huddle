/**
 * Capture the currently displayed frame of a <video> element as a JPEG blob.
 *
 * Used by the landing demo video manager so the owner can pick a cover image
 * straight out of the video instead of the player showing a black rectangle.
 *
 * The canvas is tainted (and `toBlob` throws a SecurityError) if the video was
 * loaded cross-origin without CORS. Our demo uploads are served from signed
 * storage URLs with `crossOrigin="anonymous"`, which is fine, but we surface a
 * readable error so the UI can steer the owner to the photo-upload path.
 */
export class FrameCaptureError extends Error {}

export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality = 0.85,
): Promise<Blob> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new FrameCaptureError(
      "The video hasn't loaded far enough to grab a frame yet. Give it a second and try again.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new FrameCaptureError("This browser can't capture video frames.");

  try {
    ctx.drawImage(video, 0, 0, width, height);
  } catch {
    throw new FrameCaptureError(
      "This video can't be read frame-by-frame. Upload a cover photo instead.",
    );
  }

  return await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else
            reject(
              new FrameCaptureError(
                "Couldn't turn that frame into an image. Upload a cover photo instead.",
              ),
            );
        },
        "image/jpeg",
        quality,
      );
    } catch {
      // SecurityError from a tainted canvas lands here.
      reject(
        new FrameCaptureError(
          "This video can't be read frame-by-frame. Upload a cover photo instead.",
        ),
      );
    }
  });
}

/** Seek a video to a given time and resolve once the new frame is painted. */
export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) return resolve();
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}
