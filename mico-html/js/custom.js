// to get current year
function getYear() {
  var currentDate = new Date();
  var currentYear = currentDate.getFullYear();
  document.querySelector("#displayYear").innerHTML = currentYear;
}

getYear();

// nice select
$(document).ready(function () {
  $('select').niceSelect();
});

// date picker
$(function () {
  $("#inputDate").datepicker({
      autoclose: true,
      todayHighlight: true
  }).datepicker('update', new Date());
});

// owl carousel slider js
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
      0: {
          items: 1,
          margin: 0
      },
      576: {
          items: 2,
      },
      992: {
          items: 3
      }
  }
});

// Script para o modal de login/cadastro
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const loginForm = document.querySelector('.user_login');
  const registerForm = document.querySelector('.user_register');
  const modalTriggers = document.querySelectorAll('.auth-link');
  const modalClose = document.querySelector('.modal_close');

  // Função para mostrar/esconder formulários
  function showForm(formToShow) {
    [loginForm, registerForm].forEach(form => {
      if (form) form.style.display = 'none';
    });
    if (formToShow) formToShow.style.display = 'block';
  }

  // Abrir modal com formulário específico
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.style.display = 'block';
      const targetForm = trigger.getAttribute('data-modal');
      if (targetForm === 'login_form') {
        showForm(loginForm);
      } else {
        showForm(registerForm);
      }
    });
  });

  // Fechar modal
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      showForm(loginForm); // Volta para o login por padrão (opcional)
    });
  }

  // Manipulação do campo de fotos
  const fotoInput = document.getElementById('foto');
  const fileNamesSpan = document.getElementById('file-names');
  if (fotoInput && fileNamesSpan) {
      fotoInput.addEventListener('change', function () {
          const fileNames = Array.from(this.files).map(file => file.name).join(', ');
          fileNamesSpan.textContent = fileNames || '';
      });
  }

  // Lógica para formulário de laudos
  const formLaudo = document.getElementById('formLaudo');
  const laudosCarousel = document.getElementById('laudosCarousel');

  // Carrega laudos do localStorage
  let laudos = JSON.parse(localStorage.getItem('laudos')) || [];

  // Função para salvar ou atualizar laudo
  if (formLaudo) {
      formLaudo.addEventListener('submit', (e) => {
          e.preventDefault();
          const laudo = {
              id: new URLSearchParams(window.location.search).get('id') || Date.now().toString(),
              perito: document.getElementById('peritoNome').value,
              data: document.getElementById('dataPericia').value,
              descricao: document.getElementById('exameDescricao').value,
              diagnostico: document.getElementById('diagnostico').value,
              observacoes: document.getElementById('observacoes').value
              // Fotos não salvas no localStorage por simplicidade
          };

          if (laudo.id !== Date.now().toString()) {
              // Atualizar laudo existente
              laudos = laudos.map(item => item.id === laudo.id ? laudo : item);
          } else {
              // Novo laudo
              laudos.push(laudo);
          }

          localStorage.setItem('laudos', JSON.stringify(laudos));
          formLaudo.reset();
          window.location.href = 'Laudos.html';
      });

      // Preencher formulário para edição
      const id = new URLSearchParams(window.location.search).get('id');
      if (id) {
          const laudo = laudos.find(item => item.id === id);
          if (laudo) {
              document.getElementById('peritoNome').value = laudo.perito;
              document.getElementById('dataPericia').value = laudo.data;
              document.getElementById('exameDescricao').value = laudo.descricao;
              document.getElementById('diagnostico').value = laudo.diagnostico;
              document.getElementById('observacoes').value = laudo.observacoes;
              // Atualizar Nice Select
              $('#peritoNome').niceSelect('update');
          }
      }
  }

  // Função para exibir laudos no carrossel
  if (laudosCarousel) {
      function atualizarLaudos() {
          $(laudosCarousel).owlCarousel('destroy'); // Destruir carrossel atual
          laudosCarousel.innerHTML = ''; // Limpar conteúdo
          if (laudos.length === 0) {
              laudosCarousel.innerHTML = '<div class="item"><div class="box"><div class="detail-box"><p>Nenhum laudo salvo</p></div></div></div>';
          } else {
              laudos.forEach((laudo, index) => {
                  const item = document.createElement('div');
                  item.className = 'item';
                  item.innerHTML = `
                      <div class="box">
                          <div class="img-box">
                              <img src="images/laudos.png" alt="Pasta" />
                          </div>
                          <div class="detail-box">
                              <h5>Laudo ${index + 1}</h5>
                              <div class="btn-box">
                                  <button class="btn btn-custom" onclick="window.location.href='Adicionar_laudos.html?id=${laudo.id}'">Editar</button>
                              </div>
                          </div>
                      </div>
                  `;
                  laudosCarousel.appendChild(item);
              });
          }
          // Reinicializar o carrossel
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
      }
      atualizarLaudos();
  }
});
// Adicione este código ao seu arquivo custom.js existente ou crie um novo arquivo

// Variáveis para armazenar estados e dados temporários
let recoveryData = {
  email: '',
  tempCode: '',  // Simulação do código enviado
  verificationAttempts: 0,
  maxAttempts: 3
};

// Funções para alternar entre os diferentes formulários
function showLoginForm() {
  // Ocultar todos os formulários
  document.querySelector('.user_login').style.display = 'block';
  document.querySelector('.user_register').style.display = 'none';
  
  // Ocultar todas as etapas de recuperação de senha
  const recoverySteps = document.querySelectorAll('.password_recovery');
  recoverySteps.forEach(step => {
    step.style.display = 'none';
  });
}

function showRegisterForm() {
  document.querySelector('.user_login').style.display = 'none';
  document.querySelector('.user_register').style.display = 'block';
  
  // Ocultar todas as etapas de recuperação de senha
  const recoverySteps = document.querySelectorAll('.password_recovery');
  recoverySteps.forEach(step => {
    step.style.display = 'none';
  });
}

function showPasswordRecovery() {
  document.querySelector('.user_login').style.display = 'none';
  document.querySelector('.user_register').style.display = 'none';
  document.querySelector('.password_recovery.step1').style.display = 'block';
  
  // Ocultar outras etapas de recuperação
  document.querySelector('.password_recovery.step2').style.display = 'none';
  document.querySelector('.password_recovery.step3').style.display = 'none';
  document.querySelector('.password_recovery.success').style.display = 'none';
}

function backToRecoveryStep1() {
  document.querySelector('.password_recovery.step1').style.display = 'block';
  document.querySelector('.password_recovery.step2').style.display = 'none';
}

function backToRecoveryStep2() {
  document.querySelector('.password_recovery.step2').style.display = 'block';
  document.querySelector('.password_recovery.step3').style.display = 'none';
}

// Funções para lidar com o processo de recuperação de senha
function sendRecoveryCode() {
  const emailInput = document.getElementById('recoveryEmail');
  const email = emailInput.value.trim();
  
  if (!email) {
    alert('Por favor, informe seu e-mail.');
    return;
  }
  
  if (!validateEmail(email)) {
    alert('Por favor, informe um e-mail válido.');
    return;
  }
  
  // Simular envio de código para o email
  recoveryData.email = email;
  recoveryData.tempCode = generateRandomCode();
  recoveryData.verificationAttempts = 0;
  
  console.log(`Código enviado para ${email}: ${recoveryData.tempCode}`);
  
  // Em um ambiente real, aqui seria uma chamada para o backend enviar o email
  
  // Mostrar a próxima etapa
  document.querySelector('.password_recovery.step1').style.display = 'none';
  document.querySelector('.password_recovery.step2').style.display = 'block';
}

function verifyCode() {
  const codeInput = document.getElementById('verificationCode');
  const code = codeInput.value.trim();
  
  if (!code) {
    alert('Por favor, informe o código de verificação.');
    return;
  }
  
  // Verificar se o código está correto
  if (code === recoveryData.tempCode) {
    // Código correto, avançar para a próxima etapa
    document.querySelector('.password_recovery.step2').style.display = 'none';
    document.querySelector('.password_recovery.step3').style.display = 'block';
  } else {
    // Código incorreto
    recoveryData.verificationAttempts++;
    
    if (recoveryData.verificationAttempts >= recoveryData.maxAttempts) {
      alert('Número máximo de tentativas excedido. Por favor, solicite um novo código.');
      showPasswordRecovery(); // Voltar para o início do processo
    } else {
      const remainingAttempts = recoveryData.maxAttempts - recoveryData.verificationAttempts;
      alert(`Código incorreto. Você tem mais ${remainingAttempts} tentativa(s).`);
    }
  }
}

function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!newPassword || !confirmPassword) {
    alert('Por favor, preencha todos os campos.');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('As senhas não coincidem. Por favor, verifique.');
    return;
  }
  
  if (!validatePassword(newPassword)) {
    alert('A senha deve ter pelo menos 8 caracteres, incluindo letras e números.');
    return;
  }
  
  // Em um ambiente real, aqui seria uma chamada para o backend atualizar a senha
  console.log(`Senha alterada com sucesso para o email: ${recoveryData.email}`);
  
  // Mostrar mensagem de sucesso
  document.querySelector('.password_recovery.step3').style.display = 'none';
  document.querySelector('.password_recovery.success').style.display = 'block';
}

// Funções auxiliares
function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function validatePassword(password) {
  // Senha deve ter pelo menos 8 caracteres e conter letras e números
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function generateRandomCode() {
  // Gerar código de verificação de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Configurar eventos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  // Adicionar eventos para os links de alternar entre formulários
  const loginLink = document.querySelector('.auth-link.login');
  if (loginLink) {
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      // Abrir modal
      document.getElementById('modal').style.display = 'block';
      showLoginForm();
    });
  }
  
  const signupLink = document.querySelector('.auth-link.signup');
  if (signupLink) {
    signupLink.addEventListener('click', function(e) {
      e.preventDefault();
      // Abrir modal
      document.getElementById('modal').style.display = 'block';
      showRegisterForm();
    });
  }
  
  // Fechar modal
  const closeModal = document.querySelector('.modal_close');
  if (closeModal) {
    closeModal.addEventListener('click', function() {
      document.getElementById('modal').style.display = 'none';
    });
  }
  
  // Fechar modal ao clicar fora dele
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('modal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
// Adicionando funções para melhorar a navegação entre os formulários
document.addEventListener('DOMContentLoaded', function() {
  // Links principais da navegação
  const loginLink = document.querySelector('.auth-link.login');
  const signupLink = document.querySelector('.auth-link.signup');
  const modalClose = document.querySelector('.modal_close');
  const modal = document.getElementById('modal');
  
  // Formulários
  const loginForm = document.querySelector('.user_login');
  const registerForm = document.querySelector('.user_register');
  const recoveryForms = document.querySelectorAll('.password_recovery');
  
  // Links internos para navegação entre formulários
  const forgotPasswordLink = document.querySelector('.forgot_password');
  const backToLoginLinks = document.querySelectorAll('.password_recovery .btn_gray');
  
  // Adicionar link de "Já possui conta? Faça login" no formulário de cadastro
  const registerFormActions = registerForm.querySelector('.action_btns');
  if (registerFormActions) {
    const loginFromRegister = document.createElement('a');
    loginFromRegister.href = "#";
    loginFromRegister.className = "switch-to-login";
    loginFromRegister.textContent = "Já possui conta? Faça login";
    loginFromRegister.style.display = "block";
    loginFromRegister.style.marginTop = "10px";
    loginFromRegister.style.textAlign = "center";
    registerFormActions.parentNode.appendChild(loginFromRegister);
    
    // Adicionar evento para voltar ao login
    loginFromRegister.addEventListener('click', function(e) {
      e.preventDefault();
      showLoginForm();
    });
  }
  
  // Adicionar link de "Não possui conta? Cadastre-se" no formulário de login
  const loginFormActions = loginForm.querySelector('.action_btns');
  if (loginFormActions) {
    const registerFromLogin = document.createElement('a');
    registerFromLogin.href = "#";
    registerFromLogin.className = "switch-to-register";
    registerFromLogin.textContent = "Não possui conta? Cadastre-se";
    registerFromLogin.style.display = "block";
    registerFromLogin.style.marginTop = "10px";
    registerFromLogin.style.textAlign = "center";
    loginFormActions.parentNode.insertBefore(registerFromLogin, document.querySelector('.forgot_password'));
    
    // Adicionar evento para ir ao cadastro
    registerFromLogin.addEventListener('click', function(e) {
      e.preventDefault();
      showRegisterForm();
    });
  }
  
  // Funções para mostrar formulários específicos
  function showLoginForm() {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    
    // Ocultar todos os formulários de recuperação
    recoveryForms.forEach(form => {
      form.style.display = 'none';
    });
  }

  function showRegisterForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    
    // Ocultar todos os formulários de recuperação
    recoveryForms.forEach(form => {
      form.style.display = 'none';
    });
  }
  
  // Eventos para os links principais
  if (loginLink) {
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (modal) modal.style.display = 'block';
      showLoginForm();
    });
  }
  
  if (signupLink) {
    signupLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (modal) modal.style.display = 'block';
      showRegisterForm();
    });
  }
  
  // Evento para o link "Esqueceu a senha?"
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      showPasswordRecovery();
    });
  }
  
  // Fechar modal
  if (modalClose) {
    modalClose.addEventListener('click', function() {
      if (modal) modal.style.display = 'none';
    });
  }
  
  // Fechar modal ao clicar fora dele
  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});