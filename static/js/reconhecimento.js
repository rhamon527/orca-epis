<script defer>
const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Carregar os modelos da face-api.js corretamente
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models')
])
.then(carregarFaces)
.catch(err => {
  console.error("Erro ao carregar modelos:", err);
  if (statusEl) statusEl.innerText = "❌ Erro ao carregar modelos.";
});

async function carregarFaces() {
  const response = await fetch('/faces-list');
  const arquivos = await response.json();

  const descritoresRotulados = [];

  for (const nomeArquivo of arquivos) {
    try {
      const label = nomeArquivo.replace(".jpg", "").replace(".jpeg", "").replace(".png", ""); // tira a extensão
      const img = await faceapi.fetchImage(`/static/faces/${nomeArquivo}`);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        console.warn(`⚠️ Nenhum rosto detectado em ${nomeArquivo}`);
        continue;
      }
      const descritor = detection.descriptor;
      descritoresRotulados.push(new faceapi.LabeledFaceDescriptors(label, [descritor]));
    } catch (err) {
      console.error(`Erro ao processar ${nomeArquivo}:`, err);
    }
  }

  iniciarCamera(descritoresRotulados);
}

async function iniciarCamera(labeledDescriptors) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 720, height: 560 }
    });
    video.srcObject = stream;
    if (statusEl) statusEl.innerText = "📷 Câmera ligada, procurando rostos...";
    console.log("📷 Câmera ativada");

    video.addEventListener("play", async () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.appendChild(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const results = resized.map(d =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        results.forEach((result, i) => {
          const box = resized[i].detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
          drawBox.draw(canvas);

          if (statusEl) {
            statusEl.innerText = result.label.includes("unknown")
              ? "❌ Pessoa não reconhecida"
              : "✅ Reconhecido CPF: " + result.label;
          }
        });
      }, 1500);
    });

  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
    if (statusEl) statusEl.innerText = "❌ Erro ao acessar a câmera.";
  }
}
</script>
