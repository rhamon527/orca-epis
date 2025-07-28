window.onload = function () {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const imagemBase64 = document.getElementById('imagem_base64');
    const form = document.getElementById('formBiometria');

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;

            setTimeout(() => {
                const context = canvas.getContext('2d');

                // 🔥 Reduz o tamanho para evitar erro 413
                canvas.width = 320;
                canvas.height = 240;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imagem = canvas.toDataURL('image/jpeg', 0.8); // qualidade 80%
                imagemBase64.value = imagem;

                // Para a câmera
                stream.getTracks().forEach(track => track.stop());

                // Envia automaticamente
                form.submit();
            }, 3000);
        })
        .catch(error => {
            alert("Erro ao acessar a câmera: " + error);
        });
}
