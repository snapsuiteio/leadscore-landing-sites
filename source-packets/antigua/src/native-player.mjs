const video = document.getElementById('seminar-video');
const playback = document.getElementById('video-playback');
const sound = document.getElementById('video-sound');
const status = document.getElementById('video-playback-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let userPaused = false;
let policyPauses = 0;
let autoplayBlocked = false;
let playPending = false;
let mediaReady;
let mediaObjectUrl;

async function prepareMedia() {
  if (!mediaReady) mediaReady = (async () => {
    // This static host serves a complete MP4 for Range requests. A local Blob keeps
    // native seeking available without adding a server, binding or video service.
    const source = video.querySelector('source').src;
    const response = await fetch(source, { credentials: 'omit', redirect: 'error' });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('video/mp4')) throw new Error('Video unavailable');
    mediaObjectUrl = URL.createObjectURL(await response.blob());
    video.src = mediaObjectUrl;
    video.load();
  })().catch(error => { mediaReady = undefined; throw error; });
  return mediaReady;
}
window.addEventListener('pagehide', event => {
  if (!event.persisted && mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl);
});

function updateControls() {
  playback.textContent = playPending || !video.paused ? 'Pause video' : 'Play video';
  sound.textContent = video.muted ? 'Turn sound on' : 'Mute sound';
  sound.setAttribute('aria-pressed', String(!video.muted));
  status.textContent = playPending ? 'Loading video.' : video.ended ? 'Video finished.' : video.paused
    ? (autoplayBlocked ? 'Press play to watch.' : 'Video paused.')
    : (video.muted ? 'Playing without sound.' : 'Playing with sound.');
}

function pauseForVisibility() {
  if (!video.paused) {
    policyPauses += 1;
    video.pause();
  }
}

async function startPlayback(automatic) {
  if (playPending || !video.paused || video.ended) return;
  if (automatic && (userPaused || autoplayBlocked || reducedMotion.matches || !visible || document.hidden)) return;
  playPending = true;
  updateControls();
  try {
    await prepareMedia();
    if (userPaused || !visible || document.hidden || (automatic && reducedMotion.matches)) return;
    await video.play();
    autoplayBlocked = false;
    if (!visible || document.hidden) pauseForVisibility();
  } catch {
    autoplayBlocked = true;
  } finally {
    playPending = false;
    updateControls();
  }
}

function syncVisibility() {
  if (!visible || document.hidden || reducedMotion.matches) pauseForVisibility();
  else void startPlayback(true);
}

playback.addEventListener('click', () => {
  if (playPending) {
    userPaused = true;
    return;
  }
  if (video.paused) {
    userPaused = false;
    if (video.ended) video.currentTime = 0;
    void startPlayback(false);
  } else {
    userPaused = true;
    video.pause();
  }
});
sound.addEventListener('click', () => {
  video.muted = !video.muted;
  updateControls();
});
video.addEventListener('play', () => {
  userPaused = false;
  if (!visible || document.hidden) pauseForVisibility();
  updateControls();
});
video.addEventListener('pause', () => {
  if (policyPauses > 0) policyPauses -= 1;
  else if (!video.ended && !playPending) userPaused = true;
  updateControls();
});
for (const event of ['volumechange', 'ended', 'loadedmetadata']) video.addEventListener(event, updateControls);
video.addEventListener('error', () => { status.textContent = 'Video could not load. Use the video download link.'; });
document.addEventListener('visibilitychange', syncVisibility);
reducedMotion.addEventListener('change', syncVisibility);
new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25;
  syncVisibility();
}, {threshold: [0, 0.25]}).observe(video);
video.muted = true;
updateControls();
