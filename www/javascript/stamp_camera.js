let cameraStream = null;

export async function startCamera(
  videoElement,
  placeholderElement,
  loadCVCallback,
) {
  await loadCVCallback();
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    videoElement.srcObject = cameraStream;
    videoElement.classList.remove("hidden");
    placeholderElement.classList.add("hidden");
    return cameraStream;
  } catch (err) {
    placeholderElement.innerHTML = `<span class="text-red-500 font-black  text-center px-4">Camera Access Denied</span>`;
    return null;
  }
}

export function stopCamera(videoElement, placeholderElement) {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  videoElement.classList.add("hidden");
  placeholderElement.classList.remove("hidden");
}
