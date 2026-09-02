/* BIANGHI INNOVATIONS — main.js (v2)
   Menu mobile, alternador de tema claro/escuro, header ao rolar, animações
   de entrada, contadores da faixa de números e partículas do hero (canvas,
   pausado fora da viewport). */

(function () {
  "use strict";

  // Marca que o JS está ativo — o CSS só esconde os .reveal a partir daqui,
  // garantindo que sem JS todo o conteúdo fique visível.
  document.documentElement.classList.add("js");

  var reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".header");
  var toggle = document.getElementById("menu-toggle");
  var nav = document.getElementById("menu-principal");

  /* ---------- Menu mobile ---------- */

  function abrirMenu() {
    nav.classList.add("nav--aberto");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
  }

  function fecharMenu() {
    nav.classList.remove("nav--aberto");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
  }

  toggle.addEventListener("click", function () {
    if (nav.classList.contains("nav--aberto")) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });

  // Fecha o menu ao escolher um item (navegação por âncora)
  nav.addEventListener("click", function (evento) {
    if (evento.target.closest("a")) {
      fecharMenu();
    }
  });

  // Fecha com Esc e devolve o foco ao botão
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && nav.classList.contains("nav--aberto")) {
      fecharMenu();
      toggle.focus();
    }
  });

  // Ao passar para desktop (nav horizontal ≥ 900px), garante o painel fechado
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) {
      fecharMenu();
    }
  });

  /* ---------- Tema claro/escuro ----------
     Ausência de data-theme no <html> = escuro (padrão da marca). O script
     inline do <head> já aplicou o tema salvo antes do primeiro paint; aqui
     sincronizamos o botão, tratamos o clique e persistimos a escolha. */

  var CHAVE_TEMA = "bianghi-tema"; // mesma chave do script inline do <head>
  var raiz = document.documentElement;
  var botaoTema = document.getElementById("tema-toggle");
  var metaCorTema = document.querySelector('meta[name="theme-color"]');
  var recolorirParticulas = null; // definido no bloco das partículas, quando ativas

  function temaAtual() {
    return raiz.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function aplicarTema(tema) {
    if (tema === "light") {
      raiz.setAttribute("data-theme", "light");
    } else {
      raiz.removeAttribute("data-theme");
    }
    if (metaCorTema) {
      metaCorTema.setAttribute("content", tema === "light" ? "#FFFFFF" : "#0D0D0D");
    }
    if (botaoTema) {
      botaoTema.setAttribute("aria-pressed", tema === "light" ? "true" : "false");
    }
    if (recolorirParticulas) {
      recolorirParticulas();
    }
  }

  function salvarTema(tema) {
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch (erro) {
      // Armazenamento indisponível (modo privado, cota...): a escolha vale só nesta visita
    }
  }

  if (botaoTema) {
    // Sincroniza o estado do botão com o tema já aplicado pelo <head>
    botaoTema.setAttribute("aria-pressed", temaAtual() === "light" ? "true" : "false");

    botaoTema.addEventListener("click", function () {
      var novoTema = temaAtual() === "light" ? "dark" : "light";
      aplicarTema(novoTema);
      salvarTema(novoTema);
    });
  }

  // Outra aba do site mudou o tema: acompanha sem regravar
  window.addEventListener("storage", function (evento) {
    if (evento.key === CHAVE_TEMA) {
      aplicarTema(evento.newValue === "light" ? "light" : "dark");
    }
  });

  /* ---------- Header ao rolar ---------- */

  function atualizarHeader() {
    header.classList.toggle("header--scrolled", window.scrollY > 8);
  }

  window.addEventListener("scroll", atualizarHeader, { passive: true });
  atualizarHeader();

  /* ---------- Animações de entrada ---------- */

  var elementos = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduzMovimento) {
    elementos.forEach(function (el) {
      el.classList.add("reveal--visivel");
    });
  } else {
    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("reveal--visivel");
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    elementos.forEach(function (el) {
      observador.observe(el);
    });
  }

  /* ---------- Contadores da faixa de números ----------
     O HTML já traz o valor final como texto (funciona sem JS);
     a animação só roda quando permitida. */

  var contadores = document.querySelectorAll(".numero__contador");

  function animarContagem(el) {
    var alvo = parseInt(el.getAttribute("data-contagem"), 10);
    if (isNaN(alvo)) {
      return;
    }
    var duracao = 1400;
    var inicio = null;

    function passo(agora) {
      if (inicio === null) {
        inicio = agora;
      }
      var progresso = Math.min((agora - inicio) / duracao, 1);
      var suavizado = 1 - Math.pow(1 - progresso, 3);
      el.textContent = String(Math.round(alvo * suavizado));
      if (progresso < 1) {
        requestAnimationFrame(passo);
      }
    }

    requestAnimationFrame(passo);
  }

  if (contadores.length && !reduzMovimento && "IntersectionObserver" in window) {
    var observadorContagem = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            observadorContagem.unobserve(entrada.target);
            animarContagem(entrada.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    contadores.forEach(function (el) {
      observadorContagem.observe(el);
    });
  }

  /* ---------- Partículas do hero (canvas) ----------
     Pontos leves em deriva com conexões curtas. Pausa quando o hero sai
     da viewport ou a aba fica oculta; não roda com prefers-reduced-motion. */

  var canvas = document.getElementById("hero-particulas");

  if (canvas && canvas.getContext && !reduzMovimento) {
    var ctx = canvas.getContext("2d");
    var hero = canvas.closest(".hero");

    // Cores neutras parametrizáveis por tema, via custom properties no canvas
    // (definidas em styles-light.css). Sem definição no CSS valem os padrões
    // abaixo — exatamente os valores da v2 dark. Relidas ao alternar o tema.
    var COR_NEUTRA;
    var ALFA_PONTO_NEUTRO;
    var ALFA_LINHA_NEUTRA;

    var lerCores = function () {
      var estilosCanvas = window.getComputedStyle(canvas);
      var lerParametro = function (nome, padrao) {
        var valor = estilosCanvas.getPropertyValue(nome).trim();
        return valor !== "" ? valor : padrao;
      };
      COR_NEUTRA = lerParametro("--particulas-cor-neutra", "255, 255, 255");
      ALFA_PONTO_NEUTRO = parseFloat(lerParametro("--particulas-alfa-ponto", "0.4"));
      ALFA_LINHA_NEUTRA = parseFloat(lerParametro("--particulas-alfa-linha", "0.08"));
    };

    lerCores();

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var largura = 0;
    var altura = 0;
    var particulas = [];
    var idAnimacao = null;
    var heroVisivel = true;
    var DISTANCIA_LIGACAO = 110;

    var criarParticulas = function () {
      var quantidade = Math.min(Math.round((largura * altura) / 16000), 90);
      particulas = [];
      for (var i = 0; i < quantidade; i++) {
        particulas.push({
          x: Math.random() * largura,
          y: Math.random() * altura,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          raio: Math.random() * 1.4 + 0.6,
          vermelha: Math.random() < 0.18
        });
      }
    };

    var redimensionar = function () {
      largura = hero.offsetWidth;
      altura = hero.offsetHeight;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      criarParticulas();
    };

    // Um quadro: move as partículas e desenha ligações e pontos
    var quadro = function () {
      ctx.clearRect(0, 0, largura, altura);

      var i;
      var j;

      // Movimento (com "wrap" nas bordas)
      for (i = 0; i < particulas.length; i++) {
        var p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = largura + 10;
        if (p.x > largura + 10) p.x = -10;
        if (p.y < -10) p.y = altura + 10;
        if (p.y > altura + 10) p.y = -10;
      }

      // Ligações curtas
      for (i = 0; i < particulas.length; i++) {
        for (j = i + 1; j < particulas.length; j++) {
          var a = particulas[i];
          var b = particulas[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DISTANCIA_LIGACAO) {
            var forca = 1 - dist / DISTANCIA_LIGACAO;
            if (a.vermelha || b.vermelha) {
              ctx.strokeStyle = "rgba(227, 6, 19, " + (forca * 0.22).toFixed(3) + ")";
            } else {
              ctx.strokeStyle = "rgba(" + COR_NEUTRA + ", " + (forca * ALFA_LINHA_NEUTRA).toFixed(3) + ")";
            }
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Pontos
      for (i = 0; i < particulas.length; i++) {
        var q = particulas[i];
        ctx.fillStyle = q.vermelha
          ? "rgba(227, 6, 19, 0.85)"
          : "rgba(" + COR_NEUTRA + ", " + ALFA_PONTO_NEUTRO + ")";
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.raio, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Laço de animação
    var desenhar = function () {
      quadro();
      idAnimacao = requestAnimationFrame(desenhar);
    };

    // Ao alternar o tema: relê as cores; se a animação estiver pausada (hero
    // fora da viewport ou aba oculta), redesenha um quadro estático para o
    // canvas não guardar as cores do tema anterior.
    recolorirParticulas = function () {
      lerCores();
      if (idAnimacao === null) {
        quadro();
      }
    };

    var iniciar = function () {
      if (idAnimacao === null && heroVisivel && !document.hidden) {
        idAnimacao = requestAnimationFrame(desenhar);
      }
    };

    var parar = function () {
      if (idAnimacao !== null) {
        cancelAnimationFrame(idAnimacao);
        idAnimacao = null;
      }
    };

    redimensionar();

    var atrasoRedimensionar = null;
    window.addEventListener("resize", function () {
      clearTimeout(atrasoRedimensionar);
      atrasoRedimensionar = setTimeout(redimensionar, 150);
    });

    if ("IntersectionObserver" in window) {
      var observadorHero = new IntersectionObserver(function (entradas) {
        heroVisivel = entradas[0].isIntersecting;
        if (heroVisivel) {
          iniciar();
        } else {
          parar();
        }
      });
      observadorHero.observe(hero);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        parar();
      } else {
        iniciar();
      }
    });

    iniciar();
  }
})();
