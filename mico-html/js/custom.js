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
})
// js/custom.js

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
        form.style.display = 'none';
      });
      formToShow.style.display = 'block';
    }
  
    // Abrir modal com formulário específico
    modalTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'block';
        const targetForm = trigger.getAttribute('data-modal');
        if (targetForm === 'login_form') {
          showForm(loginForm);
        } else {
          showForm(registerForm);
        }
      });
    });
  
    // Fechar modal
    modalClose.addEventListener('click', () => {
      modal.style.display = 'none';
      showForm(loginForm); // Volta para o login por padrão (opcional)
      document.addEventListener('DOMContentLoaded', function () {
        // Verifica se o elemento #foto existe
        const fotoInput = document.getElementById('foto');
        if (!fotoInput) {
            console.error("Elemento com ID 'foto' não encontrado.");
            return;
        }
    
        // Verifica se o elemento #file-names existe
        const fileNamesSpan = document.getElementById('file-names');
        if (!fileNamesSpan) {
            console.error("Elemento com ID 'file-names' não encontrado.");
            return;
        }
    
        // Adiciona o evento de mudança ao input de arquivo
        fotoInput.addEventListener('change', function () {
            const fileNames = Array.from(this.files).map(file => file.name).join(', ');
            fileNamesSpan.textContent = fileNames || '';
        });
    });
    
    });
  });

  