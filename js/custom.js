document.addEventListener('DOMContentLoaded', () => {
  console.log('custom.js carregado com sucesso');

  // Variável global para a instância do mapa do dashboard para evitar múltiplas inicializações
  let dashboardMapInstance = null;
  // Variável global para a instância do mapa de seleção de local
  let locationPickerMapInstance = null;

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

  // Inicializa niceSelect para selects gerais
  try {
    $('select:not(#periodoEvolucao):not(#filtroPerito):not(#filtroTipoCrimeTabela):not(.status-select)').niceSelect();
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
    const peritoChartCanvas = document.getElementById('peritoChart');
    const laudosTableBody = document.getElementById('laudosTable');
    const filtroDataInicioEl = document.getElementById('filtroDataInicio');
    const filtroDataFimEl = document.getElementById('filtroDataFim');
    const filtroPeritoEl = document.getElementById('filtroPerito');
    const filtroNomeCasoEl = document.getElementById('filtroNomeCaso');
    const filtroTipoCrimeTabelaEl = document.getElementById('filtroTipoCrimeTabela');
    const paginationNumbersEl = document.getElementById('paginationNumbers');
    const dataInicioEvolucaoEl = document.getElementById('dataInicioEvolucao');
    const dataFimEvolucaoEl = document.getElementById('dataFimEvolucao');
    const periodoEvolucaoSelect = document.getElementById('periodoEvolucao');
    const limparFiltroEvolucaoBtn = document.getElementById('limparFiltroEvolucao');
    const filtrarGraficoEvolucaoBtn = document.getElementById('filtrarGraficoEvolucao');

    let casos = []; 
    const casosPorPagina = 5;
    let paginaAtual = 1;
    let filtrosAtuais = {}; 

    async function carregarCasos() {
      if (!dbPromise) { mostrarToast('Erro ao acessar o banco de dados.', 'danger'); return; }
      try {
        const db = await dbPromise; 
        casos = await db.getAll('laudos');
        casos = casos.map((c,i)=>({...c, nomeCaso:c.nomeCaso||`Caso_${i+1}`, status:c.status||'Em andamento', tipoCrime:c.tipoCrime||'Não Especificado', etniaVitima:c.etniaVitima||'Não Informada'}));
        console.log('Casos carregados para o dashboard:', casos.length);
        popularFiltroTipoCrimeTabela();
        atualizarTabela();
        atualizarEstatisticas(); 
      } catch (err) { mostrarToast('Erro ao carregar casos.', 'danger'); console.error("Erro ao carregar casos do BD:", err); }
    }
    if(totalLaudosEl) { carregarCasos(); }

    function popularFiltroTipoCrimeTabela() {
        if (!filtroTipoCrimeTabelaEl || !casos || casos.length === 0) return;
        const tiposDeCrime = [...new Set(casos.map(c => c.tipoCrime).filter(Boolean))].sort();
        filtroTipoCrimeTabelaEl.innerHTML = '<option value="">Todos os Tipos</option>';
        tiposDeCrime.forEach(tipo => {
            const option = document.createElement('option'); option.value = tipo; option.textContent = tipo;
            filtroTipoCrimeTabelaEl.appendChild(option);
        });
        try { $(filtroTipoCrimeTabelaEl).niceSelect('update'); } catch(e) { console.warn("NiceSelect para filtroTipoCrimeTabela falhou.");}
    }

    function atualizarTabela(filtros = filtrosAtuais, pagina = paginaAtual) {
      if (!laudosTableBody || !paginationNumbersEl) return;
      let casosFiltrados = [...casos];
      if (filtros.dataInicio && filtros.dataFim) casosFiltrados = casosFiltrados.filter(c => c.data && c.data >= filtros.dataInicio && c.data <= filtros.dataFim);
      else if (filtros.dataInicio) casosFiltrados = casosFiltrados.filter(c => c.data && c.data >= filtros.dataInicio);
      else if (filtros.dataFim) casosFiltrados = casosFiltrados.filter(c => c.data && c.data <= filtros.dataFim);
      if (filtros.perito) casosFiltrados = casosFiltrados.filter(c => c.perito === filtros.perito);
      if (filtros.nomeCaso) casosFiltrados = casosFiltrados.filter(c => (c.nomeCaso||'').toLowerCase().includes(filtros.nomeCaso.toLowerCase()));
      if (filtros.tipoCrimeTabela) casosFiltrados = casosFiltrados.filter(c => c.tipoCrime === filtros.tipoCrimeTabela);

      const totalCasosFiltrados = casosFiltrados.length;
      const totalPaginas = Math.ceil(totalCasosFiltrados / casosPorPagina) || 1;
      pagina = Math.max(1, Math.min(pagina, totalPaginas)); paginaAtual = pagina;
      const inicio = (pagina - 1) * casosPorPagina; const fim = inicio + casosPorPagina;
      const casosPaginados = casosFiltrados.slice(inicio, fim);
      
      laudosTableBody.innerHTML = ''; 
      const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
      const tipoUsuario = usuarioLogado.tipo || null;
      const podeEditarStatus = tipoUsuario === 'Administrador' || tipoUsuario === 'Perito';
      const podeExcluir = tipoUsuario === 'Administrador';

      if (casosPaginados.length === 0) {
        const r = laudosTableBody.insertRow(); const c = r.insertCell(); c.colSpan = 7; c.textContent = "Nenhum caso encontrado."; c.style.textAlign = "center";
      } else {
        casosPaginados.forEach((caso, i) => {
          const r = laudosTableBody.insertRow();
          r.insertCell().textContent = inicio + i + 1; 
          r.insertCell().textContent = caso.nomeCaso || 'N/A';
          r.insertCell().textContent = caso.data ? new Date(caso.data+'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
          r.insertCell().textContent = caso.tipoCrime || 'N/A';
          r.insertCell().textContent = caso.perito || 'N/A';
          const sC = r.insertCell(); 
          if(podeEditarStatus){ 
            const sel = document.createElement('select'); sel.className='form-select form-select-sm status-select'; sel.dataset.casoId=caso.id; 
            ['Em andamento','Finalizado','Arquivado'].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;if(caso.status===s)o.selected=true;sel.appendChild(o);});
            sC.appendChild(sel);
          } else {sC.textContent=caso.status||'Em andamento';} 
          const aC = r.insertCell(); 
          aC.innerHTML = `<a href="Adicionar_evidencias.html?casoId=${caso.id}" class="btn btn-dark btn-sm" title="Evidências"><i class="bi bi-journal-plus"></i></a> <a href="Laudos.html?id=${caso.id}" class="btn btn-primary btn-sm" title="Visualizar"><i class="bi bi-eye-fill"></i></a> ${podeExcluir ? `<button class="btn btn-danger btn-sm" onclick="excluirCaso('${caso.id}')" title="Excluir"><i class="bi bi-trash-fill"></i></button>`:''}`;
        });
      }
      if (podeEditarStatus && casosPaginados.length > 0) {
        try { document.querySelectorAll('.status-select').forEach(sel => { if (!$(sel).data('niceSelectAttached')) { $(sel).niceSelect(); $(sel).data('niceSelectAttached',true); $(sel).on('change', async function(){ const cId=this.dataset.casoId; const nS=this.value; try { const db=await dbPromise; const c=await db.get('laudos',cId); if(c){c.status=nS; await db.put('laudos',c); const iL=casos.findIndex(c=>c.id===cId); if(iL!==-1)casos[iL].status=nS; mostrarToast('Status atualizado!','success'); atualizarEstatisticas(); }} catch(err){mostrarToast('Erro ao mudar status.','danger');}}); } else { $(sel).niceSelect('update');}});
        } catch(e){ console.warn("NiceSelect status tabela falhou:", e); }
      }
      paginationNumbersEl.innerHTML = '';
      for (let i=1; i<=totalPaginas; i++) { const pI=document.createElement('li');pI.className=`page-item ${i===pagina?'active':''}`;pI.innerHTML=`<a class="page-link" href="#" onclick="irParaPagina(${i})">${i}</a>`; paginationNumbersEl.appendChild(pI);}
      const btnAnt = document.querySelector('.pagination .page-item:first-child a');
      const btnProx = document.querySelector('.pagination .page-item:last-child a');
      if(btnAnt) btnAnt.parentElement.classList.toggle('disabled', pagina===1);
      if(btnProx) btnProx.parentElement.classList.toggle('disabled', pagina===totalPaginas||totalPaginas===0);
    }

    window.paginaAnterior=function(){if(paginaAtual>1)atualizarTabela(filtrosAtuais,paginaAtual-1);};
    window.proximaPagina=function(){let cCF=0;if(casos&&casos.length>0){cCF=casos.filter(c=>{let pF=true;if(filtrosAtuais.dataInicio&&filtrosAtuais.dataFim){pF=pF&&(c.data&&c.data>=filtrosAtuais.dataInicio&&c.data<=filtrosAtuais.dataFim);}else if(filtrosAtuais.dataInicio){pF=pF&&(c.data&&c.data>=filtrosAtuais.dataInicio);}else if(filtrosAtuais.dataFim){pF=pF&&(c.data&&c.data<=filtrosAtuais.dataFim);}if(filtrosAtuais.perito)pF=pF&&(c.perito===filtrosAtuais.perito);if(filtrosAtuais.nomeCaso)pF=pF&&((c.nomeCaso||'').toLowerCase().includes(filtrosAtuais.nomeCaso.toLowerCase()));if(filtrosAtuais.tipoCrimeTabela)pF=pF&&(c.tipoCrime===filtrosAtuais.tipoCrimeTabela);return pF;}).length;}const tP=Math.ceil(cCF/casosPorPagina)||1;if(paginaAtual<tP)atualizarTabela(filtrosAtuais,paginaAtual+1);};
    window.irParaPagina=function(p){atualizarTabela(filtrosAtuais,p);};

    window.aplicarFiltros = function() {
      filtrosAtuais = {
        dataInicio: filtroDataInicioEl ? filtroDataInicioEl.value : '',
        dataFim: filtroDataFimEl ? filtroDataFimEl.value : '',
        perito: filtroPeritoEl ? filtroPeritoEl.value : '',
        nomeCaso: filtroNomeCasoEl ? filtroNomeCasoEl.value.trim() : '',
        tipoCrimeTabela: filtroTipoCrimeTabelaEl ? filtroTipoCrimeTabelaEl.value : ''
      };
      paginaAtual = 1; atualizarTabela(filtrosAtuais, 1);
    };

    window.limparFiltros = function() {
      if(filtroDataInicioEl) filtroDataInicioEl.value=''; if(filtroDataFimEl) filtroDataFimEl.value='';
      if(filtroPeritoEl){filtroPeritoEl.value=''; try{$(filtroPeritoEl).niceSelect('update');}catch(e){}}
      if(filtroNomeCasoEl) filtroNomeCasoEl.value='';
      if(filtroTipoCrimeTabelaEl){filtroTipoCrimeTabelaEl.value=''; try{$(filtroTipoCrimeTabelaEl).niceSelect('update');}catch(e){}}
      filtrosAtuais={}; paginaAtual=1; atualizarTabela({},1);
    };
    
    if (filtroPeritoEl) { try {$(filtroPeritoEl).niceSelect();} catch(e) {console.warn("NiceSelect para filtroPeritoEl falhou.")}}

    window.excluirCaso = async function(casoId) { 
        if (confirm('Tem certeza que deseja excluir este caso e todas as suas evidências associadas? Esta ação é irreversível.')) {
        if (!dbPromise) { mostrarToast('Erro de BD.', 'danger'); return; }
        try {
          const db = await dbPromise;
          if (db.objectStoreNames.contains('evidencias')) {
            const txEvidencias = db.transaction('evidencias', 'readwrite');
            const storeEvidencias = txEvidencias.objectStore('evidencias');
            const indiceCasoId = storeEvidencias.index('casoId'); 
            let cursor = await indiceCasoId.openCursor(IDBKeyRange.only(String(casoId))); 
            while(cursor) {
                await storeEvidencias.delete(cursor.primaryKey); 
                if (cursor.value.photoId && db.objectStoreNames.contains('photos')) {
                     const txPhotos = db.transaction('photos', 'readwrite');
                     await txPhotos.objectStore('photos').delete(cursor.value.photoId);
                     await txPhotos.done;
                }
                cursor = await cursor.continue();
            }
            await txEvidencias.done;
          }
          await db.delete('laudos', casoId);
          casos = casos.filter(caso => caso.id !== casoId);
          mostrarToast('Caso e evidências associadas foram excluídos!', 'success');
          atualizarTabela(); atualizarEstatisticas(); 
        } catch (err) { console.error('Erro ao excluir caso e/ou evidências:', err); mostrarToast('Erro ao excluir o caso.', 'danger');}
      }
    };

    function atualizarEstatisticas() {
      if (!totalLaudosEl || !laudosHojeEl || !peritoAtivoEl || !casos) return;
      const hoje=new Date().toISOString().split('T')[0]; const casosHojeCount=casos.filter(c=>c.data===hoje).length;
      const peritosCount={}; casos.forEach(c=>{if(c.perito)peritosCount[c.perito]=(peritosCount[c.perito]||0)+1;});
      totalLaudosEl.textContent=casos.length; laudosHojeEl.textContent=casosHojeCount;
      peritoAtivoEl.textContent=Object.keys(peritosCount).length?Object.keys(peritosCount).reduce((a,b)=>peritosCount[a]>peritosCount[b]?a:b):'Nenhum';
      
      if (peritoChartCanvas && typeof Chart !=='undefined') {
        const lblP=Object.keys(peritosCount).length>0?Object.keys(peritosCount):['N/A']; const dataP=Object.values(peritosCount).length>0?Object.values(peritosCount):[0];
        if(window.myPeritoChart instanceof Chart)window.myPeritoChart.destroy();
        window.myPeritoChart=new Chart(peritoChartCanvas.getContext('2d'),{type:'bar',data:{labels:lblP,datasets:[{label:'Casos por Perito',data:dataP,backgroundColor:'rgba(167,202,201,0.7)',borderColor:'#A7CAC9',borderWidth:1,barPercentage:0.6,categoryPercentage:0.8}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{stepSize:1,precision:0}}},plugins:{legend:{display:true,position:'top'},title:{display:true,text:'Casos por Perito'}}}});
      }
      atualizarGraficoStatusPercentual(); atualizarGraficoTipoCrime();
      atualizarGraficoEtniaVitima(); atualizarGraficoFaixaEtariaVitima();
      atualizarGraficoEvolucaoCasos();
      
      prepararDadosParaDashboardMapa();
    }

    function atualizarGraficoStatusPercentual() {
        const canvas = document.getElementById('statusPercentChart');
        if (!canvas || typeof Chart === 'undefined' || !casos ) { if(canvas && window.myStatusChart instanceof Chart) window.myStatusChart.destroy(); return; }
        const counts = { 'Em andamento': 0, 'Finalizado': 0, 'Arquivado': 0 }; let total = 0;
        casos.forEach(c => { const s=c.status&&counts.hasOwnProperty(c.status)?c.status:'Em andamento'; counts[s]++; total++; });
        if(total === 0){ if(window.myStatusChart instanceof Chart) window.myStatusChart.destroy(); return; }
        const labels = ['Em Andamento', 'Finalizado', 'Arquivado'];
        const data = [counts['Em andamento'], counts['Finalizado'], counts['Arquivado']];
        const bg = ['rgba(255,159,64,0.7)','rgba(75,192,192,0.7)','rgba(153,102,255,0.7)'];
        if (window.myStatusChart instanceof Chart) window.myStatusChart.destroy();
        window.myStatusChart = new Chart(canvas.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data, backgroundColor:bg, borderColor:bg.map(c=>c.replace('0.7','1')), borderWidth:1 }] }, options: { responsive:true, maintainAspectRatio:false, plugins: { legend:{position:'top'}, title:{display:true, text:'Status dos Casos'}, tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} (${(c.raw/total*100).toFixed(1)}%)`}}}}});
    }
    function atualizarGraficoTipoCrime() {
        const canvas = document.getElementById('tipoCrimeChart');
        if (!canvas || typeof Chart === 'undefined' || !casos) { if(canvas && window.myTipoCrimeChart instanceof Chart) window.myTipoCrimeChart.destroy(); return; }
        const counts = {}; let total = 0;
        casos.forEach(c => { if(c.tipoCrime){ const tipo = c.tipoCrime.trim() || "Não Especificado"; counts[tipo]=(counts[tipo]||0)+1; total++;}});
        if(total === 0){ if(window.myTipoCrimeChart instanceof Chart) window.myTipoCrimeChart.destroy(); return; }
        const labels = Object.keys(counts); const data = Object.values(counts);
        const bg = labels.map(()=>`rgba(${Math.floor(Math.random()*200+55)},${Math.floor(Math.random()*200+55)},${Math.floor(Math.random()*200+55)},0.7)`);
        if (window.myTipoCrimeChart instanceof Chart) window.myTipoCrimeChart.destroy();
        window.myTipoCrimeChart = new Chart(canvas.getContext('2d'), { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor:bg, borderColor:bg.map(c=>c.replace('0.7','1')), borderWidth:1 }] }, options: { responsive:true, maintainAspectRatio:false, plugins: { legend:{position:'right'}, title:{display:true, text:'Casos por Tipo de Crime'}, tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} (${(c.raw/total*100).toFixed(1)}%)`}}}}});
    }
    function atualizarGraficoEtniaVitima() {
        const canvas = document.getElementById('etniaVitimaChart');
        if (!canvas || typeof Chart === 'undefined' || !casos) { if(canvas && window.myEtniaChart instanceof Chart) window.myEtniaChart.destroy(); return; }
        const counts = {}; let total = 0;
        casos.forEach(c => { if(c.etniaVitima !== undefined && c.etniaVitima !== null){ const etnia = c.etniaVitima ? c.etniaVitima.trim() : "Não Informada"; counts[etnia]=(counts[etnia]||0)+1; total++;}});
        if(total === 0){ if(window.myEtniaChart instanceof Chart) window.myEtniaChart.destroy(); return; }
        const labels = Object.keys(counts); const data = Object.values(counts);
        const bg = labels.map(()=>`rgba(${Math.floor(Math.random()*200+55)},${Math.floor(Math.random()*200+55)},${Math.floor(Math.random()*200+55)},0.7)`);
        if (window.myEtniaChart instanceof Chart) window.myEtniaChart.destroy();
        window.myEtniaChart = new Chart(canvas.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data, backgroundColor:bg, borderColor:bg.map(c=>c.replace('0.7','1')), borderWidth:1 }] }, options: { responsive:true, maintainAspectRatio:false, plugins: { legend:{position:'right'}, title:{display:true, text:'Casos por Etnia da Vítima'}, tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} (${(c.raw/total*100).toFixed(1)}%)`}}}}});
    }
    function atualizarGraficoFaixaEtariaVitima() {
        const canvas = document.getElementById('faixaEtariaVitimaChart');
        if (!canvas || typeof Chart === 'undefined' || !casos) { if(canvas && window.myFaixaEtariaChart instanceof Chart) window.myFaixaEtariaChart.destroy(); return; }
        const faixas = {'0-17':0,'18-29':0,'30-45':0,'46-59':0,'60+':0,'Não Informada':0}; let total = 0;
        casos.forEach(c => { if(c.idadeVitima !== undefined){ const idade = c.idadeVitima;
            if(idade === null || idade === '') faixas['Não Informada']++;
            else if(idade>=0 && idade<=17) faixas['0-17']++; else if(idade>=18 && idade<=29) faixas['18-29']++;
            else if(idade>=30 && idade<=45) faixas['30-45']++; else if(idade>=46 && idade<=59) faixas['46-59']++;
            else if(idade>=60) faixas['60+']++; else faixas['Não Informada']++; total++;}});
        if(total === 0){ if(window.myFaixaEtariaChart instanceof Chart) window.myFaixaEtariaChart.destroy(); return; }
        const labels = Object.keys(faixas); const data = Object.values(faixas);
        const bg = ['rgba(255,99,132,0.7)','rgba(54,162,235,0.7)','rgba(255,206,86,0.7)','rgba(75,192,192,0.7)','rgba(153,102,255,0.7)','rgba(201,203,207,0.7)'];
        if(window.myFaixaEtariaChart instanceof Chart) window.myFaixaEtariaChart.destroy();
        window.myFaixaEtariaChart = new Chart(canvas.getContext('2d'), {type:'bar', data:{labels, datasets:[{label:'Nº de Casos',data,backgroundColor:bg,borderColor:bg.map(c=>c.replace('0.7','1')),borderWidth:1}]}, options:{responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{legend:{display:false},title:{display:true, text:'Casos por Faixa Etária da Vítima'}}, scales:{x:{beginAtZero:true, ticks:{stepSize:1, precision:0}}}}});
    }
    function atualizarGraficoEvolucaoCasos() {
      const canvas = document.getElementById('evolucaoCasosChart');
      if (!canvas || !periodoEvolucaoSelect || typeof Chart === 'undefined' || !casos ) {
        if(canvas && window.myEvolucaoChart instanceof Chart) window.myEvolucaoChart.destroy(); return;
      }
      const periodo = periodoEvolucaoSelect.value;
      const dataInicioFiltro = dataInicioEvolucaoEl ? dataInicioEvolucaoEl.value : null;
      const dataFimFiltro = dataFimEvolucaoEl ? dataFimEvolucaoEl.value : null;
      let casosParaGrafico = [...casos];
      if (dataInicioFiltro && dataFimFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data >= dataInicioFiltro && c.data <= dataFimFiltro);
      else if (dataInicioFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data >= dataInicioFiltro);
      else if (dataFimFiltro) casosParaGrafico = casosParaGrafico.filter(c => c.data && c.data <= dataFimFiltro);
      const counts = {}; let total = 0;
      casosParaGrafico.forEach(c => { if(c.data){ const dt=new Date(c.data+"T00:00:00"); if(isNaN(dt.getTime())) return;
        let chave = periodo==='mensal' ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` : dt.getFullYear().toString();
        counts[chave]=(counts[chave]||0)+1; total++;}});
      if(total === 0){ if(window.myEvolucaoChart instanceof Chart) window.myEvolucaoChart.destroy(); return; }
      const labels = Object.keys(counts).sort(); const data = labels.map(l=>counts[l]);
      if(window.myEvolucaoChart instanceof Chart) window.myEvolucaoChart.destroy();
      window.myEvolucaoChart = new Chart(canvas.getContext('2d'), {type:'line', data:{labels, datasets:[{label:'Nº de Casos',data,borderColor:'#A7CAC9',backgroundColor:'rgba(167,202,201,0.3)',fill:true,tension:0.1}]}, options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true,ticks:{stepSize:1,precision:0}},x:{title:{display:true,text:periodo==='mensal'?'Mês/Ano':'Ano'}}},plugins:{legend:{display:true,position:'top'},title:{display:true,text:`Evolução de Casos (${periodo==='mensal'?'Mensal':'Anual'})`}}}});
    }
    if (filtrarGraficoEvolucaoBtn) filtrarGraficoEvolucaoBtn.addEventListener('click', atualizarGraficoEvolucaoCasos);
    if (periodoEvolucaoSelect) periodoEvolucaoSelect.addEventListener('change', atualizarGraficoEvolucaoCasos);
    if (limparFiltroEvolucaoBtn) {
        limparFiltroEvolucaoBtn.addEventListener('click', () => {
            if(dataInicioEvolucaoEl) dataInicioEvolucaoEl.value = ''; if(dataFimEvolucaoEl) dataFimEvolucaoEl.value = '';
            atualizarGraficoEvolucaoCasos();
        });
    }
    try { if(periodoEvolucaoSelect) $(periodoEvolucaoSelect).niceSelect(); } 
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
                    // Define o ícone de seta customizado (SVG)
                    const arrowIcon = L.divIcon({
                        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#dc3545"><path d="M12 21l-10-16h20z"/></svg>', // Triângulo vermelho apontando para baixo
                        className: '', // Sem classe extra por enquanto
                        iconSize: [24, 24],
                        iconAnchor: [12, 24], // Aponta para a localização exata (ponta inferior central)
                        popupAnchor: [0, -24] // Popup abre acima da ponta
                    });

                    const marker = L.marker([ponto.lat, ponto.lng], { icon: arrowIcon }) // Usa o ícone de seta
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
                    // Adiciona uma opção maxZoom para não ampliar demais se os pontos estiverem muito próximos.
                    // Um valor como 16 pode ser um bom limite superior para manter algum contexto.
                    // O mapa de visualização de um único caso usa zoom 14.
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
      if (!user.nome || !user.email || !user.senha || !user.tipo) { mostrarToast('Todos os campos são obrigatórios!', 'warning'); return; }
      let users = [];
      try { users = JSON.parse(localStorage.getItem('users') || '[]'); if (!Array.isArray(users)) users = [];} 
      catch (err) { users = []; }
      if (userIndex === '') users.push(user);
      else { users[userIndex] = user; $('#userIndex').val(''); $('#cancelEdit').hide(); }
      localStorage.setItem('users', JSON.stringify(users));
      loadUsers(); $('#userForm')[0].reset(); try{$('#tipo').niceSelect('update');}catch(e){}
      mostrarToast('Usuário salvo!', 'success');
    });
    $(document).on('click', '.edit-user', function() {
      const index = $(this).data('index'); const users = JSON.parse(localStorage.getItem('users')||'[]'); const user = users[index];
      $('#nome').val(user.nome); $('#email').val(user.email); $('#senha').val(user.senha); $('#tipo').val(user.tipo);
      try{$('#tipo').niceSelect('update');}catch(e){}
      $('#userIndex').val(index); $('#cancelEdit').show();
    });
    $('#cancelEdit').on('click', function() {
      $('#userForm')[0].reset(); $('#userIndex').val(''); $(this).hide(); try{$('#tipo').niceSelect('update');}catch(e){}
    });
    $(document).on('click', '.delete-user', function() {
      if (!confirm("Tem certeza?")) return;
      const index = $(this).data('index'); let users = JSON.parse(localStorage.getItem('users')||'[]');
      users.splice(index,1); localStorage.setItem('users',JSON.stringify(users)); loadUsers();
      mostrarToast('Usuário excluído!', 'danger');
    });
    try { $('#tipo').niceSelect(); } catch(e) { console.warn("NiceSelect para tipo de usuário falhou.");}
  }
});