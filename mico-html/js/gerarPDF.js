function gerarPDF() {
    // Inicializa o jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Captura os valores do formulário
    const peritoNome = document.getElementById('peritoNome').value;
    const dataPericia = document.getElementById('dataPericia').value;
    const exameDescricao = document.getElementById('exameDescricao').value;
    const diagnostico = document.getElementById('diagnostico').value;
    const observacoes = document.getElementById('observacoes').value;
    const fotoInput = document.getElementById('foto');

    // Validação simples para campos obrigatórios
    if (!peritoNome || !dataPericia || !exameDescricao || !diagnostico) {
        alert("Por favor, preencha todos os campos obrigatórios antes de gerar o PDF.");
        return;
    }

    // Função para redimensionar a imagem
    function resizeImage(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = function () {
                console.error("Erro ao carregar a imagem para redimensionamento.");
                callback(null);
            };
        };
        reader.readAsDataURL(file);
    }

    // Função para adicionar o conteúdo ao PDF
    function addContentToPDF(images = []) {
        let yPosition = 10;

        doc.setFontSize(16);
        doc.text("Laudo Odontológico", 10, yPosition);
        yPosition += 10;

        doc.setFontSize(12);
        doc.text(`Perito: ${peritoNome}`, 10, yPosition);
        yPosition += 10;
        doc.text(`Data da Perícia: ${dataPericia}`, 10, yPosition);
        yPosition += 10;
        doc.text("Descrição do Exame:", 10, yPosition);
        yPosition += 10;
        doc.text(exameDescricao, 10, yPosition, { maxWidth: 180 });
        yPosition += 40;
        doc.text("Diagnóstico:", 10, yPosition);
        yPosition += 10;
        doc.text(diagnostico, 10, yPosition, { maxWidth: 180 });
        yPosition += 40;

        if (observacoes) {
            doc.text("Observações Adicionais:", 10, yPosition);
            yPosition += 10;
            doc.text(observacoes, 10, yPosition, { maxWidth: 180 });
            yPosition += 40;
        }

        if (images.length > 0) {
            doc.text("Imagens do Exame:", 10, yPosition);
            yPosition += 10;

            const imgWidth = 50;
            const imgHeight = 50;
            const pageHeight = doc.internal.pageSize.height;

            images.forEach((imgData, index) => {
                console.log(`Adicionando imagem ${index + 1} ao PDF...`);
                let yImagePosition = yPosition;

                if (yImagePosition + imgHeight > pageHeight - 10) {
                    console.log("Adicionando nova página para imagem...");
                    doc.addPage();
                    yPosition = 10;
                    yImagePosition = yPosition;
                }

                try {
                    doc.addImage(imgData, 'JPEG', 10, yImagePosition, imgWidth, imgHeight);
                    yPosition = yImagePosition + imgHeight + 10;
                    console.log(`Imagem ${index + 1} adicionada com sucesso.`);
                } catch (error) {
                    console.error(`Erro ao adicionar a imagem ${index + 1} ao PDF:`, error);
                }
            });
        }

        doc.save('laudo_odontologico.pdf');
    }

    if (fotoInput.files && fotoInput.files.length > 0) {
        console.log("Número de imagens selecionadas:", fotoInput.files.length);
        const images = [];
        const files = Array.from(fotoInput.files);
        let imagesProcessed = 0;

        files.forEach((file, index) => {
            resizeImage(file, 300, 300, function (imgData) {
                console.log(`Imagem ${index + 1} redimensionada:`, imgData ? "Sucesso" : "Falha");
                images[index] = imgData;
                imagesProcessed++;

                if (imagesProcessed === files.length) {
                    console.log("Todas as imagens processadas. Gerando PDF...");
                    addContentToPDF(images.filter(img => img !== null));
                }
            });
        });
    } else {
        console.log("Nenhuma imagem selecionada. Gerando PDF sem imagens...");
        addContentToPDF();
    }
}