document.addEventListener('DOMContentLoaded', () => {
    // Inicializa AOS (se necessário)
    AOS.init({
        duration: 1200,
        offset: 200, // Configuração do AOS
    });

    // Configuração de velocidade para os contadores
    const speed = 200;
    const counters = document.querySelectorAll('.counter');
    const numerosSection = document.getElementById('numeros');
    const cards = document.querySelectorAll('.solucao-card'); // Ajustado para o nome correto da classe
    const mensagemPequena = document.querySelector('.mensagem-pequena');
    const mensagemGrande = document.querySelector('.mensagem-grande');

    // Função para animar os contadores
    const animateCounter = (counter) => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText || 0;
            const increment = Math.max(target / speed, 1);

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                requestAnimationFrame(updateCount);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    };

    // Configuração do IntersectionObserver
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animação dos contadores
                if (entry.target.classList.contains('counter')) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
                // Adiciona a classe 'visible' à seção de números
                else if (entry.target.id === 'numeros') {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
                // Animação dos cards
                else if (entry.target.classList.contains('solucao-card')) {
                    entry.target.classList.add('show');
                    observer.unobserve(entry.target);
                }
                // Animação das mensagens
                else if (entry.target === mensagemPequena || entry.target === mensagemGrande) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            }
        });
    }, { threshold: 0.1 });

    // Observa os elementos
    counters.forEach(counter => observer.observe(counter));
    observer.observe(numerosSection);
    cards.forEach(card => observer.observe(card));
    observer.observe(mensagemPequena);
    observer.observe(mensagemGrande);

    // Fallback para navegadores sem suporte ao IntersectionObserver
    if (!('IntersectionObserver' in window)) {
        counters.forEach(counter => animateCounter(counter));
        numerosSection.classList.add('visible');
        cards.forEach(card => card.classList.add('show'));
        mensagemPequena.classList.add('visible');
        mensagemGrande.classList.add('visible');
    }

    // Função para destacar o card ao clicar
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Remover destaque de todos os cards
            cards.forEach(c => c.classList.remove('highlighted'));

            // Adicionar destaque ao card clicado
            card.classList.add('highlighted');
        });
    });

    // Efeito de digitação
    const text = "CONECTANDO MARCAS A MILHÕES DE PESSOAS TODOS OS DIAS."; // Texto a ser digitado
    const typingElement = document.getElementById("typing-effect");
    let index = 0;

    // Adiciona um espaço inicial para garantir que o cursor pisque
    typingElement.textContent = " ";

    function type() {
        if (index < text.length) {
            typingElement.textContent += text.charAt(index); // Adiciona uma letra por vez
            index++;
            setTimeout(type, 100); // Tempo entre cada letra
        }
    }

    // Inicia o efeito de digitação
    type();
    //typingElement.style.borderRight = '2px solid white'; // Adiciona a borda ao final
});

class MobileNavbar {
    constructor(mobileMenu, navList, navLinks) {
      this.mobileMenu = document.querySelector(mobileMenu);
      this.navList = document.querySelector(navList);
      this.navLinks = document.querySelectorAll(navLinks);
      this.activeClass = "active";
  
      this.handleClick = this.handleClick.bind(this);
    }
  
    animateLinks() {
      this.navLinks.forEach((link, index) => {
        link.style.animation
          ? (link.style.animation = "")
          : (link.style.animation = `navLinkFade 0.5s ease forwards ${
              index / 7 + 0.3
            }s`);
      });
    }
  
    handleClick() {
      this.navList.classList.toggle(this.activeClass);
      this.mobileMenu.classList.toggle(this.activeClass);
      this.animateLinks();
    }
  
    addClickEvent() {
      this.mobileMenu.addEventListener("click", this.handleClick);
    }
  
    init() {
      if (this.mobileMenu) {
        this.addClickEvent();
      }
      return this;
    }
  }
  
  const mobileNavbar = new MobileNavbar(
    ".mobile-menu",
    ".nav-list",
    ".nav-list li",
  );
  mobileNavbar.init();
