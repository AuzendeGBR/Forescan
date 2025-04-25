document.addEventListener('DOMContentLoaded', () => {
  console.log('custom.js carregado com sucesso'); // Log para verificar carregamento

  // Função para mostrar toast
  function mostrarToast(mensagem, tipo = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="3000">
        <div class="toast-header">
          <strong class="me-auto">Notificação</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
        <div class="toast-body">${mensagem}</div>
      </div>
    `;
    toastContainer.innerHTML += toastHTML;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  }

  // Atualizar ano no footer
  function getYear() {
    const currentYear = new Date().getFullYear();
    const displayYear = document.querySelector('#displayYear');
    if (displayYear) displayYear.innerHTML = currentYear;
  }
  getYear();

  // Inicializar niceSelect
  try {
    $('select').niceSelect();
  } catch (err) {
    console.error('Erro ao inicializar niceSelect:', err);
  }

  // Verificação de autenticação
  function verificarAutenticacao() {
    if (window.location.pathname.includes('Login.html')) return;

    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (!usuarioLogado) {
      window.location.href = 'Login.html';
      return;
    }

    try {
      const usuario = JSON.parse(usuarioLogado);
      if (window.location.pathname.includes('Gerenciar_usuarios.html') && usuario.tipo !== 'Administrador') {
        mostrarToast('Acesso negado! Apenas administradores podem acessar esta página.', 'danger');
        setTimeout(() => window.location.href = 'index.html', 1000);
        return;
      }

      const gerenciarUsuariosLink = document.querySelector('a[href="Gerenciar_usuarios.html"]');
      if (gerenciarUsuariosLink && usuario.tipo !== 'Administrador') {
        const navItem = gerenciarUsuariosLink.closest('.nav-item');
        if (navItem) navItem.style.display = 'none';
      }

      const navbarMenu = document.querySelector('.navbar-nav');
      if (navbarMenu && usuarioLogado) {
        const userItem = document.createElement('li');
        userItem.className = 'nav-item';
        userItem.innerHTML = `<span class="nav-link">Olá, ${usuario.nome}</span>`;
        navbarMenu.appendChild(userItem);

        const logoutItem = document.createElement('li');
        logoutItem.className = 'nav-item';
        logoutItem.innerHTML = '<a class="nav-link" href="#" onclick="logout()">Logout</a>';
        navbarMenu.appendChild(logoutItem);
      }
    } catch (err) {
      console.error('Erro ao processar usuarioLogado:', err);
      localStorage.removeItem('usuarioLogado');
      window.location.href = 'Login.html';
    }
  }
  verificarAutenticacao();

  window.logout = function() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'Login.html';
  };

  // Inicializar IndexedDB apenas nas páginas necessárias
  let dbPromise = null;
  const paginasQueUsamIndexedDB = ['index.html', 'Adicionar_casos.html', 'Laudos.html'];
  if (paginasQueUsamIndexedDB.some(pagina => window.location.pathname.includes(pagina))) {
    try {
      dbPromise = idb.openDB('forescanDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('laudos')) {
            db.createObjectStore('laudos', { keyPath: 'id' });
          }
        }
      });
      console.log('IndexedDB inicializado com sucesso.');
    } catch (err) {
      console.error('Erro ao inicializar IndexedDB:', err);
      mostrarToast('Erro ao inicializar o banco de dados.', 'danger');
    }
  }

  // Lógica específica por página
  if (window.location.pathname.includes('Login.html')) {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Formulário de login submetido.');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        let isValid = true;
        if (!email) {
          emailInput.classList.add('is-invalid');
          isValid = false;
        } else {
          emailInput.classList.remove('is-invalid');
        }
        if (!password) {
          passwordInput.classList.add('is-invalid');
          isValid = false;
        } else {
          passwordInput.classList.remove('is-invalid');
        }

        if (!isValid) {
          mostrarToast('Preencha todos os campos.', 'warning');
          console.log('Validação do formulário falhou: campos obrigatórios não preenchidos.');
          return;
        }

        let users = [];
        try {
          const usersRaw = localStorage.getItem('users');
          users = usersRaw ? JSON.parse(usersRaw) : [];
          if (!Array.isArray(users)) {
            console.warn('Dados de usuários corrompidos. Inicializando como array vazio.');
            users = [];
            localStorage.setItem('users', JSON.stringify(users));
          }
        } catch (err) {
          console.error('Erro ao parsear users do localStorage:', err);
          mostrarToast('Erro ao acessar os dados de usuários.', 'danger');
          return;
        }

        const user = users.find(u => u.email === email && u.senha === password);
        if (user) {
          console.log('Usuário encontrado:', user);
          localStorage.setItem('usuarioLogado', JSON.stringify({
            id: user.email,
            nome: user.nome,
            tipo: user.tipo,
            email: user.email
          }));
          mostrarToast('Login realizado com sucesso!', 'success');
          setTimeout(() => window.location.href = 'index.html', 1000);
        } else {
          console.log('Credenciais inválidas:', { email, password });
          mostrarToast('Email ou senha incorretos.', 'danger');
        }
      });
    } else {
      console.error('Elemento #loginForm não encontrado.');
    }
  }

  if (window.location.pathname.includes('index.html')) {
    const totalLaudos = document.getElementById('totalLaudos');
    const laudosHoje = document.getElementById('laudosHoje');
    const peritoAtivo = document.getElementById('peritoAtivo');
    const peritoChart = document.getElementById('peritoChart');
    const laudosTable = document.getElementById('laudosTable');
    const filtroData = document.getElementById('filtroData');
    const filtroPerito = document.getElementById('filtroPerito');
    const filtroNomeCaso = document.getElementById('filtroNomeCaso');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const laudosCarousel = document.getElementById('laudosCarousel');

    let casos = [];
    const casosPorPagina = 5;
    let paginaAtual = 1;
    let filtrosAtuais = {};

    async function carregarCasos() {
      if (!dbPromise) {
        console.error('dbPromise não inicializado.');
        mostrarToast('Erro ao acessar o banco de dados.', 'danger');
        return;
      }
      try {
        const db = await dbPromise;
        casos = await db.getAll('laudos');
        casos = casos.map((caso, index) => ({
          ...caso,
          nomeCaso: caso.nomeCaso || caso.paciente || `Caso_${index + 1}`,
          paciente: undefined,
          fotos: caso.fotos || [],
          status: caso.status || 'Em andamento'
        }));
        console.log('Casos carregados do IndexedDB:', casos);
        atualizarTabela();
        atualizarEstatisticas();
        if (laudosCarousel) atualizarCasos();
      } catch (err) {
        console.error('Erro ao carregar casos:', err);
        mostrarToast('Erro ao carregar os casos.', 'danger');
      }
    }
    carregarCasos();

    function atualizarTabela(filtros = filtrosAtuais, pagina = paginaAtual) {
      if (!laudosTable || !paginationNumbers) {
        console.error('Elementos laudosTable ou paginationNumbers não encontrados.');
        return;
      }
      console.log('Atualizando tabela com filtros:', filtros, 'e página:', pagina); // Log para depuração
      laudosTable.innerHTML = '';
      let casosFiltrados = [...casos];

      if (filtros.data) casosFiltrados = casosFiltrados.filter(c => c.data === filtros.data);
      if (filtros.perito) casosFiltrados = casosFiltrados.filter(c => c.perito === filtros.perito);
      if (filtros.nomeCaso) {
        const termo = filtros.nomeCaso.toLowerCase();
        casosFiltrados = casosFiltrados.filter(c => (c.nomeCaso || '').toLowerCase().includes(termo));
      }

      const totalCasos = casosFiltrados.length;
      const totalPaginas = Math.ceil(totalCasos / casosPorPagina);
      pagina = Math.max(1, Math.min(pagina, totalPaginas));
      paginaAtual = pagina;

      const inicio = (pagina - 1) * casosPorPagina;
      const fim = inicio + casosPorPagina;
      const casosPaginados = casosFiltrados.slice(inicio, fim);

      const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
      const tipoUsuario = usuarioLogado.tipo || null;
      const podeEditar = tipoUsuario === 'Administrador' || tipoUsuario === 'Perito';
      const podeExcluir = tipoUsuario === 'Administrador';

      casosPaginados.forEach((caso, index) => {
        const nomeCasoDisplay = caso.nomeCaso || 'N/A';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${inicio + index + 1}</td>
          <td>${nomeCasoDisplay}</td>
          <td>${caso.data || 'N/A'}</td>
          <td>${caso.perito || 'N/A'}</td>
          <td>
            ${podeEditar ? `
              <select class="form-select status-select" data-caso-id="${caso.id}">
                <option value="Em andamento" ${caso.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                <option value="Finalizado" ${caso.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                <option value="Arquivado" ${caso.status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
              </select>
            ` : caso.status || 'Em andamento'}
          </td>
          <td>
            <a href="Adicionar_evidencias.html?casoId=${caso.id}" class="btn btn-black btn-sm"><i class="bi bi-plus-circle"></i> Adicionar</a>
            <a href="Laudos.html?id=${caso.id}" class="btn btn-primary btn-sm">Visualizar</a>
            ${podeExcluir ? `<button class="btn btn-danger btn-sm" onclick="excluirCaso('${caso.id}')">Excluir</button>` : ''}
          </td>
        `;
        laudosTable.appendChild(row);
      });

      if (podeEditar) {
        document.querySelectorAll('.status-select').forEach(select => {
          select.addEventListener('change', async () => {
            const casoId = select.dataset.casoId;
            const newStatus = select.value;
            try {
              const db = await dbPromise;
              const caso = await db.get('laudos', casoId);
              if (caso) {
                caso.status = newStatus;
                await db.put('laudos', caso);
                const index = casos.findIndex(c => c.id === casoId);
                casos[index] = caso;
                mostrarToast('Status atualizado com sucesso!', 'success');
                atualizarTabela();
              }
            } catch (err) {
              console.error('Erro ao atualizar status:', err);
              mostrarToast('Erro ao atualizar o status.', 'danger');
            }
          });
        });
      }

      paginationNumbers.innerHTML = '';
      for (let i = 1; i <= totalPaginas; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === pagina ? 'active' : ''}`;
        pageItem.innerHTML = `<a class="page-link" href="#" onclick="irParaPagina(${i})">${i}</a>`;
        paginationNumbers.appendChild(pageItem);
      }

      const btnAnterior = document.querySelector('.pagination .page-item:first-child');
      const btnProximo = document.querySelector('.pagination .page-item:last-child');
      btnAnterior.classList.toggle('disabled', pagina === 1);
      btnProximo.classList.toggle('disabled', pagina === totalPaginas);
    }

    window.paginaAnterior = function() {
      if (paginaAtual > 1) atualizarTabela(filtrosAtuais, paginaAtual - 1);
    };

    window.proximaPagina = function() {
      const totalPaginas = Math.ceil(casos.filter(c => {
        if (filtrosAtuais.data && c.data !== filtrosAtuais.data) return false;
        if (filtrosAtuais.perito && c.perito !== filtrosAtuais.perito) return false;
        if (filtrosAtuais.nomeCaso && !(c.nomeCaso || '').toLowerCase().includes(filtrosAtuais.nomeCaso.toLowerCase())) return false;
        return true;
      }).length / casosPorPagina);
      if (paginaAtual < totalPaginas) atualizarTabela(filtrosAtuais, paginaAtual + 1);
    };

    window.irParaPagina = function(pagina) {
      atualizarTabela(filtrosAtuais, pagina);
    };

    window.aplicarFiltros = function() {
      filtrosAtuais = {
        data: filtroData ? filtroData.value : '',
        perito: filtroPerito ? filtroPerito.value : '',
        nomeCaso: filtroNomeCaso ? filtroNomeCaso.value.trim() : ''
      };
      paginaAtual = 1;
      atualizarTabela(filtrosAtuais, 1);
    };

    window.limparFiltros = function() {
      if (filtroData) filtroData.value = '';
      if (filtroPerito) filtroPerito.value = '';
      if (filtroNomeCaso) filtroNomeCaso.value = '';
      filtrosAtuais = {};
      paginaAtual = 1;
      atualizarTabela({}, 1);
    };

    window.excluirCaso = async function(casoId) {
      if (confirm('Tem certeza que deseja excluir este caso?')) {
        try {
          const db = await dbPromise;
          await db.delete('laudos', casoId);
          casos = casos.filter(caso => caso.id !== casoId);
          mostrarToast('Caso excluído com sucesso!', 'danger');
          atualizarTabela();
          atualizarEstatisticas();
          if (laudosCarousel) atualizarCasos();
          if (window.location.pathname.includes('Laudos.html')) {
            setTimeout(() => window.location.href = 'index.html', 1000);
          }
        } catch (err) {
          console.error('Erro ao excluir caso:', err);
          mostrarToast('Erro ao excluir o caso.', 'danger');
        }
      }
    };

    function atualizarEstatisticas() {
      if (!totalLaudos || !laudosHoje || !peritoAtivo) return;

      const hoje = new Date().toISOString().split('T')[0];
      const casosHojeCount = casos.filter(c => c.data === hoje).length;
      const peritosCount = {};
      casos.forEach(c => {
        if (c.perito) peritosCount[c.perito] = (peritosCount[c.perito] || 0) + 1;
      });

      totalLaudos.textContent = casos.length;
      laudosHoje.textContent = casosHojeCount;
      peritoAtivo.textContent = Object.keys(peritosCount).length
        ? Object.keys(peritosCount).reduce((a, b) => peritosCount[a] > peritosCount[b] ? a : b)
        : 'Nenhum';

      if (peritoChart) {
        try {
          new Chart(peritoChart.getContext('2d'), {
            type: 'bar',
            data: {
              labels: ['Nicolas Gomes', 'Manoel Gomes', 'João Pedro', 'Rafael Arcanjo', 'Maisa Letícia'],
              datasets: [{
                label: 'Casos por Perito',
                data: [
                  peritosCount['Nicolas Gomes'] || 0,
                  peritosCount['Manoel Gomes'] || 0,
                  peritosCount['João Pedro'] || 0,
                  peritosCount['Rafael Arcanjo'] || 0,
                  peritosCount['Maisa Letícia'] || 0
                ],
                backgroundColor: 'rgba(167, 202, 201, 0.5)',
                borderColor: '#A7CAC9',
                borderWidth: 1
              }]
            },
            options: {
              scales: { y: { beginAtZero: true } }
            }
          });
        } catch (err) {
          console.error('Erro ao renderizar gráfico:', err);
        }
      }
    }

    function atualizarCasos() {
      if (!laudosCarousel) return;
      $(laudosCarousel).owlCarousel('destroy');
      laudosCarousel.innerHTML = '';
      if (casos.length === 0) {
        laudosCarousel.innerHTML = '<div class="item"><div class="box"><div class="detail-box"><p>Nenhum caso salvo</p></div></div></div>';
      } else {
        casos.forEach((caso, index) => {
          const fotosCount = caso.fotos ? caso.fotos.length : 0;
          const item = document.createElement('div');
          item.className = 'item';
          item.innerHTML = `
            <div class="box">
              <div class="img-box">
                <img src="images/laudos.png" alt="Pasta" />
              </div>
              <div class="detail-box">
                <h5>${caso.nomeCaso || `Caso ${index + 1}`}</h5>
                <p>${fotosCount} foto(s)</p>
                <div class="btn-box">
                  <button class="btn btn-custom" onclick="window.location.href='Adicionar_casos.html?id=${caso.id}'">Editar</button>
                </div>
              </div>
            </div>
          `;
          laudosCarousel.appendChild(item);
        });
      }
      try {
        $('.team_carousel').owlCarousel({
          loop: true,
          margin: 15,
          dots: true,
          autoplay: true,
          navText: [
            '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            '<i class="fa fa-angle-right" aria-hidden="true"></i>'
          ],
          autoplayHoverPause: true,
          responsive: {
            0: { items: 1, margin: 0 },
            576: { items: 2 },
            992: { items: 3 }
          }
        });
      } catch (err) {
        console.error('Erro ao inicializar OwlCarousel:', err);
      }
    }
  }

  if (window.location.pathname.includes('Adicionar_casos.html')) {
    const formLaudo = document.getElementById('formLaudo');
    const fotoInput = document.getElementById('foto');
    const fileNamesSpan = document.getElementById('file-names');
    const clearPhotosBtn = document.getElementById('clearPhotos');

    if (fotoInput && fileNamesSpan) {
      fotoInput.addEventListener('change', function() {
        const files = Array.from(this.files);
        const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
        const validFiles = files.filter(file => validFormats.includes(file.type));
        if (validFiles.length < files.length) {
          mostrarToast('Apenas JPEG, PNG ou GIF são permitidos.', 'warning');
        }
        fileNamesSpan.textContent = validFiles.length > 0 ? validFiles.map(f => f.name).join(', ') : 'Nenhuma foto selecionada';
      });
    }

    if (clearPhotosBtn) {
      clearPhotosBtn.addEventListener('click', () => {
        if (fotoInput) fotoInput.value = '';
        if (fileNamesSpan) fileNamesSpan.textContent = 'Nenhuma foto selecionada';
      });
    }

    async function validarNomeCaso(nomeCaso, casoId = null) {
      if (!nomeCaso || nomeCaso.trim() === '') return 'O Nome do Caso é obrigatório.';
      const regex = /^[a-zA-Z0-9\s-]{3,}$/;
      if (!regex.test(nomeCaso)) return 'O Nome do Caso deve ter pelo menos 3 caracteres e conter apenas letras, números, espaços ou hífens.';
      try {
        const db = await dbPromise;
        const allCasos = await db.getAll('laudos');
        const exists = allCasos.some(c => c.nomeCaso.toLowerCase() === nomeCaso.toLowerCase() && c.id !== casoId);
        if (exists) return 'O Nome do Caso já existe.';
        return null;
      } catch (err) {
        console.error('Erro ao validar nome do caso:', err);
        return 'Erro ao validar o nome do caso.';
      }
    }

    function limparFormulario() {
      if (formLaudo) {
        formLaudo.reset();
        const nomeCasoInput = document.getElementById('nomeCaso');
        nomeCasoInput.classList.remove('is-invalid');
        const errorDiv = nomeCasoInput.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) errorDiv.textContent = '';
        if (fileNamesSpan) fileNamesSpan.textContent = 'Nenhuma foto selecionada';
        if (fotoInput) fotoInput.value = '';
        try {
          $('#peritoNome').niceSelect('update');
          $('#statusCaso').niceSelect('update');
        } catch (err) {
          console.error('Erro ao atualizar niceSelect:', err);
        }
      }
    }

    window.irParaEvidencias = function() {
      const nomeCaso = $('#nomeCaso').val();
      if (!nomeCaso) {
        mostrarToast('Preencha o Nome do Caso antes de adicionar evidências.', 'warning');
        return;
      }
      window.location.href = `Adicionar_evidencias.html?casoId=${encodeURIComponent(nomeCaso)}`;
    };

    function carregarEvidenciasCaso() {
      const nomeCaso = $('#nomeCaso').val();
      const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
      const tableBody = $('#evidenciasTableBody');
      if (tableBody) {
        tableBody.empty();
        const evidenciasFiltradas = evidencias.filter(e => e.casoId === nomeCaso);
        evidenciasFiltradas.forEach((evidencia, index) => {
          const row = `
            <tr>
              <td>${evidencia.tituloEvidencia}</td>
              <td>${evidencia.descricaoEvidencia}</td>
              <td>
                <button class="btn btn-sm btn-primary me-1" onclick="visualizarEvidencia(${index}, '${nomeCaso}')">
                  <i class="bi bi-eye"></i> Visualizar
                </button>
                <button class="btn btn-sm btn-warning" onclick="editarEvidencia(${index}, '${nomeCaso}')">
                  <i class="bi bi-pencil"></i> Editar
                </button>
              </td>
            </tr>
          `;
          tableBody.append(row);
        });
      }
    }

    window.visualizarEvidencia = function(index, casoId) {
      const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
      const evidenciasFiltradas = evidencias.filter(e => e.casoId === casoId);
      const evidencia = evidenciasFiltradas[index];

      $('#evidenciaNome').text(evidencia.tituloEvidencia);
      $('#evidenciaTipo').text(evidencia.descricaoEvidencia);
      $('#evidenciaData').text(evidencia.dataEvidencia || 'N/A');
      $('#evidenciaArquivo').text(evidencia.fotoEvidencia || 'Nenhum arquivo');
      $('#evidenciaObservacoes').text(evidencia.observacoes || 'Sem observações');

      try {
        const modal = new bootstrap.Modal(document.getElementById('visualizarEvidenciaModal'));
        modal.show();
      } catch (err) {
        console.error('Erro ao abrir modal de visualização:', err);
      }
    };

    window.editarEvidencia = function(index, casoId) {
      const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
      const evidenciasFiltradas = evidencias.filter(e => e.casoId === casoId);
      const globalIndex = evidencias.indexOf(evidenciasFiltradas[index]);
      window.location.href = `Adicionar_evidencias.html?casoId=${encodeURIComponent(casoId)}&editIndex=${globalIndex}`;
    };

    if (formLaudo) {
      const nomeCasoInput = document.getElementById('nomeCaso');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'invalid-feedback';
      nomeCasoInput.parentNode.appendChild(errorDiv);

      formLaudo.addEventListener('submit', async e => {
        e.preventDefault();
        if (!formLaudo.checkValidity()) {
          e.stopPropagation();
          formLaudo.classList.add('was-validated');
          return;
        }

        const nomeCaso = nomeCasoInput.value.trim();
        const casoId = new URLSearchParams(window.location.search).get('id') || Date.now().toString();

        const error = await validarNomeCaso(nomeCaso, casoId);
        if (error) {
          nomeCasoInput.classList.add('is-invalid');
          errorDiv.textContent = error;
          return;
        }

        nomeCasoInput.classList.remove('is-invalid');
        errorDiv.textContent = '';

        const fotos = [];
        if (fotoInput && fotoInput.files.length > 0) {
          const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
          const files = Array.from(fotoInput.files).filter(file => validFormats.includes(file.type));
          try {
            for (const file of files) {
              if (file.size > 2 * 1024 * 1024) {
                mostrarToast(`A foto ${file.name} excede o limite de 2MB.`, 'warning');
                continue;
              }
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
                reader.readAsDataURL(file);
              });
              fotos.push(dataUrl);
            }
          } catch (err) {
            console.error('Erro ao processar fotos:', err);
            mostrarToast('Erro ao processar fotos.', 'danger');
            return;
          }
        }

        const caso = {
          id: casoId,
          nomeCaso,
          data: $('#dataPericia').val(),
          perito: $('#peritoNome').val(),
          descricao: $('#exameDescricao').val(),
          diagnostico: '',
          observacoes: $('#observacoes').val(),
          status: $('#statusCaso').val(),
          fotos
        };

        const casoLocal = {
          nomeCaso,
          peritoNome: caso.perito,
          statusCaso: caso.status,
          dataPericia: caso.data,
          exameDescricao: caso.descricao,
          observacoes: caso.observacoes
        };
        const casosLocal = JSON.parse(localStorage.getItem('casos') || '[]');
        const existingIndex = casosLocal.findIndex(c => c.nomeCaso === caso.nomeCaso);
        if (existingIndex >= 0) {
          casosLocal[existingIndex] = casoLocal;
        } else {
          casosLocal.push(casoLocal);
        }
        localStorage.setItem('casos', JSON.stringify(casosLocal));

        try {
          const db = await dbPromise;
          const tx = db.transaction('laudos', 'readwrite');
          await tx.store.put(caso);
          await tx.done;
          mostrarToast('Caso salvo com sucesso!', 'success');
          limparFormulario();
          window.location.href = 'index.html';
        } catch (err) {
          console.error('Erro ao salvar caso:', err);
          mostrarToast('Erro ao salvar o caso.', 'danger');
        }
      });

      const urlParams = new URLSearchParams(window.location.search);
      const casoId = urlParams.get('id');
      if (casoId) {
        (async () => {
          try {
            const db = await dbPromise;
            const caso = await db.get('laudos', casoId);
            if (caso) {
              $('#nomeCaso').val(caso.nomeCaso || '');
              $('#dataPericia').val(caso.data || '');
              $('#peritoNome').val(caso.perito || '');
              $('#exameDescricao').val(caso.descricao || '');
              $('#observacoes').val(caso.observacoes || '');
              $('#statusCaso').val(caso.status || 'Em andamento');
              if (caso.fotos && caso.fotos.length > 0) {
                fileNamesSpan.textContent = `${caso.fotos.length} foto(s) carregada(s)`;
              }
              try {
                $('#peritoNome').niceSelect('update');
                $('#statusCaso').niceSelect('update');
              } catch (err) {
                console.error('Erro ao atualizar niceSelect:', err);
              }
            }
          } catch (err) {
            console.error('Erro ao carregar caso para edição:', err);
            mostrarToast('Erro ao carregar o caso.', 'danger');
          }
        })();
      }

      const casoIdParam = urlParams.get('casoId');
      if (casoIdParam) {
        $('#nomeCaso').val(decodeURIComponent(casoIdParam));
        $('#casoId').val(decodeURIComponent(casoIdParam));
      }
      carregarEvidenciasCaso();
      $('#nomeCaso').on('change', carregarEvidenciasCaso);
    }
  }

  if (window.location.pathname.includes('Adicionar_evidencias.html')) {
    // Captura o casoId da URL e preenche o campo hidden
    const urlParams = new URLSearchParams(window.location.search);
    const casoId = urlParams.get('casoId');
    if (casoId) {
      $('#casoId').val(decodeURIComponent(casoId));
    }

    function carregarEvidenciasTabela() {
      const casoId = urlParams.get('casoId');
      const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
      const tableBody = $('#evidenciasTable');
      if (tableBody) {
        tableBody.empty();
        const evidenciasFiltradas = evidencias.filter(e => e.casoId === casoId);
        evidenciasFiltradas.forEach((evidencia, index) => {
          const row = `
            <tr>
              <td>${evidencia.tituloEvidencia}</td>
              <td>${evidencia.descricaoEvidencia}</td>
              <td>${evidencia.fotoEvidencia || 'Nenhuma foto'}</td>
              <td>
                <button class="btn btn-sm btn-primary me-1" onclick="visualizarEvidencia(${index}, '${casoId}')">
                  <i class="bi bi-eye"></i> Visualizar
                </button>
                <button class="btn btn-sm btn-warning" onclick="editarEvidencia(${index}, '${casoId}')">
                  <i class="bi bi-pencil"></i> Editar
                </button>
              </td>
            </tr>
          `;
          tableBody.append(row);
        });
      }
    }

    function limparFormularioEvidencia() {
      const formEvidencia = $('#formEvidencia');
      if (formEvidencia.length) {
        formEvidencia[0].reset();
        $('#file-name-evidencia').text('Nenhuma foto selecionada');
        $('#editIndex').val('');
        $('#cancelEditEvidencia').hide();
        formEvidencia.removeClass('was-validated');
      }
    }

    window.cancelarEdicao = function() {
      const casoId = urlParams.get('casoId');
      limparFormularioEvidencia();
      window.location.href = `Adicionar_casos.html?casoId=${encodeURIComponent(casoId)}`;
    };

    function verificarModoEdicao() {
      const editIndex = urlParams.get('editIndex');
      const casoId = urlParams.get('casoId');
      if (casoId) $('#casoId').val(casoId);
      if (editIndex !== null) {
        const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
        const evidencia = evidencias[parseInt(editIndex)];
        if (evidencia && evidencia.casoId === casoId) {
          $('#tituloEvidencia').val(evidencia.tituloEvidencia);
          $('#descricaoEvidencia').val(evidencia.descricaoEvidencia);
          $('#file-name-evidencia').text(evidencia.fotoEvidencia || 'Nenhuma foto selecionada');
          $('#editIndex').val(editIndex);
          $('#casoId').val(casoId);
          $('#cancelEditEvidencia').show();
        }
      }
    }

    $('#fotoEvidencia').on('change', function() {
      const fileName = this.files[0]?.name || 'Nenhuma foto selecionada';
      $('#file-name-evidencia').text(fileName);
    });

    $('#clearPhotoEvidencia').on('click', function() {
      $('#fotoEvidencia').val('');
      $('#file-name-evidencia').text('Nenhuma foto selecionada');
    });

    $('#formEvidencia').on('submit', function(e) {
      e.preventDefault();
      const form = this;
      if (!form.checkValidity()) {
        e.stopPropagation();
        $(form).addClass('was-validated');
        return;
      }

      const casoId = $('#casoId').val();
      if (!casoId) {
        mostrarToast('Nenhum caso selecionado.', 'danger');
        return;
      }

      const evidencia = {
        casoId,
        tituloEvidencia: $('#tituloEvidencia').val(),
        descricaoEvidencia: $('#descricaoEvidencia').val(),
        fotoEvidencia: $('#fotoEvidencia').val() ? $('#file-name-evidencia').text() : '',
        dataEvidencia: new Date().toISOString().split('T')[0]
      };

      const evidencias = JSON.parse(localStorage.getItem('evidencias') || '[]');
      const editIndex = $('#editIndex').val();
      if (editIndex !== '') {
        evidencias[parseInt(editIndex)] = evidencia;
      } else {
        evidencias.push(evidencia);
      }

      localStorage.setItem('evidencias', JSON.stringify(evidencias));
      limparFormularioEvidencia();
      carregarEvidenciasTabela();
  
    });

    carregarEvidenciasTabela();
    verificarModoEdicao();
  }

  if (window.location.pathname.includes('Gerenciar_usuarios.html')) {
    function loadUsers() {
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
        if (!Array.isArray(users)) {
          console.warn('Dados de usuários corrompidos. Inicializando como array vazio.');
          users = [];
          localStorage.setItem('users', JSON.stringify(users));
        }
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        mostrarToast('Erro ao carregar usuários.', 'danger');
      }

      const tableBody = $('#userTableBody');
      if (tableBody) {
        tableBody.empty();
        users.forEach((user, index) => {
          tableBody.append(`
            <tr>
              <td>${user.nome}</td>
              <td>${user.email}</td>
              <td>${user.tipo}</td>
              <td>
                <button class="btn btn-black edit-user" data-index="${index}">Editar</button>
                <button class="btn btn-danger delete-user" data-index="${index}">Excluir</button>
              </td>
            </tr>
          `);
        });
      }
    }

    loadUsers();

    $('#userForm').on('submit', function(event) {
      event.preventDefault();
      const userIndex = $('#userIndex').val();
      const user = {
        nome: $('#nome').val(),
        email: $('#email').val(),
        senha: $('#senha').val(),
        tipo: $('#tipo').val()
      };
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
        if (!Array.isArray(users)) users = [];
      } catch (err) {
        console.error('Erro ao parsear usuários:', err);
        users = [];
      }

      if (userIndex === '') {
        users.push(user);
      } else {
        users[userIndex] = user;
        $('#userIndex').val('');
        $('#cancelEdit').hide();
      }

      localStorage.setItem('users', JSON.stringify(users));
      loadUsers();
      $('#userForm')[0].reset();
      mostrarToast('Usuário salvo com sucesso!', 'success');
    });

    $(document).on('click', '.edit-user', function() {
      const index = $(this).data('index');
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users[index];

      $('#nome').val(user.nome);
      $('#email').val(user.email);
      $('#senha').val(user.senha);
      $('#tipo').val(user.tipo);
      $('#userIndex').val(index);
      $('#cancelEdit').show();
    });

    $('#cancelEdit').on('click', function() {
      $('#userForm')[0].reset();
      $('#userIndex').val('');
      $(this).hide();
    });

    $(document).on('click', '.delete-user', function() {
      const index = $(this).data('index');
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      users.splice(index, 1);
      localStorage.setItem('users', JSON.stringify(users));
      loadUsers();
      mostrarToast('Usuário excluído com sucesso!', 'danger');
    });
  }
});

// Inicializar IndexedDB
let dbPromise = null;
const paginasQueUsamIndexedDB = [
  'index.html',
  'Adicionar_casos.html',
  'Laudos.html',
  'Adicionar_evidencias.html',
  'Visualizar_evidencia.html'
];
if (paginasQueUsamIndexedDB.some(pagina => window.location.pathname.includes(pagina))) {
  try {
    dbPromise = idb.openDB('forescanDB', 1, {
      upgrade(db) {
        // Criar objectStore para laudos
        if (!db.objectStoreNames.contains('laudos')) {
          db.createObjectStore('laudos', { keyPath: 'id' });
        }
        // Criar objectStore para evidencias
        if (!db.objectStoreNames.contains('evidencias')) {
          const store = db.createObjectStore('evidencias', { keyPath: 'id', autoIncrement: true });
          store.createIndex('casoId', 'casoId', { unique: false });
        }
      }
    });
    console.log('IndexedDB inicializado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar IndexedDB:', err);
    mostrarToast('Erro ao inicializar o banco de dados.', 'danger');
  }
}