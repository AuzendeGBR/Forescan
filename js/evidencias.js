// Initialize IndexedDB
const dbPromise = idb.openDB('forenscanDB', 1, {
    upgrade(db) {
      // Casos (laudos)
      if (!db.objectStoreNames.contains('casos')) {
        db.createObjectStore('casos', { keyPath: 'id' });
      }
      
      // Evidências com referência ao caso
      if (!db.objectStoreNames.contains('evidencias')) {
        const evidenciasStore = db.createObjectStore('evidencias', { keyPath: 'id' });
        // Criar índice para buscar evidências por casoId
        evidenciasStore.createIndex('casoId', 'casoId');
      }
      
      // Fotos das evidências
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    },
  });
  
  let evidencias = [];
  let editingId = null;
  let currentCasoId = null;
  
  // Função para obter parâmetros da URL
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      casoId: params.get('casoId')
    };
  }
  
  // Função para inicializar a página
  async function inicializarPagina() {
    const { casoId } = getUrlParams();
    currentCasoId = casoId;
    
    if (casoId) {
      // Buscar informações do caso para exibir no título
      const db = await dbPromise;
      const caso = await db.get('casos', parseInt(casoId));
      
      if (caso) {
        document.querySelector('h1').textContent = `Gerenciamento de Evidências - Caso: ${caso.nome}`;
      }
      
      // Carregar evidências deste caso específico
      await carregarEvidenciasPorCaso(casoId);
    } else {
      mostrarToast('Nenhum caso selecionado. Redirecionando para o dashboard...', 'danger');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
    }
  }
  
  // Função para carregar evidências por caso
  async function carregarEvidenciasPorCaso(casoId) {
    const db = await dbPromise;
    const tx = db.transaction('evidencias', 'readonly');
    const index = tx.store.index('casoId');
    evidencias = await index.getAll(parseInt(casoId));
    
    // Atualizar a lista de evidências
    updateEvidenceList();
  }
  
  // Toast function for feedback
  function mostrarToast(mensagem, tipo = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1050';
    document.body.appendChild(toastContainer);
    
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="3000">
        <div class="toast-header">
          <strong class="me-auto">Notificação</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
        <div class="toast-body ${tipo === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}">${mensagem}</div>
      </div>
    `;
    toastContainer.innerHTML += toastHTML;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
      toastContainer.remove();
    });
  }
  
  async function saveEvidence() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const photoInput = document.getElementById('photo').files[0];
  
    if (!title || !description) {
      mostrarToast('Título e descrição são obrigatórios!', 'danger');
      return;
    }
  
    if (!currentCasoId) {
      mostrarToast('Nenhum caso selecionado!', 'danger');
      return;
    }
  
    const db = await dbPromise;
    let photoId = null;
  
    if (photoInput) {
      photoId = Date.now().toString();
      await db.put('photos', { id: photoId, data: photoInput });
    } else if (editingId) {
      // Preserve existing photo if no new photo is uploaded
      const existing = evidencias.find(ev => ev.id === editingId);
      photoId = existing ? existing.photoId : null;
    }
  
    const evidence = {
      id: editingId || Date.now(),
      title,
      description,
      photoId,
      casoId: parseInt(currentCasoId), // Associar a evidência ao caso atual
      dataCriacao: new Date().toISOString()
    };
  
    if (editingId !== null) {
      // Update existing evidence
      await db.put('evidencias', evidence);
      evidencias = evidencias.map(ev => (ev.id === editingId ? evidence : ev));
      editingId = null;
      document.querySelector('.save-btn').textContent = 'Salvar Evidência';
      mostrarToast('Evidência atualizada com sucesso!', 'success');
    } else {
      // Create new evidence
      await db.put('evidencias', evidence);
      evidencias.push(evidence);
      mostrarToast('Evidência salva com sucesso!', 'success');
    }
  
    // Reset form
    resetForm();
    updateEvidenceList();
  }
  
  async function editEvidence(id) {
    const evidence = evidencias.find(ev => ev.id === id);
    if (!evidence) return;
  
    document.getElementById('title').value = evidence.title;
    document.getElementById('description').value = evidence.description;
    if (evidence.photoId) {
      const db = await dbPromise;
      const photo = await db.get('photos', evidence.photoId);
      if (photo && photo.data) {
        const url = URL.createObjectURL(photo.data);
        const preview = document.getElementById('photo-preview');
        preview.src = url;
        preview.classList.remove('hidden');
      }
    } else {
      document.getElementById('photo-preview').classList.add('hidden');
    }
  
    editingId = id;
    document.querySelector('.save-btn').textContent = 'Atualizar Evidência';
    document.getElementById('saved-evidences').classList.add('hidden');
  }
  
  async function deleteEvidence(id) {
    if (!confirm('Tem certeza que deseja excluir esta evidência?')) return;
  
    const db = await dbPromise;
    const evidence = evidencias.find(ev => ev.id === id);
    if (evidence && evidence.photoId) {
      await db.delete('photos', evidence.photoId);
    }
    await db.delete('evidencias', id);
    evidencias = evidencias.filter(ev => ev.id !== id);
    updateEvidenceList();
    mostrarToast('Evidência excluída com sucesso!', 'success');
  }
  
  async function updateEvidenceList() {
    const evidenceList = document.getElementById('evidence-list');
    evidenceList.innerHTML = '';
  
    if (evidencias.length === 0) {
      evidenceList.innerHTML = '<p style="color: #666;">Nenhuma evidência salva para este caso.</p>';
      return;
    }
  
    for (const ev of evidencias) {
      const div = document.createElement('div');
      div.className = 'evidence-item';
      let photoHtml = '';
      if (ev.photoId) {
        const db = await dbPromise;
        const photo = await db.get('photos', ev.photoId);
        if (photo && photo.data) {
          const url = URL.createObjectURL(photo.data);
          photoHtml = `<img src="${url}" class="evidence-photo" alt="${ev.title}">`;
        }
      }
      
      // Formatar data de criação
      const dataCriacao = ev.dataCriacao ? new Date(ev.dataCriacao).toLocaleString() : 'Data desconhecida';
      
      div.innerHTML = `
        <h3>${ev.title}</h3>
        <p>${ev.description}</p>
        <p class="evidence-date">Criada em: ${dataCriacao}</p>
        ${photoHtml}
        <div class="evidence-actions">
          <button class="edit-btn" onclick="editEvidence(${ev.id})">Editar</button>
          <button class="delete-btn" onclick="deleteEvidence(${ev.id})">Excluir</button>
        </div>
      `;
      evidenceList.appendChild(div);
    }
  }
  
  function toggleSavedEvidences() {
    const savedEvidences = document.getElementById('saved-evidences');
    const toggleBtn = document.querySelector('.toggle-btn');
    savedEvidences.classList.toggle('hidden');
    toggleBtn.textContent = savedEvidences.classList.contains('hidden')
      ? 'Visualizar Evidências Salvas'
      : 'Ocultar Evidências Salvas';
    if (!savedEvidences.classList.contains('hidden')) {
      updateEvidenceList();
    }
  }
  
  function resetForm() {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    clearImage();
    editingId = null;
    document.querySelector('.save-btn').textContent = 'Salvar Evidência';
  }
  
  function clearImage() {
    const photoInput = document.getElementById('photo');
    const preview = document.getElementById('photo-preview');
    photoInput.value = '';
    preview.src = '';
    preview.classList.add('hidden');
  }
  
  function voltarParaDashboard() {
    window.location.href = 'index.html';
  }
  
  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    inicializarPagina();
    
    document.getElementById('photo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const preview = document.getElementById('photo-preview');
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
      }
    });
    
    // Adicionar botão de voltar
    const headerContainer = document.querySelector('h1').parentNode;
    const voltarBtn = document.createElement('button');
    voltarBtn.className = 'btn btn-secondary mb-4';
    voltarBtn.innerHTML = '<i class="bi bi-arrow-left"></i> Voltar para Dashboard';
    voltarBtn.onclick = voltarParaDashboard;
    headerContainer.insertBefore(voltarBtn, document.querySelector('h1'));
    
    // Definir ano atual no rodapé
    document.getElementById('displayYear').textContent = new Date().getFullYear();
  });
  
  // Expor funções globalmente
  window.saveEvidence = saveEvidence;
  window.editEvidence = editEvidence;
  window.deleteEvidence = deleteEvidence;
  window.toggleSavedEvidences = toggleSavedEvidences;
  window.clearImage = clearImage;
  window.voltarParaDashboard = voltarParaDashboard;
  
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
