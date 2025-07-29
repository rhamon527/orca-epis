const video = document.getElementById("video");
const statusEl = document.getElementById("status");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models')
]).then(iniciarReconhecimento);

async function carregarDescritores() {
  const labels = ["Joao Silva", "Maria Souza"]; // pode vir dinamicamente via Flask
  const descritores = [];

  for (const label of labels) {
    const img = await faceapi.fetchImage(`/static/fotos_funcionarios/${label}.jpg`);
    const deteccao = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (!deteccao) continue;
    descritores.push(new faceapi.LabeledFaceDescriptors(label, [deteccao.descriptor]));
  }

  return descritores;
}

async function iniciarReconhecimento() {
  const faceMatcher = new faceapi.FaceMatcher(await carregarDescritores(), 0.6);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  statusEl.innerText = "📷 Câmera ligada, procurando rostos...";

  video.addEventListener("play", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    faceapi.matchDimensions(canvas, { width: video.width, height: video.height });

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, { width: video.width, height: video.height });
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      for (let d of resized) {
        const bestMatch = faceMatcher.findBestMatch(d.descriptor);
        const drawBox = new faceapi.draw.DrawBox(d.detection.box, { label: bestMatch.toString() });
        drawBox.draw(canvas);
        statusEl.innerText = bestMatch.label.includes("unknown") ?
          "❌ Pessoa não reconhecida" :
          "✅ Pessoa reconhecida: " + bestMatch.label;
      }
    }, 1500);
  });
}
