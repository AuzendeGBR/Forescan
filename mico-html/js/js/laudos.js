$(document).ready(function() {
    // Exibir PDFs ao carregar a aba de lista
    $('#list-tab').on('shown.bs.tab', function () {
        displayPDFs();
    });

    // Exibir PDFs inicialmente se a aba de lista estiver ativa
    if ($('#list-tab').hasClass('active')) {
        displayPDFs();
    }

    // Evento de clique no botão de upload
    $('#upload-btn').on('click', uploadPDF);
});

// Função para fazer upload do PDF
function uploadPDF() {
    const input = document.getElementById('pdf-input');
    const file = input.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('Por favor, selecione um arquivo PDF.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const pdfData = e.target.result;
        const pdfName = file.name;

        // Armazenar no localStorage
        let pdfs = JSON.parse(localStorage.getItem('pdfs')) || [];
        pdfs.push({ name: pdfName, data: pdfData });
        localStorage.setItem('pdfs', JSON.stringify(pdfs));

        alert('PDF salvo com sucesso!');
        input.value = ''; // Limpar input
    };
    reader.readAsDataURL(file);
}

// Função para exibir PDFs salvos
function displayPDFs() {
    const pdfList = $('#pdf-list');
    pdfList.empty();
    const pdfs = JSON.parse(localStorage.getItem('pdfs')) || [];

    pdfs.forEach((pdf, index) => {
        const li = $(`
            <li>
                <a href="${pdf.data}" download="${pdf.name}">${pdf.name}</a>
                <button class="btn btn-danger btn-sm" onclick="deletePDF(${index})">Excluir</button>
            </li>
        `);
        pdfList.append(li);
    });
}

// Função para excluir PDF
function deletePDF(index) {
    let pdfs = JSON.parse(localStorage.getItem('pdfs')) || [];
    pdfs.splice(index, 1);
    localStorage.setItem('pdfs', JSON.stringify(pdfs));
    displayPDFs();
}