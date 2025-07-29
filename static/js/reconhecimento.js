const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Aqui virá a lista de CPFs (pode vir dinamicamente do Flask)
const cpfs = ["12345678900", "98765432100"]; // Ex: nomes das fotos

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models')
]).then(iniciarReconhecimento);

async function carregarDescritores() {
  const descritores = [];

  for (const cpf of cpfs) {
    try {
      const img = await faceapi.fetchImage(`/static/fotos_funcionarios/${cpf}.jpg`);
      const deteccao = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (deteccao) {
        descritores.push(new faceapi.LabeledFaceDescriptors(cpf, [deteccao.descriptor]));
      }
    } catch (error) {
      console.warn("❌ Falha ao carregar imagem de:", cpf);
    }
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
          "✅ CPF reconhecido: " + bestMatch.label;
      }
    }, 1500);
  });
}
