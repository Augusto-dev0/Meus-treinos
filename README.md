# Meus Treinos

App pessoal de gerenciamento de treinos, 100% client-side, sem backend e sem cadastro. Hospedado na Vercel e instalável como PWA no celular.

<div align="center">

![Status](https://img.shields.io/badge/status-ativo-brightgreen)
![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## Demo

> **[meus-treinos-dun.vercel.app](https://meus-treinos-dun.vercel.app/)**

---

## Funcionalidades

### Treinos

- Organize treinos por dia da semana (Segunda a Domingo)
- Crie quantos treinos quiser por dia
- Monte cada treino com exercícios da sua biblioteca pessoal
- Reordene os exercícios com **drag & drop**
- **Copie um treino e cole em outro dia** (ou em vários) sem recriar do zero
- **Marque dias de descanso**: escolha o dia na faixa Seg–Dom e toque em _Marcar descanso_. O dia fica identificado com uma lua, aparece no calendário do histórico e **não quebra a sequência**. Se você treinar naquele dia, a marcação é removida sozinha; e um dia em que você já treinou não pode ser marcado como descanso

### Painel do topo

- **Tempo treinando** (primeira pílula): conta desde o seu primeiro treino concluído, em **uma única unidade**: dias (menos de 1 mês), meses (menos de 1 ano) ou anos
- **Exerc.**: quantidade de exercícios na sua biblioteca
- **Dias**: quantos dias da semana têm treino programado

### Modo Treino Ativo

- Tela de foco exercício por exercício, com o ícone do grupo muscular em destaque
- Transição lateral ao avançar/voltar entre exercícios
- Barra de progresso e cronômetro em tempo real
- Timer de descanso rápido embutido (30s / 1min / 1m30)
- Ao concluir, salva automaticamente no histórico com duração total

### Histórico

- Lista de todos os treinos concluídos com data, dia e exercícios
- **Toque em um treino (ou em um dia do calendário) para abrir o card de detalhes**: data por extenso, nome do treino, duração (minutos ou horas), horário de conclusão, nº de exercícios, grupos musculares e a lista completa com séries/repetições. Se houve mais de um treino no dia, mostra também o total do dia
- Os detalhes guardam uma "foto" dos exercícios no momento do treino, então continuam corretos mesmo se você editar ou apagar o exercício da biblioteca depois
- Edição de registros (nome, data, duração, dia da semana)
- Contador de **sequência** (ícone de chama) — considera apenas dias úteis com treino programado na semana; folgas, fins de semana e **dias de descanso marcados** não quebram a sequência
- Botão **Calendário** em destaque no topo do histórico, com o nome escrito
- **Calendário mensal** com marcação por cor: verde = treinado · ciano (pontinho) = hoje · vermelho = dia perdido (treino programado que não foi feito) · azul tracejado = descanso. Dias de treino e de descanso são clicáveis

### Biblioteca

- Começa vazia — 100% personalizada pelo usuário
- Cadastre nome, grupo muscular, séries, cor e dica para cada exercício
- O **ícone é automático**, definido pelo grupo muscular (veja a seção abaixo); o formulário mostra uma pré-visualização
- Modo de **seleção múltipla** para excluir vários exercícios de uma vez
- Busca por nome, grupo muscular, categoria ou equipamento — **ignora acentos e maiúsculas** (digitar `biceps` encontra _Bíceps_)
- Filtro por grupo muscular

### Ícones dos grupos musculares

Cada exercício usa o ícone do seu grupo, na cor do exercício, em todas as telas (treinos, biblioteca, catálogo, histórico, seleção de exercícios e treino ativo).

| Grupo                                                            | Ícone                                                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Peito, Costas, Ombros, Bíceps, Tríceps, Abdômen, Glúteos, Pernas | Boneco em SVG com o músculo do grupo em destaque (costas, tríceps e glúteos em vista traseira) |
| Cardio                                                           | Ícone de batimento cardíaco                                                                    |
| Mobilidade                                                       | Ícone de tai chi                                                                               |
| Corpo                                                            | Ícone de corrida                                                                               |
| Grupo personalizado                                              | Ícone de corrida (padrão)                                                                      |

Os desenhos são SVG inline e escalam com o tamanho da fonte, então ficam nítidos em qualquer tela. Não há emojis na interface: todos os símbolos usam [Phosphor Icons](https://phosphoricons.com/).

### Explorar Catálogo

- Catálogo com **mais de 5 mil variações** de exercícios organizadas por categoria, grupo muscular e equipamento
- Nomes revisados em português, com acentuação e ortografia corretas (Flexão, Búlgaro, Elevação pélvica, Panturrilha em pé…)
- Filtros combinados: **Categoria** (Academia, Casa, Calistenia…) + **Músculo** + **Equipamento**
- Modo de **seleção múltipla** para adicionar vários exercícios à biblioteca de uma vez
- Adição individual com um clique, ou edição personalizada antes de importar

### Timer

- Cronômetro regressivo com anel SVG animado
- Presets rápidos: 30s, 1min, 1m30, 2min
- Botão **+1min** para estender sem resetar

### Aviso de fim de cronômetro

Disparado em todo cronômetro do site (Timer avulso e descanso do treino ativo), combinando 4 canais para cobrir limitações de cada aparelho:

- **Vibração** (quando o navegador suporta)
- **Som** (bip repetido via Web Audio API, funciona offline)
- **Flash visual** na tela com texto — garantido em qualquer dispositivo
- **Notificação do sistema** (funciona com o app em segundo plano/tela bloqueada, se instalado na tela de início e a permissão for aceita)

> **Nota sobre iPhone:** o Safari não implementa a API de vibração e pode silenciar sons web quando a chave lateral está no modo silencioso. Por isso o flash visual e a notificação do sistema existem como reforço.

### Transições e feedback

- Animações suaves ao trocar de aba, dia, filtros e listas
- Modais e tela de treino ativo abrem e fecham com transição
- Mensagens rápidas (toast) para confirmar ações, como copiar e colar treino
- Respeita a preferência do sistema por menos movimento (`prefers-reduced-motion`)

### Checklist de primeiros passos

- Card guia o usuário novo pelos 3 passos iniciais
- Some automaticamente após concluir tudo
- Pode ser dispensado manualmente

### PWA — Instale no celular

- Funciona **offline** após a primeira visita
- Aparece como app nativo na tela inicial (Android e iOS), com respeito à área da barra de status e ao entalhe da tela
- Atualização automática: o Service Worker busca a versão mais nova de HTML, CSS e JS na rede primeiro e só usa o cache quando está offline
- Sem necessidade de loja de aplicativos

---

## Estrutura do projeto

```
TreinoSite/
├── index.html          # Estrutura, seções e todos os modais
├── style.css           # Estilos, variáveis, animações, responsividade
├── script.js           # Lógica completa do app
├── manifest.json       # Configuração PWA
├── sw.js               # Service Worker (cache offline)
├── README.md
├── LICENSE
└── imagens/
    ├── favicon.ico     # Ícone da aba do browser
    ├── icon-192.png    # Ícone PWA (Android)
    └── icon-512.png    # Ícone PWA (splash screen)
```

---

## Como usar

### Opção 1 — Vercel (recomendado)

1. Acesse `https://meus-treinos-dun.vercel.app/`
2. Para instalar: abra no navegador do celular e use **Adicionar à Tela de Início**

### Opção 2 — Local

```bash
git clone https://github.com/Augusto-dev0/Meus-treinos.git
cd Meus-treinos
# Abra index.html no browser · nenhuma dependência necessária
```

> O Service Worker (modo offline) exige HTTPS ou `localhost`. Para testar localmente com PWA completa, use uma extensão como **Live Server** no VS Code.

### Atualizando o app instalado

Depois de um novo deploy, o app instalado pega a versão nova sozinho. Se por algum motivo ele continuar mostrando a versão antiga, feche-o por completo e abra de novo; em último caso, remova o ícone e adicione novamente.

---

## Tecnologias

| Tecnologia         | Uso                                                             |
| ------------------ | --------------------------------------------------------------- |
| HTML5              | Estrutura, modais, tela de treino ativo                         |
| CSS3               | Variáveis, animações, layout responsivo, confetti               |
| JavaScript ES6+    | Lógica, localStorage, drag & drop, Web Audio, Notifications API |
| SVG inline         | Ícones de grupos musculares e anel do timer                     |
| Phosphor Icons     | Ícones da interface                                             |
| Google Fonts       | Bebas Neue (títulos) + DM Sans (corpo)                          |
| Web App Manifest   | Instalação como PWA                                             |
| Service Worker API | Cache offline com estratégia _network-first_ para HTML/CSS/JS   |

---

## Armazenamento

Todos os dados ficam no `localStorage` do browser — nenhum dado é enviado a servidores.

| Chave                    | Conteúdo                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `mt-library-v1`          | Exercícios da biblioteca pessoal                                                                                                    |
| `mt-workouts-v1`         | Treinos por dia da semana                                                                                                           |
| `mt-history-v1`          | Histórico de treinos concluídos                                                                                                     |
| `mt-checklist-dismissed` | Se o checklist foi dispensado                                                                                                       |
| `mt-restdays-v1`         | Datas marcadas como descanso                                                                                                        |
| `mt-train-since-v1`      | Data do 1º treino (preserva o contador "tempo treinando" mesmo que o histórico, limitado a 100 registros, descarte os mais antigos) |
| `mt-migrated-v5`         | Marca que a migração antiga da biblioteca já rodou                                                                                  |
| `mt-migrated-v6`         | Marca que a atualização de ortografia e grupos musculares já foi aplicada aos dados salvos                                          |

### Migração automática de dados

Na primeira abertura após a atualização v6, o app corrige sozinho os dados que você já tinha: ajusta acentos nos nomes dos exercícios, padroniza os grupos (`Biceps` vira `Bíceps`, `Gluteos` vira `Glúteos` etc.), padroniza equipamentos (`Maquina` vira `Máquina`) e descarta os emojis antigos guardados em cada exercício. Nada é apagado nem duplicado, porque os identificadores do catálogo não mudam.

---

## Responsividade

Testado em 12 tamanhos, de 320 px a 1920 px, em retrato e paisagem. Os ícones e a interface escalam de forma fluida (`clamp()` e unidades `em`).

| Condição                    | Layout                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `≥ 1100px`                  | Desktop largo: container maior e biblioteca com mais colunas                                        |
| `601px – 900px`             | Tablet: abas no topo, biblioteca em 3 colunas, aproveita toda a largura                             |
| `≤ 600px`                   | Celular: bottom navigation fixa, modais como bottom sheet, biblioteca em 2 colunas                  |
| `≤ 480px`                   | Cabeçalho em duas linhas (as 3 pílulas ocupam a largura toda); botão do calendário em largura total |
| `≤ 420px`                   | Cartão de treino: botões de ação descem para uma linha própria (o nome não é cortado)               |
| `≤ 360px`                   | Celulares compactos: ícones, legenda do calendário e espaçamentos reduzidos                         |
| `altura ≤ 560px` (paisagem) | Treino ativo compacto e com rolagem, para os botões nunca ficarem fora de alcance                   |
| `pointer: coarse` (toque)   | Campos com fonte de 16 px (evita o zoom automático do iOS) e botões maiores                         |
| `hover: hover` (mouse)      | Efeitos de hover só em aparelhos com mouse (sem "hover grudado" no toque)                           |

O app também pode ser instalado e usado em **qualquer orientação** (retrato ou paisagem).

---

## Design

- Tema **dark** com fundo `#0a0a0a`
- Cor de destaque: `#c8f060` (verde lima)
- Cores de status no calendário: verde (treinado), ciano `#22d3ee` (hoje), vermelho `#ff5f5f` (perdido)
- Tipografia: **Bebas Neue** (títulos) + **DM Sans** (corpo)
- Ícones: **Phosphor Icons** e SVGs próprios para os grupos musculares, sem emojis
- Animações com `cubic-bezier` e `fadeUp`
- Confetti CSS puro na tela de conclusão de treino

---

## Contato

**Desenvolvido por Luiz Augusto**

[![GitHub](https://img.shields.io/badge/GitHub-Augusto--dev0-f97316?style=flat-square&logo=github)](https://github.com/Augusto-dev0)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-luiz--augusto7x-f97316?style=flat-square&logo=linkedin)](https://linkedin.com/in/luiz-augusto7x)
[![Instagram](https://img.shields.io/badge/Instagram-luiz.augusto7x-f97316?style=flat-square&logo=instagram)](https://www.instagram.com/luiz.augusto7x/)

---

## Licença

![License: Proprietary](https://img.shields.io/badge/licen%C3%A7a-Propriet%C3%A1ria-red)

Licença proprietária — todos os direitos reservados ao autor.
Nenhuma permissão é concedida para uso, cópia, modificação ou distribuição deste conteúdo sem autorização prévia e por escrito.

Consulte o arquivo [`LICENSE`](./LICENSE) para os termos completos.
