/**
 * cameraService.ts
 * Unified helper service to stop media streams and release camera hardware resources.
 */

export const stopMediaStream = (stream: MediaStream | null, videoElement?: HTMLVideoElement | null) => {
  if (stream) {
    try {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    } catch (err) {
      console.error('Error stopping stream tracks:', err);
    }
  }
  if (videoElement) {
    try {
      videoElement.srcObject = null;
    } catch (err) {
      console.error('Error clearing video srcObject:', err);
    }
  }
};
