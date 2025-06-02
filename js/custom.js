document.addEventListener('DOMContentLoaded', () => {
  console.log('custom.js modificado carregado com sucesso');

  // Variável global para a instância do mapa do dashboard
  let dashboardMapInstance = null;
  // Variável global para a instância do mapa de seleção de local
  let locationPickerMapInstance = null;
  // Variável global para a instância do gráfico atual
  let currentChartInstance = null;
  // Variável global para armazenar os dados dos casos
  let casos = [];

  // Função para exibir toasts (notificações)
  function mostrarToast(mensagem, tipo = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toastId = `toast-${Date.now()}`;
    let toastClass = 'text-bg-success';
    if (tipo === 'danger') toastClass = 'text-bg-danger';
    else if (tipo === 'warning') toastClass = 'text-bg-warning';
    
    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center ${toastClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="3000">
        <div class="d-flex">
          <div class="toast-body">${mensagem}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
      </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    if(bootstrap && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    } else {
        console.error("Bootstrap Toast não pôde ser inicializado.");
        toastElement.classList.add('show'); // Fallback
    }
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  }

  // Função para definir o ano atual no rodapé
  function getYear() {
    const currentYear = new Date().getFullYear();
    const displayYear = document.querySelector('#displayYear');
    if (displayYear) displayYear.innerHTML = currentYear;
  }
  getYear();

  // Inicializa niceSelect para selects gerais (exceto os específicos)
  try {
    $('select:not(#periodoEvolucao):not(#filtroPerito):not(#filtroTipoCrimeTabela):not(.status-select):not(#seletorGrafico)').niceSelect();
  } catch (err) {
    console.warn('Erro ao inicializar niceSelect geral:', err);
  }

  // Lógica de autenticação
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
      if (navbarMenu && !document.querySelector('.user-greeting-item')) {
        const userItem = document.createElement('li');
        userItem.className = 'nav-item user-greeting-item';
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

  // Configuração do IndexedDB
  let dbPromise = null;
  const paginasQueUsamIndexedDB = ['index.html', 'Adicionar_casos.html', 'Laudos.html'];
  if (paginasQueUsamIndexedDB.some(pagina => window.location.pathname.includes(pagina) || window.location.pathname === '/' || window.location.pathname.endsWith('/forescan/'))) {
    try {
      dbPromise = idb.openDB('forescanDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('laudos')) {
            db.createObjectStore('laudos', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('evidencias')) {
             const evidenciasStore = db.createObjectStore('evidencias', { keyPath: 'id', autoIncrement:true });
             evidenciasStore.createIndex('casoId', 'casoId');
          }
           if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos', { keyPath: 'id' });
          }
        }
      });
      console.log('IndexedDB inicializado.');
    } catch (err) {
      console.error('Erro ao inicializar IndexedDB:', err);
      mostrarToast('Erro ao inicializar o banco de dados.', 'danger');
    }
  }

  // --- LÓGICA ESPECÍFICA DAS PÁGINAS ---

  // Lógica da página de Login (Login.html)
  if (window.location.pathname.includes('Login.html')) {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        let isValid = true;
        if (!email) { emailInput.classList.add('is-invalid'); isValid = false; } 
        else { emailInput.classList.remove('is-invalid'); }
        if (!password) { passwordInput.classList.add('is-invalid'); isValid = false; } 
        else { passwordInput.classList.remove('is-invalid'); }

        if (!isValid) { mostrarToast('Preencha todos os campos.', 'warning'); return; }

        let users = [];
        try {
          const usersRaw = localStorage.getItem('users');
          users = usersRaw ? JSON.parse(usersRaw) : [];
          if (!Array.isArray(users)) { 
            users = []; 
            localStorage.setItem('users', JSON.stringify(users)); 
          }
        } catch (err) { 
          mostrarToast('Erro ao acessar os dados de usuários.', 'danger'); 
          console.error("Erro ao parsear usuários do localStorage:", err);
          users = []; 
          localStorage.setItem('users', JSON.stringify(users)); 
          return; 
        }

        const user = users.find(u => u.email === email && u.senha === password);
        if (user) {
          localStorage.setItem('usuarioLogado', JSON.stringify({ id: user.email, nome: user.nome, tipo: user.tipo, email: user.email }));
          mostrarToast('Login realizado com sucesso!', 'success');
          setTimeout(() => window.location.href = 'index.html', 1000);
        } else {
          mostrarToast('Email ou senha incorretos.', 'danger');
        }
      });
    }
  }

  // Lógica da página de Adicionar Casos (Adicionar_casos.html)
  if (window.location.pathname.includes('Adicionar_casos.html')) {
    const formLaudo = document.getElementById('formLaudo');
    const nomeCasoInput = document.getElementById('nomeCaso');
    let errorDiv = nomeCasoInput ? nomeCasoInput.parentNode.querySelector('.invalid-feedback') : null;
    if (nomeCasoInput && !errorDiv) { 
        errorDiv = document.createElement('div'); errorDiv.className = 'invalid-feedback';
        nomeCasoInput.parentNode.appendChild(errorDiv);
    }
    
    try { 
        $('#peritoNome').niceSelect(); $('#statusCaso').niceSelect();
        $('#tipoCrime').niceSelect(); $('#etniaVitima').niceSelect();
    } catch(e) { console.warn("NiceSelect não aplicado em Adicionar_casos.html:", e); }

    async function validarNomeCaso(nomeCaso, casoId = null) {
      if (!nomeCaso || nomeCaso.trim() === '') return 'O Nome do Caso é obrigatório.';
      const regex = /^[a-zA-Z0-9\s._-]{3,}$/; 
      if (!regex.test(nomeCaso)) return 'Nome do Caso: min 3 caracteres (letras, números, espaços, . _ -).';
      if(!dbPromise) return "Erro de conexão com o banco de dados."; 
      try {
        const db = await dbPromise; const allCasos = await db.getAll('laudos');
        const exists = allCasos.some(c => c.nomeCaso && c.nomeCaso.toLowerCase() === nomeCaso.toLowerCase() && c.id !== casoId);
        if (exists) return 'O Nome do Caso já existe.';
        return null; 
      } catch (err) { console.error("Erro ao validar nome do caso no BD:", err); return 'Erro ao validar o nome do caso.'; }
    }

    function limparFormulario() {
      if (formLaudo) {
        formLaudo.reset();
        if(nomeCasoInput) nomeCasoInput.classList.remove('is-invalid');
        if(errorDiv) errorDiv.textContent = '';
        $('#peritoNome').val($('#peritoNome option:first').val());
        $('#statusCaso').val('Em andamento'); 
        $('#tipoCrime').val($('#tipoCrime option:first').val());
        $('#etniaVitima').val($('#etniaVitima option:first').val());
        try { 
          $('#peritoNome').niceSelect('update'); $('#statusCaso').niceSelect('update');
          $('#tipoCrime').niceSelect('update'); $('#etniaVitima').niceSelect('update');
        } catch (err) { console.error('Erro ao atualizar niceSelect (limpar):', err); }
      }
    }

    if (formLaudo) {
      formLaudo.addEventListener('submit', async e => {
        e.preventDefault();
        const nomeCaso = nomeCasoInput.value.trim();
        const idParam = new URLSearchParams(window.location.search).get('id');
        const casoId = idParam || Date.now().toString(); 
        
        const error = await validarNomeCaso(nomeCaso, idParam ? casoId : null);
        if (error) {
          nomeCasoInput.classList.add('is-invalid'); if(errorDiv) errorDiv.textContent = error;
          formLaudo.classList.add('was-validated'); 
          return;
        } else {
          nomeCasoInput.classList.remove('is-invalid'); if(errorDiv) errorDiv.textContent = '';
        }

        if (!formLaudo.checkValidity()) { 
            e.stopPropagation(); formLaudo.classList.add('was-validated');
            mostrarToast('Por favor, preencha todos os campos obrigatórios.', 'warning'); return;
        }

        const caso = {
          id: casoId, nomeCaso, data: $('#dataPericia').val(), perito: $('#peritoNome').val(),
          status: $('#statusCaso').val(), tipoCrime: $('#tipoCrime').val(),
          idadeVitima: $('#idadeVitima').val() ? parseInt($('#idadeVitima').val(),10) : null,
          etniaVitima: $('#etniaVitima').val(), latitude: $('#latitude').val().trim()||null,
          longitude: $('#longitude').val().trim()||null, descricao: $('#exameDescricao').val(),
          observacoes: $('#observacoes').val(), fotos: [] 
        };

        if (!dbPromise) { mostrarToast('Erro: Conexão com banco de dados não estabelecida.', 'danger'); return; }
        try {
          const db = await dbPromise; await db.put('laudos', caso); 
          mostrarToast(`Caso ${idParam ? 'atualizado':'salvo'} com sucesso!`, 'success');
          if (!idParam) limparFormulario(); 
          setTimeout(() => { window.location.href = 'index.html'; }, 1500); 
        } catch (err) { mostrarToast('Erro ao salvar o caso.', 'danger'); console.error("Erro ao salvar caso:", err); }
      });

      const urlParams = new URLSearchParams(window.location.search);
      const casoIdParam = urlParams.get('id');
      if (casoIdParam) {
        (async () => {
          if (!dbPromise) { mostrarToast('Erro de BD ao carregar dados para edição.', 'danger'); return; }
          try {
            const db = await dbPromise; const caso = await db.get('laudos', casoIdParam);
            if (caso) {
              $('#nomeCaso').val(caso.nomeCaso||''); $('#dataPericia').val(caso.data||'');
              $('#peritoNome').val(caso.perito||''); $('#statusCaso').val(caso.status||'Em andamento');
              $('#tipoCrime').val(caso.tipoCrime||''); $('#idadeVitima').val(caso.idadeVitima||'');
              $('#etniaVitima').val(caso.etniaVitima||''); $('#latitude').val(caso.latitude||'');
              $('#longitude').val(caso.longitude||''); $('#exameDescricao').val(caso.descricao||'');
              $('#observacoes').val(caso.observacoes||''); $('#casoId').val(casoIdParam);
              try { 
                $('#peritoNome').niceSelect('update'); $('#statusCaso').niceSelect('update');
                $('#tipoCrime').niceSelect('update'); $('#etniaVitima').niceSelect('update');
              } catch (err) { console.error('Erro ao atualizar niceSelect (edição):', err); }
              if (caso.latitude && caso.longitude) {
                initializeLocationPickerMap(parseFloat(caso.latitude), parseFloat(caso.longitude));
              } else {
                initializeLocationPickerMap(); 
              }
            } else { mostrarToast('Caso não encontrado para edição.', 'warning'); }
          } catch (err) { mostrarToast('Erro ao carregar o caso para edição.', 'danger'); console.error("Erro ao carregar caso para edição:", err);}
        })();
      } else {
        initializeLocationPickerMap(); 
      }
    }
    function initializeLocationPickerMap(initialLat, initialLng) {
        const mapElement = document.getElementById('locationPickerMap');
        if (mapElement && typeof L !== 'undefined') {
            if (locationPickerMapInstance) { 
                locationPickerMapInstance.remove();
                locationPickerMapInstance = null;
            }
            const defaultView = [-8.05428, -34.8813]; 
            const startLat = initialLat && !isNaN(initialLat) ? initialLat : defaultView[0];
            const startLng = initialLng && !isNaN(initialLng) ? initialLng : defaultView[1];
            const zoomLevel = (initialLat && initialLng) ? 15 : 13;

            locationPickerMapInstance = L.map('locationPickerMap').setView([startLat, startLng], zoomLevel);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(locationPickerMapInstance);

            let marker;
            if (initialLat && initialLng) {
                marker = L.marker([startLat, startLng]).addTo(locationPickerMapInstance);
            }

            locationPickerMapInstance.on('click', function(e) {
                const { lat, lng } = e.latlng;
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng]).addTo(locationPickerMapInstance);
                }
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                if (latInput) latInput.value = lat.toFixed(6);
                if (lngInput) lngInput.value = lng.toFixed(6);
            });
        } else {
            console.warn("Elemento do mapa 'locationPickerMap' não encontrado ou Leaflet não carregado.");
        }
    }
  }

  // Lógica da página principal (Dashboard - index.html)
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/forescan/')) {
    const totalLaudosEl = document.getElementById('totalLaudos');
    const laudosHojeEl = document.getElementById('laudosHoje');
    const peritoAtivoEl = document.getElementById('peritoAtivo');
    const laudosTableBody = document.getElementById('laudosTable');
    const filtroDataInicioEl = document.getElementById('filtroDataInicio');
    const filtroDataFimEl = document.getElementById('filtroDataFim');
    const filtroTipoCrimeTabelaEl = document.getElementById('filtroTipoCrimeTabela');
    const filtroPeritoEl = document.getElementById('filtroPerito');
    const filtroNomeCasoEl = document.getElementById('filtroNomeCaso');
    const paginationNumbersEl = document.getElementById('paginationNumbers');
    
    // Elementos para o novo seletor de gráficos
    const seletorGraficoEl = document.getElementById('seletorGrafico');
    const graficoCanvasEl = document.getElementById('graficoAtual');
    const graficoTituloEl = document.getElementById('graficoTitulo');
    const controlesEvolucaoEl = document.getElementById('controlesEvolucao');
    const dataInicioEvolucaoEl = document.getElementById('dataInicioEvolucao');
    const dataFimEvolucaoEl = document.getElementById('dataFimEvolucao');
    const periodoEvolucaoSelect = document.getElementById('periodoEvolucao');
    const filtrarGraficoEvolucaoBtn = document.getElementById('filtrarGraficoEvolucao');
    const limparFiltroEvolucaoBtn = document.getElementById('limparFiltroEvolucao');

    let currentPage = 1; const itemsPerPage = 10;
    let filtros = { dataInicio: '', dataFim: '', tipoCrime: '', perito: '', nomeCaso: '' };

    async function carregarDados() {
      if (!dbPromise) { mostrarToast('Erro: Banco de dados não disponível.', 'danger'); return; }
      try {
        const db = await dbPromise; casos = await db.getAll('laudos');
        console.log(`Dados carregados: ${casos.length} casos.`);
        atualizarDashboard();
        preencherFiltros();
        aplicarFiltros(); // Renderiza a tabela inicial
        // Exibe o gráfico padrão (Casos por Perito) ao carregar
        if (seletorGraficoEl) {
          exibirGraficoSelecionado(); 
        }
        prepararDadosParaDashboardMapa(); // Atualiza o mapa
      } catch (err) {
        mostrarToast('Erro ao carregar dados do banco.', 'danger');
        console.error('Erro ao carregar dados:', err);
      }
    }

    function atualizarDashboard() {
      if (!casos) return;
      const total = casos.length;
      const hoje = new Date().toISOString().split('T')[0];
      const laudosHoje = casos.filter(c => c.data === hoje).length;
      const peritosCount = casos.reduce((acc, c) => { if(c.perito) acc[c.perito] = (acc[c.perito] || 0) + 1; return acc; }, {});
      const peritoMaisAtivo = Object.entries(peritosCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';
      if (totalLaudosEl) totalLaudosEl.textContent = total;
      if (laudosHojeEl) laudosHojeEl.textContent = laudosHoje;
      if (peritoAtivoEl) peritoAtivoEl.textContent = peritoMaisAtivo;
      
      // Atualiza o gráfico selecionado atualmente
      exibirGraficoSelecionado();
    }

    function preencherFiltros() {
      if (!casos || !filtroTipoCrimeTabelaEl) return;
      const tiposCrime = [...new Set(casos.map(c => c.tipoCrime).filter(Boolean))].sort();
      filtroTipoCrimeTabelaEl.innerHTML = '<option value="">Todos</option>'; // Limpa e adiciona a opção padrão
      tiposCrime.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo; option.textContent = tipo;
        filtroTipoCrimeTabelaEl.appendChild(option);
      });
      // Nota: NiceSelect não é usado aqui, então não precisa de update
    }

    window.aplicarFiltros = function() {
      filtros.dataInicio = filtroDataInicioEl ? filtroDataInicioEl.value : '';
      filtros.dataFim = filtroDataFimEl ? filtroDataFimEl.value : '';
      filtros.tipoCrime = filtroTipoCrimeTabelaEl ? filtroTipoCrimeTabelaEl.value : '';
      filtros.perito = filtroPeritoEl ? filtroPeritoEl.value : '';
      filtros.nomeCaso = filtroNomeCasoEl ? filtroNomeCasoEl.value.toLowerCase() : '';
      currentPage = 1;
      renderizarTabela();
    }

    window.limparFiltros = function() {
      if(filtroDataInicioEl) filtroDataInicioEl.value = '';
      if(filtroDataFimEl) filtroDataFimEl.value = '';
      if(filtroTipoCrimeTabelaEl) filtroTipoCrimeTabelaEl.value = '';
      if(filtroPeritoEl) filtroPeritoEl.value = '';
      if(filtroNomeCasoEl) filtroNomeCasoEl.value = '';
      // Nota: NiceSelect não é usado para filtroPerito e filtroTipoCrimeTabela, então não precisa de update
      aplicarFiltros();
    }

    function renderizarTabela() {
      if (!casos || !laudosTableBody) return;
      let casosFiltrados = casos.filter(c => {
        const dataCaso = c.data ? new Date(c.data + 'T00:00:00') : null;
        const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : null;
        const dataFim = filtros.dataFim ? new Date(filtros.dataFim + 'T23:59:59') : null;
        return (!dataInicio || (dataCaso && dataCaso >= dataInicio)) &&
               (!dataFim || (dataCaso && dataCaso <= dataFim)) &&
               (!filtros.tipoCrime || c.tipoCrime === filtros.tipoCrime) &&
               (!filtros.perito || c.perito === filtros.perito) &&
               (!filtros.nomeCaso || (c.nomeCaso && c.nomeCaso.toLowerCase().includes(filtros.nomeCaso)));
      });

      casosFiltrados.sort((a, b) => (b.data || '').localeCompare(a.data || '')); // Ordena por data descendente

      const totalItems = casosFiltrados.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const casosPaginados = casosFiltrados.slice(startIndex, endIndex);

      laudosTableBody.innerHTML = '';
      if (casosPaginados.length === 0) {
        laudosTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum caso encontrado com os filtros aplicados.</td></tr>';
      } else {
        casosPaginados.forEach(caso => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${caso.id}</td>
            <td>${caso.nomeCaso || 'N/A'}</td>
            <td>${caso.data ? new Date(caso.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td>${caso.tipoCrime || 'N/A'}</td>
            <td>${caso.perito || 'N/A'}</td>
            <td><span class="badge ${getStatusBadgeClass(caso.status)}">${caso.status || 'N/A'}</span></td>
            <td class="d-flex justify-content-center gap-1">
              <a href="Adicionar_casos.html?id=${caso.id}" class="btn btn-dark btn-sm action-btn" title="Editar"><i class="bi bi-pencil-fill"></i></a>
              <button class="btn btn-danger btn-sm action-btn" onclick="excluirCaso('${caso.id}')" title="Excluir"><i class="bi bi-trash-fill"></i></button>
              <button class="btn btn-info btn-sm action-btn" onclick="gerarPDF('${caso.id}')" title="Gerar PDF"><i class="bi bi-file-earmark-pdf-fill"></i></button>
              <a href="Adicionar_evidencias.html?casoId=${caso.id}" class="btn btn-success btn-sm action-btn" title="Gerenciar Evidências"><i class="bi bi-folder-plus"></i></a>
            </td>
          `;
          laudosTableBody.appendChild(row);
        });
      }
      renderizarPaginacao(totalPages);
    }

    function getStatusBadgeClass(status) {
      switch (status) {
        case 'Finalizado': return 'bg-success';
        case 'Arquivado': return 'bg-secondary';
        case 'Em andamento':
        default: return 'bg-warning text-dark';
      }
    }

    function renderizarPaginacao(totalPages) {
      if (!paginationNumbersEl) return;
      paginationNumbersEl.innerHTML = '';
      const maxPagesToShow = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      if (endPage - startPage + 1 < maxPagesToShow) {
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      if (startPage > 1) {
          paginationNumbersEl.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="irParaPagina(1)">1</a></li>`;
          if (startPage > 2) paginationNumbersEl.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }

      for (let i = startPage; i <= endPage; i++) {
        paginationNumbersEl.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="irParaPagina(${i})">${i}</a></li>`;
      }

      if (endPage < totalPages) {
          if (endPage < totalPages - 1) paginationNumbersEl.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
          paginationNumbersEl.innerHTML += `<li class="page-item"><a class="page-link" href="#" onclick="irParaPagina(${totalPages})">${totalPages}</a></li>`;
      }
      
      // Habilita/desabilita botões Anterior/Próximo
      const prevButton = document.querySelector('.pagination .page-item:first-child');
      const nextButton = document.querySelector('.pagination .page-item:last-child');
      if (prevButton) prevButton.classList.toggle('disabled', currentPage === 1);
      if (nextButton) nextButton.classList.toggle('disabled', currentPage === totalPages);
    }

    window.irParaPagina = function(pageNumber) {
      currentPage = pageNumber;
      renderizarTabela();
    }

    window.paginaAnterior = function() {
      if (currentPage > 1) {
        currentPage--;
        renderizarTabela();
      }
    }

    window.proximaPagina = function() {
      const totalItems = casos.filter(c => {
        const dataCaso = c.data ? new Date(c.data + 'T00:00:00') : null;
        const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : null;
        const dataFim = filtros.dataFim ? new Date(filtros.dataFim + 'T23:59:59') : null;
        return (!dataInicio || (dataCaso && dataCaso >= dataInicio)) &&
               (!dataFim || (dataCaso && dataCaso <= dataFim)) &&
               (!filtros.tipoCrime || c.tipoCrime === filtros.tipoCrime) &&
               (!filtros.perito || c.perito === filtros.perito) &&
               (!filtros.nomeCaso || (c.nomeCaso && c.nomeCaso.toLowerCase().includes(filtros.nomeCaso)));
      }).length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderizarTabela();
      }
    }

    window.excluirCaso = async function(id) {
      if (!dbPromise) { mostrarToast('Erro de conexão com o banco.', 'danger'); return; }
      if (confirm('Tem certeza que deseja excluir este caso? Esta ação não pode ser desfeita.')) {
        try {
          const db = await dbPromise; 
          
          // Excluir evidências relacionadas ao caso
          const tx = db.transaction('evidencias', 'readwrite');
          const evidenciasStore = tx.objectStore('evidencias');
          const evidenciasIndex = evidenciasStore.index('casoId');
          const evidenciasDoCaso = await evidenciasIndex.getAll(id);
          
          for (const evidencia of evidenciasDoCaso) {
            await evidenciasStore.delete(evidencia.id);
          }
          
          // Excluir o caso
          await db.delete('laudos', id);
          
          mostrarToast('Caso excluído com sucesso!', 'success');
          carregarDados(); // Recarrega os dados e atualiza a interface
        } catch (err) {
          mostrarToast('Erro ao excluir o caso.', 'danger');
          console.error('Erro ao excluir caso:', err);
        }
      }
    }

    window.gerarPDF = async function(id) {
      if (!dbPromise) { mostrarToast('Erro de conexão com o banco.', 'danger'); return; }
      if (typeof jspdf === 'undefined') { mostrarToast('Biblioteca jsPDF não carregada.', 'danger'); return; }
      try {
        const db = await dbPromise;
        const caso = await db.get('laudos', id);
        if (!caso) { mostrarToast('Caso não encontrado.', 'warning'); return; }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        let y = 15;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 10;

        function addText(text, x, currentY, options = {}) {
            if (currentY > pageHeight - margin * 2) { // Check if close to bottom margin
                doc.addPage();
                currentY = margin; // Reset Y for new page
            }
            doc.text(text, x, currentY, options);
            return currentY + (options.lineSpacing || 6); // Return new Y position
        }

        doc.setFontSize(16);
        y = addText(`Laudo Pericial - Caso: ${caso.nomeCaso || 'N/A'}`, margin, y);
        y += 5;
        doc.setFontSize(12);
        y = addText(`ID do Caso: ${caso.id}`, margin, y);
        y = addText(`Data da Perícia: ${caso.data ? new Date(caso.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}`, margin, y);
        y = addText(`Perito Responsável: ${caso.perito || 'N/A'}`, margin, y);
        y = addText(`Status: ${caso.status || 'N/A'}`, margin, y);
        y = addText(`Tipo de Crime: ${caso.tipoCrime || 'N/A'}`, margin, y);
        y = addText(`Idade da Vítima: ${caso.idadeVitima !== null ? caso.idadeVitima : 'N/A'}`, margin, y);
        y = addText(`Etnia da Vítima: ${caso.etniaVitima || 'N/A'}`, margin, y);
        y = addText(`Localização: Lat ${caso.latitude || 'N/A'}, Lng ${caso.longitude || 'N/A'}`, margin, y);
        y += 5;

        doc.setFontSize(14);
        y = addText('Descrição do Exame:', margin, y);
        doc.setFontSize(10);
        const descLines = doc.splitTextToSize(caso.descricao || 'Nenhuma descrição fornecida.', doc.internal.pageSize.width - margin * 2);
        descLines.forEach(line => {
            y = addText(line, margin, y, { lineSpacing: 5 });
        });
        y += 5;

        doc.setFontSize(14);
        y = addText('Observações:', margin, y);
        doc.setFontSize(10);
        const obsLines = doc.splitTextToSize(caso.observacoes || 'Nenhuma observação fornecida.', doc.internal.pageSize.width - margin * 2);
        obsLines.forEach(line => {
            y = addText(line, margin, y, { lineSpacing: 5 });
        });
        
        // Adicionar evidências ao PDF do banco forenscanDB
        try {
          // Tentar primeiro buscar do banco forenscanDB (usado na página Adicionar_evidencias.html)
          let forenscanDB = null;
          try {
            forenscanDB = await idb.openDB('forenscanDB', 1);
          } catch (err) {
            console.log('Banco forenscanDB não encontrado, usando forescanDB para evidências');
          }
          
          let evidenciasDoCaso = [];
          
          if (forenscanDB) {
            // Buscar evidências do banco forenscanDB
            try {
              const tx = forenscanDB.transaction('evidencias', 'readonly');
              const evidenciasStore = tx.objectStore('evidencias');
              const evidenciasIndex = evidenciasStore.index('casoId');
              evidenciasDoCaso = await evidenciasIndex.getAll(parseInt(id));
              console.log(`Encontradas ${evidenciasDoCaso.length} evidências no banco forenscanDB`);
            } catch (err) {
              console.error('Erro ao buscar evidências do forenscanDB:', err);
              // Se falhar, tenta buscar do forescanDB
              const tx = db.transaction('evidencias', 'readonly');
              const evidenciasStore = tx.objectStore('evidencias');
              const evidenciasIndex = evidenciasStore.index('casoId');
              evidenciasDoCaso = await evidenciasIndex.getAll(id);
              console.log(`Encontradas ${evidenciasDoCaso.length} evidências no banco forescanDB`);
            }
          } else {
            // Se não encontrar o forenscanDB, busca do forescanDB
            const tx = db.transaction('evidencias', 'readonly');
            const evidenciasStore = tx.objectStore('evidencias');
            const evidenciasIndex = evidenciasStore.index('casoId');
            evidenciasDoCaso = await evidenciasIndex.getAll(id);
            console.log(`Encontradas ${evidenciasDoCaso.length} evidências no banco forescanDB`);
          }
          
          if (evidenciasDoCaso.length > 0) {
            y += 10;
            doc.setFontSize(14);
            y = addText('Evidências:', margin, y);
            doc.setFontSize(10);
            
            // Função para processar imagem e adicionar ao PDF com proporção correta
            const processarImagem = (photo, titulo, descricao, dataRegistro, currentY) => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                  const imgData = event.target.result;
                  
                  // Criar um objeto de imagem para obter dimensões reais
                  const img = new Image();
                  img.onload = function() {
                    // Verificar se precisa adicionar nova página para a imagem
                    if (currentY > pageHeight - 60) {
                      doc.addPage();
                      currentY = margin;
                    }
                    
                    // Adicionar título e número da evidência
                    currentY = addText(`${titulo}`, margin, currentY, { lineSpacing: 5 });
                    
                    // Adicionar descrição
                    const evidenciaLines = doc.splitTextToSize(`   Descrição: ${descricao}`, pageWidth - margin * 2 - 10);
                    evidenciaLines.forEach(line => {
                      currentY = addText(line, margin, currentY, { lineSpacing: 5 });
                    });
                    
                    // Adicionar data de registro
                    const dataFormatada = new Date(dataRegistro).toLocaleDateString('pt-BR');
                    currentY = addText(`   Data de Registro: ${dataFormatada}`, margin, currentY, { lineSpacing: 5 });
                    
                    // Calcular dimensões para manter proporção
                    const maxWidth = pageWidth - (margin * 2);
                    const maxHeight = 80; // Altura máxima para a imagem
                    
                    // Calcular proporção
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    const ratio = imgWidth / imgHeight;
                    
                    let finalWidth, finalHeight;
                    
                    if (imgWidth > imgHeight) {
                      // Imagem horizontal
                      finalWidth = Math.min(maxWidth, imgWidth);
                      finalHeight = finalWidth / ratio;
                      
                      // Verificar se a altura excede o máximo
                      if (finalHeight > maxHeight) {
                        finalHeight = maxHeight;
                        finalWidth = finalHeight * ratio;
                      }
                    } else {
                      // Imagem vertical ou quadrada
                      finalHeight = Math.min(maxHeight, imgHeight);
                      finalWidth = finalHeight * ratio;
                      
                      // Verificar se a largura excede o máximo
                      if (finalWidth > maxWidth) {
                        finalWidth = maxWidth;
                        finalHeight = finalWidth / ratio;
                      }
                    }
                    
                    // Verificar se precisa adicionar nova página para a imagem
                    if (currentY + finalHeight > pageHeight - margin) {
                      doc.addPage();
                      currentY = margin;
                    }
                    
                    // Centralizar a imagem horizontalmente
                    const xPos = margin + (maxWidth - finalWidth) / 2;
                    
                    // Adicionar a imagem ao PDF
                    try {
                      doc.addImage(imgData, 'JPEG', xPos, currentY, finalWidth, finalHeight, undefined, 'FAST');
                      currentY += finalHeight + 10; // Avançar o cursor após a imagem
                    } catch (err) {
                      console.error('Erro ao adicionar imagem ao PDF:', err);
                    }
                    
                    // Adicionar espaço após a imagem
                    currentY += 5;
                    
                    resolve(currentY);
                  };
                  
                  img.src = imgData;
                };
                reader.readAsDataURL(photo.data);
              });
            };
            
            // Processar cada evidência sequencialmente
            for (let i = 0; i < evidenciasDoCaso.length; i++) {
              const evidencia = evidenciasDoCaso[i];
              
              // Verificar se precisa adicionar nova página
              if (y > pageHeight - 60) {
                doc.addPage();
                y = margin;
              }
              
              // Adaptar para os diferentes formatos de dados entre os bancos
              const titulo = `${i + 1}. ${evidencia.title || evidencia.titulo || 'Sem título'}`;
              const descricao = evidencia.description || evidencia.descricao || 'Sem descrição';
              const dataRegistro = evidencia.dataCriacao || evidencia.dataRegistro || new Date().toISOString();
              const photoId = evidencia.photoId;
              
              // Se não tiver foto, apenas adiciona o texto
              if (!photoId) {
                // Adicionar título e número da evidência
                y = addText(titulo, margin, y, { lineSpacing: 5 });
                
                // Adicionar descrição
                const evidenciaLines = doc.splitTextToSize(`   Descrição: ${descricao}`, pageWidth - margin * 2 - 10);
                evidenciaLines.forEach(line => {
                  y = addText(line, margin, y, { lineSpacing: 5 });
                });
                
                // Adicionar data de registro
                const dataFormatada = new Date(dataRegistro).toLocaleDateString('pt-BR');
                y = addText(`   Data de Registro: ${dataFormatada}`, margin, y, { lineSpacing: 5 });
                
                y += 5; // Espaço adicional entre evidências
              } else {
                // Tentar buscar a foto
                try {
                  let photo = null;
                  
                  // Tentar buscar a foto do banco forenscanDB primeiro
                  if (forenscanDB) {
                    try {
                      photo = await forenscanDB.get('photos', photoId);
                    } catch (err) {
                      console.log('Foto não encontrada no forenscanDB, tentando forescanDB');
                    }
                  }
                  
                  // Se não encontrou no forenscanDB, tenta no forescanDB
                  if (!photo) {
                    try {
                      photo = await db.get('photos', photoId);
                    } catch (err) {
                      console.log('Foto não encontrada no forescanDB');
                    }
                  }
                  
                  if (photo && photo.data) {
                    // Processar a imagem e atualizar a posição Y
                    y = await processarImagem(photo, titulo, descricao, dataRegistro, y);
                  } else {
                    // Se não encontrou a foto, adiciona apenas o texto
                    y = addText(titulo, margin, y, { lineSpacing: 5 });
                    
                    const evidenciaLines = doc.splitTextToSize(`   Descrição: ${descricao}`, pageWidth - margin * 2 - 10);
                    evidenciaLines.forEach(line => {
                      y = addText(line, margin, y, { lineSpacing: 5 });
                    });
                    
                    const dataFormatada = new Date(dataRegistro).toLocaleDateString('pt-BR');
                    y = addText(`   Data de Registro: ${dataFormatada}`, margin, y, { lineSpacing: 5 });
                    
                    y += 5; // Espaço adicional entre evidências
                  }
                } catch (err) {
                  console.error('Erro ao processar imagem para o PDF:', err);
                  
                  // Em caso de erro, adiciona apenas o texto
                  y = addText(titulo, margin, y, { lineSpacing: 5 });
                  
                  const evidenciaLines = doc.splitTextToSize(`   Descrição: ${descricao}`, pageWidth - margin * 2 - 10);
                  evidenciaLines.forEach(line => {
                    y = addText(line, margin, y, { lineSpacing: 5 });
                  });
                  
                  const dataFormatada = new Date(dataRegistro).toLocaleDateString('pt-BR');
                  y = addText(`   Data de Registro: ${dataFormatada}`, margin, y, { lineSpacing: 5 });
                  
                  y += 5; // Espaço adicional entre evidências
                }
              }
            }
          }
        } catch (err) {
          console.error('Erro ao adicionar evidências ao PDF:', err);
        }

        doc.save(`Laudo_${caso.nomeCaso || caso.id}.pdf`);
        mostrarToast('PDF gerado com sucesso!', 'success');
      } catch (err) {
        mostrarToast('Erro ao gerar PDF.', 'danger');
        console.error('Erro ao gerar PDF:', err);
      }
    };

    // --- FUNÇÕES DE ATUALIZAÇÃO DOS GRÁFICOS (MODIFICADAS) ---
    function atualizarGrafico(canvasContext, tipoGrafico, dadosGrafico) {
        if (!canvasContext || typeof Chart === 'undefined') return null;
        
        // Destruir instância anterior se existir
        if (currentChartInstance instanceof Chart) {
            currentChartInstance.destroy();
            currentChartInstance = null;
        }
        
        if (!dadosGrafico || !dadosGrafico.data || !dadosGrafico.options) {
            console.warn(`Dados inválidos para o gráfico ${tipoGrafico}`);
            return null;
        }

        try {
            currentChartInstance = new Chart(canvasContext, {
                type: tipoGrafico,
                data: dadosGrafico.data,
                options: dadosGrafico.options
            });
            return currentChartInstance;
        } catch (error) {
            console.error(`Erro ao criar o gráfico ${tipoGrafico}:`, error);
            return null;
        }
    }

    function prepararDadosGraficoPerito() {
        if (!casos) return null;
        const counts = {};
        casos.forEach(c => { if(c.perito) counts[c.perito] = (counts[c.perito] || 0) + 1; });
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const bg = labels.map(() => `rgba(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, 0.7)`);
        return {
            data: { labels, datasets: [{ label: 'Nº de Casos', data, backgroundColor: bg, borderColor: bg.map(c => c.replace('0.7', '1')), borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Casos por Perito' } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } } }
        };
    }

    function prepararDadosGraficoStatus() {
        if (!casos) return null;
        const counts = { 'Em andamento': 0, 'Finalizado': 0, 'Arquivado': 0 }; let total = 0;
        casos.forEach(c => { const s = c.status && counts.hasOwnProperty(c.status) ? c.status : 'Em andamento'; counts[s]++; total++; });
        if (total === 0) return null;
        const labels = ['Em Andamento', 'Finalizado', 'Arquivado'];
        const data = [counts['Em andamento'], counts['Finalizado'], counts['Arquivado']];
        const bg = ['rgba(255,159,64,0.7)', 'rgba(75,192,192,0.7)', 'rgba(153,102,255,0.7)'];
        return {
            data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: bg.map(c => c.replace('0.7', '1')), borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Distribuição de Status dos Casos' }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${(c.raw / total * 100).toFixed(1)}%)` } } } }
        };
    }

    function prepararDadosGraficoTipoCrime() {
        if (!casos) return null;
        const counts = {}; let total = 0;
        casos.forEach(c => { if (c.tipoCrime) { const tipo = c.tipoCrime.trim() || "Não Especificado"; counts[tipo] = (counts[tipo] || 0) + 1; total++; } });
        if (total === 0) return null;
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const bg = labels.map(() => `rgba(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, 0.7)`);
        return {
            data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: bg.map(c => c.replace('0.7', '1')), borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, title: { display: true, text: 'Casos por Tipo de Crime' }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${(c.raw / total * 100).toFixed(1)}%)` } } } }
        };
    }

    function prepararDadosGraficoEtniaVitima() {
        if (!casos) return null;
        const counts = {}; let total = 0;
        casos.forEach(c => { if (c.etniaVitima !== undefined && c.etniaVitima !== null) { const etnia = c.etniaVitima ? c.etniaVitima.trim() : "Não Informada"; counts[etnia] = (counts[etnia] || 0) + 1; total++; } });
        if (total === 0) return null;
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const bg = labels.map(() => `rgba(${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, ${Math.floor(Math.random() * 200 + 55)}, 0.7)`);
        return {
            data: { labels, datasets: [{ data, backgroundColor: bg, borderColor: bg.map(c => c.replace('0.7', '1')), borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, title: { display: true, text: 'Casos por Etnia da Vítima' }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${(c.raw / total * 100).toFixed(1)}%)` } } } }
        };
    }

    function prepararDadosGraficoFaixaEtariaVitima() {
        if (!casos) return null;
        const faixas = { '0-17': 0, '18-29': 0, '30-45': 0, '46-59': 0, '60+': 0, 'Não Informada': 0 }; let total = 0;
        casos.forEach(c => { if (c.idadeVitima !== undefined) { const idade = c.idadeVitima;
            if (idade === null || idade === '') faixas['Não Informada']++;
            else if (idade >= 0 && idade <= 17) faixas['0-17']++; else if (idade >= 18 && idade <= 29) faixas['18-29']++;
            else if (idade >= 30 && idade <= 45) faixas['30-45']++; else if (idade >= 46 && idade <= 59) faixas['46-59']++;
            else if (idade >= 60) faixas['60+']++; else faixas['Não Informada']++; total++; } });
        if (total === 0) return null;
        const labels = Object.keys(faixas);
        const data = Object.values(faixas);
        const bg = ['rgba(255,99,132,0.7)', 'rgba(54,162,235,0.7)', 'rgba(255,206,86,0.7)', 'rgba(75,192,192,0.7)', 'rgba(153,102,255,0.7)', 'rgba(201,203,207,0.7)'];
        return {
            data: { labels, datasets: [{ label: 'Nº de Casos', data, backgroundColor: bg, borderColor: bg.map(c => c.replace('0.7', '1')), borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Casos por Faixa Etária da Vítima' } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } } }
        };
    }

    function prepararDadosGraficoEvolucaoCasos() {
        if (!casos || !periodoEvolucaoSelect) return null;
        const periodo = periodoEvolucaoSelect.value;
        const dataInicioFiltro = dataInicioEvolucaoEl ? dataInicioEvolucaoEl.value : null;
        const dataFimFiltro = dataFimEvolucaoEl ? dataFimEvolucaoEl.value : null;
        let casosParaGrafico = [...casos];
        if (dataInicioFiltro && dataFimFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data >= dataInicioFiltro && c.data <= dataFimFiltro);
        else if (dataInicioFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data >= dataInicioFiltro);
        else if (dataFimFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data <= dataFimFiltro);
        const counts = {}; let total = 0;
        casosParaGrafico.forEach(c => { if (c.data) { const dt = new Date(c.data + "T00:00:00"); if (isNaN(dt.getTime())) return;
            let chave = periodo === 'mensal' ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` : dt.getFullYear().toString();
            counts[chave] = (counts[chave] || 0) + 1; total++; } });
        if (total === 0) return null;
        const labels = Object.keys(counts).sort(); const data = labels.map(l => counts[l]);
        return {
            data: { labels, datasets: [{ label: 'Nº de Casos', data, borderColor: '#A7CAC9', backgroundColor: 'rgba(167,202,201,0.3)', fill: true, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }, x: { title: { display: true, text: periodo === 'mensal' ? 'Mês/Ano' : 'Ano' } } }, plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: `Evolução de Casos (${periodo === 'mensal' ? 'Mensal' : 'Anual'})` } } }
        };
    }

    // --- FUNÇÃO PRINCIPAL PARA EXIBIR GRÁFICO SELECIONADO ---
    function exibirGraficoSelecionado() {
        if (!seletorGraficoEl || !graficoCanvasEl || !graficoTituloEl || !controlesEvolucaoEl) {
            console.error("Elementos essenciais para o gráfico não encontrados.");
            return;
        }
        const selectedOption = seletorGraficoEl.options[seletorGraficoEl.selectedIndex];
        const graficoId = selectedOption.value;
        const graficoNome = selectedOption.text;
        const canvasContext = graficoCanvasEl.getContext('2d');
        
        graficoTituloEl.textContent = graficoNome; // Atualiza o título do card
        
        let dadosGrafico = null;
        let tipoChart = 'bar'; // Default type

        switch (graficoId) {
            case 'peritoChart':
                dadosGrafico = prepararDadosGraficoPerito();
                tipoChart = 'bar'; 
                break;
            case 'statusPercentChart':
                dadosGrafico = prepararDadosGraficoStatus();
                tipoChart = 'pie';
                break;
            case 'tipoCrimeChart':
                dadosGrafico = prepararDadosGraficoTipoCrime();
                tipoChart = 'doughnut';
                break;
            case 'etniaVitimaChart':
                dadosGrafico = prepararDadosGraficoEtniaVitima();
                tipoChart = 'pie';
                break;
            case 'faixaEtariaVitimaChart':
                dadosGrafico = prepararDadosGraficoFaixaEtariaVitima();
                tipoChart = 'bar';
                break;
            case 'evolucaoCasosChart':
                dadosGrafico = prepararDadosGraficoEvolucaoCasos();
                tipoChart = 'line';
                break;
            default:
                console.warn(`Tipo de gráfico desconhecido: ${graficoId}`);
                // Limpar canvas se nenhum gráfico for selecionado ou válido
                if (currentChartInstance instanceof Chart) currentChartInstance.destroy();
                currentChartInstance = null;
                canvasContext.clearRect(0, 0, graficoCanvasEl.width, graficoCanvasEl.height);
                graficoTituloEl.textContent = "Selecione um gráfico";
                break;
        }

        // Mostra/esconde controles específicos do gráfico de evolução
        controlesEvolucaoEl.style.display = (graficoId === 'evolucaoCasosChart') ? 'block' : 'none';

        // Atualiza o gráfico no canvas centralizado
        if (dadosGrafico) {
            atualizarGrafico(canvasContext, tipoChart, dadosGrafico);
        } else {
            // Limpa o canvas se não houver dados para o gráfico selecionado
            if (currentChartInstance instanceof Chart) currentChartInstance.destroy();
            currentChartInstance = null;
            canvasContext.clearRect(0, 0, graficoCanvasEl.width, graficoCanvasEl.height);
            graficoTituloEl.textContent = `${graficoNome} (Sem dados)`;
            console.log(`Sem dados para exibir o gráfico: ${graficoNome}`);
        }
    }

    // Adiciona o listener ao seletor de gráficos
    if (seletorGraficoEl) {
        seletorGraficoEl.addEventListener('change', exibirGraficoSelecionado);
    }

    // Adiciona listeners aos controles do gráfico de evolução
    if (filtrarGraficoEvolucaoBtn) filtrarGraficoEvolucaoBtn.addEventListener('click', exibirGraficoSelecionado);
    if (periodoEvolucaoSelect) periodoEvolucaoSelect.addEventListener('change', exibirGraficoSelecionado);
    if (limparFiltroEvolucaoBtn) {
        limparFiltroEvolucaoBtn.addEventListener('click', () => {
            if(dataInicioEvolucaoEl) dataInicioEvolucaoEl.value = ''; 
            if(dataFimEvolucaoEl) dataFimEvolucaoEl.value = '';
            // Garante que o gráfico de evolução seja re-renderizado após limpar
            if (seletorGraficoEl.value === 'evolucaoCasosChart') {
                exibirGraficoSelecionado();
            }
        });
    }
    // Inicializa niceSelect para o seletor de período (se necessário e não feito antes)
    try { if(periodoEvolucaoSelect && !$(periodoEvolucaoSelect).data('niceSelect')) $(periodoEvolucaoSelect).niceSelect(); } 
    catch(e) {console.warn("NiceSelect para periodoEvolucao falhou.")}

    // --- LÓGICA PARA O MAPA DO DASHBOARD ---
    function prepararDadosParaDashboardMapa() {
        if (!casos) { 
            console.warn("[Mapa Dashboard] Array 'casos' não inicializado.");
            renderizarDashboardMapa([]); 
            return;
        }
        
        console.log(`[Mapa Dashboard] Iniciando preparação de dados. Total de casos carregados: ${casos.length}`);
        if (casos.length > 0) {
            const amostraCasos = casos.slice(0, Math.min(5, casos.length)).map(c => ({ id: c.id, nomeCaso: c.nomeCaso, lat: c.latitude, lng: c.longitude }));
            console.log("[Mapa Dashboard] Amostra de casos (antes do filtro):", JSON.stringify(amostraCasos, null, 2));
        }

        if (casos.length === 0) {
            console.log("[Mapa Dashboard] Sem dados de casos para processar para o mapa.");
            renderizarDashboardMapa([]);
            return;
        }

        const dadosMapa = casos.filter(caso => {
                const latNum = parseFloat(caso.latitude);
                const lngNum = parseFloat(caso.longitude);
                const isValid = caso.latitude != null && caso.longitude != null && 
                               !isNaN(latNum) && !isNaN(lngNum);
                if (!isValid && (caso.latitude != null || caso.longitude != null)) { 
                    console.warn(`[Mapa Dashboard] Caso '${caso.nomeCaso || 'ID: '+caso.id}' com coordenadas inválidas ou não numéricas: Lat='${caso.latitude}', Lng='${caso.longitude}'. Será ignorado.`);
                }
                return isValid;
            })
            .map(caso => ({
                lat: parseFloat(caso.latitude),
                lng: parseFloat(caso.longitude),
                nomeCaso: caso.nomeCaso || 'Caso Sem Nome',
                tipoCrime: caso.tipoCrime || 'Não Especificado',
                data: caso.data ? new Date(caso.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'
            }));
            
        console.log(`[Mapa Dashboard] Dados preparados para renderização (após filtro e map). Pontos válidos: ${dadosMapa.length}`, dadosMapa);
        renderizarDashboardMapa(dadosMapa);
    }

    function renderizarDashboardMapa(dados) {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer || typeof L === 'undefined') {
            if (mapContainer) mapContainer.innerHTML = 'O mapa não pôde ser carregado.';
            console.warn("Leaflet não carregado ou elemento #mapContainer (dashboard) não encontrado.");
            return;
        }

        if (dashboardMapInstance) {
            dashboardMapInstance.remove();
            dashboardMapInstance = null;
        }
        
        if (!mapContainer.style.height) {
            mapContainer.style.height = "400px"; 
        }

        dashboardMapInstance = L.map('mapContainer');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(dashboardMapInstance);

        if (dados && dados.length > 0) {
            const markers = [];
            dados.forEach(ponto => {
                if (typeof ponto.lat === 'number' && !isNaN(ponto.lat) &&
                    typeof ponto.lng === 'number' && !isNaN(ponto.lng)) {
                    const arrowIcon = L.divIcon({
                        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#dc3545"><path d="M12 21l-10-16h20z"/></svg>',
                        className: '', 
                        iconSize: [24, 24],
                        iconAnchor: [12, 24],
                        popupAnchor: [0, -24]
                    });

                    const marker = L.marker([ponto.lat, ponto.lng], { icon: arrowIcon })
                        .bindPopup(`<strong>${ponto.nomeCaso}</strong><br>Crime: ${ponto.tipoCrime}<br>Data: ${ponto.data}`);
                    markers.push(marker);
                } else {
                    console.warn("[Mapa Dashboard] Ponto inválido ou com coordenadas NaN ignorado na renderização:", ponto);
                }
            });

            if (markers.length === 1) { 
                const singleMarker = markers[0];
                singleMarker.addTo(dashboardMapInstance);
                dashboardMapInstance.setView(singleMarker.getLatLng(), 14); 
                singleMarker.openPopup(); 
                console.log("[Mapa Dashboard] Renderizando marcador único com zoom fixo e popup aberto.");
            } else if (markers.length > 1) { 
                const featureGroup = L.featureGroup(markers).addTo(dashboardMapInstance);
                try {
                    dashboardMapInstance.fitBounds(featureGroup.getBounds(), { padding: [50, 50], maxZoom: 16 }); 
                    console.log(`[Mapa Dashboard] Renderizando ${markers.length} marcadores com fitBounds (maxZoom: 16).`);
                } catch (e) {
                    console.error("[Mapa Dashboard] Erro ao tentar fitBounds:", e, "Centralizando em Recife.");
                    dashboardMapInstance.setView([-8.05, -34.9], 11); 
                }
            } else {
                console.log("[Mapa Dashboard] Nenhum marcador válido criado a partir dos dados. Centralizando em Recife.");
                dashboardMapInstance.setView([-8.05, -34.9], 11); 
            }
        } else {
            console.log("[Mapa Dashboard] Nenhum dado com localização para exibir. Centralizando em Recife.");
            dashboardMapInstance.setView([-8.05, -34.9], 11); 
        }
    }

    // Carrega os dados iniciais
    carregarDados();

  } 

  // Lógica da página de Gerenciar Usuários (Gerenciar_usuarios.html)
  if (window.location.pathname.includes('Gerenciar_usuarios.html')) { 
    function loadUsers() {
      let users = [];
      try { users = JSON.parse(localStorage.getItem('users') || '[]'); if (!Array.isArray(users)) { users = []; localStorage.setItem('users', JSON.stringify(users));}}
      catch (err) { mostrarToast('Erro ao carregar usuários.', 'danger'); }
      const tableBody = $('#userTableBody');
      if (tableBody) {
        tableBody.empty();
        users.forEach((user, index) => {
          tableBody.append(`
            <tr>
              <td>${user.nome || 'N/A'}</td> <td>${user.email || 'N/A'}</td> <td>${user.tipo || 'N/A'}</td>
              <td>
                <button class="btn btn-dark btn-sm edit-user" data-index="${index}"><i class="bi bi-pencil-fill"></i> Editar</button>
                <button class="btn btn-danger btn-sm delete-user" data-index="${index}"><i class="bi bi-trash-fill"></i> Excluir</button>
              </td>
            </tr>`);
        });
      }
    }
    loadUsers();
    $('#userForm').on('submit', function(event) {
      event.preventDefault();
      const userIndex = $('#userIndex').val();
      const user = { nome: $('#nome').val(), email: $('#email').val(), senha: $('#senha').val(), tipo: $('#tipo').val()};
      if (!user.nome || !user.email || !user.senha || !user.tipo) { mostrarToast('Preencha todos os campos.', 'warning'); return; }
      let users = [];
      try { users = JSON.parse(localStorage.getItem('users') || '[]'); if (!Array.isArray(users)) users = []; }
      catch (err) { mostrarToast('Erro ao ler usuários.', 'danger'); return; }
      
      // Validar email único (exceto para o próprio usuário sendo editado)
      const emailExists = users.some((u, idx) => u.email === user.email && idx.toString() !== userIndex);
      if (emailExists) {
          mostrarToast('Este email já está em uso por outro usuário.', 'warning');
          return;
      }

      if (userIndex === '') { // Adicionar novo usuário
        users.push(user);
      } else { // Editar usuário existente
        users[userIndex] = user;
      }
      try {
        localStorage.setItem('users', JSON.stringify(users));
        mostrarToast(`Usuário ${userIndex === '' ? 'adicionado' : 'atualizado'} com sucesso!`, 'success');
        $('#userModal').modal('hide'); loadUsers();
      } catch (err) { mostrarToast('Erro ao salvar usuário.', 'danger'); }
    });
    $(document).on('click', '.edit-user', function() {
      const index = $(this).data('index');
      let users = [];
      try { users = JSON.parse(localStorage.getItem('users') || '[]'); if (!Array.isArray(users)) users = []; }
      catch (err) { mostrarToast('Erro ao carregar dados para edição.', 'danger'); return; }
      const user = users[index];
      if (user) {
        $('#userIndex').val(index);
        $('#nome').val(user.nome); $('#email').val(user.email); $('#senha').val(user.senha); $('#tipo').val(user.tipo);
        $('#userModalLabel').text('Editar Usuário');
        $('#userModal').modal('show');
      } else { mostrarToast('Usuário não encontrado para edição.', 'warning'); }
    });
    $(document).on('click', '.delete-user', function() {
      const index = $(this).data('index');
      if (confirm('Tem certeza que deseja excluir este usuário?')) {
        let users = [];
        try { users = JSON.parse(localStorage.getItem('users') || '[]'); if (!Array.isArray(users)) users = []; }
        catch (err) { mostrarToast('Erro ao carregar usuários para exclusão.', 'danger'); return; }
        users.splice(index, 1);
        try {
          localStorage.setItem('users', JSON.stringify(users));
          mostrarToast('Usuário excluído com sucesso!', 'success');
          loadUsers();
        } catch (err) { mostrarToast('Erro ao salvar após exclusão.', 'danger'); }
      }
    });
    $('#addUserBtn').on('click', function() {
      $('#userForm')[0].reset(); $('#userIndex').val('');
      $('#userModalLabel').text('Adicionar Novo Usuário');
      $('#userModal').modal('show');
    });
  }
});
