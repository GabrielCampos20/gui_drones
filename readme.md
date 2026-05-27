# Histórico de Atualizações do Projeto

Este documento detalha todas as modificações, refatorações e adições de funcionalidades realizadas no projeto gui_drones, desde o início do fluxo de trabalho na página de histórico até a consolidação do Dashboard Aeronáutico de simulação em tempo real.

---

## 1. Configuração e Gravação de Parâmetros
* **Validação de Inputs (Frontend):** Corrigido o formulário de configuração para impedir valores negativos ou zerados. Adicionada regra de validação para garantir que o valor de `ar.max` seja sempre maior que `ar.min`.
* **Geração do Arquivo Properties:** O frontend passou a enviar os parâmetros submetidos para o backend, que por sua vez escreve e sobrescreve o arquivo `sims/config.properties` antes de cada execução do simulador Java.

## 2. Controle de Execução
* **Parar Simulação:** Adicionada a funcionalidade para abortar uma simulação em andamento de forma abrupta e segura (Kill do Processo Java).
* **Limpeza de Histórico:** Criada uma funcionalidade na página de Histórico com o botão de limpar todos os registros (limpeza lógica no banco de dados e remoção visual imediata).

## 3. Componentização Visual (Modais)
* **Remoção de Alerts Nativos:** Todos os `alerts` e confirmadores padrão do navegador foram descontinuados em prol de um sistema estético coerente.
* **Componente de Modal Customizado (`Modal.tsx`):** Criação de um componente reutilizável com comportamento de fundo borrado (blur), temas focados em perigo (vermelho para exclusões) ou neutros, exibindo opções de "Sim/Não".
* **Animações de Entrada:** Adicionados *keyframes* CSS para garantir que a abertura dos modais tenha uma animação sutil e fluida (`modalContentZoom` e `modalOverlayFade`).

## 4. Visualização de Simulação em Tempo Real (Primeira Versão)
* **Arquitetura de Mensageria (SSE):** Desenvolvimento do endpoint de *Server-Sent Events* no backend para ler a saída do console do Java (`stdout` e `stderr`) em tempo real e emitir eventos de embarque, chegada e queda de drones.
* **Drone Arena 2D Básica:** Criação do ambiente bidimensional, inicialmente com ícones básicos (quadrados e círculos) para representar o transporte entre galpões.
* **Sincronização de Encerramento:** Resolução do bug de "entregas infinitas" e drones parando fora do galpão, com o ajuste das margens e zeragem do loop ao receber a flag `simulation_end`.

## 5. Dashboard Aeronáutico Definitivo (Redesign Completo)
* **Correção do Vazamento de Logs (Backend):** Identificação e correção do bug crítico onde pacotes perdidos não eram contados corretamente. A leitura em partes do `child.stderr` cortava palavras e quebrava o REGEX. A solução envolveu a criação de um **Line Buffer** que aguarda linhas completas (`\n`) antes do processamento.
* **Estética de Radar Tecnológico:** A tela "Drone Arena" foi completamente reconstruída sob uma estética Dark "HUD", utilizando paletas restritas (Cyan Primary, Dark Background, Success/Error) sem suporte ao modo claro e focado em alta precisão visual.
* **Sistema de Voo e Ícones (Lucide):**
  - **Identidade Visual:** Em vez de pontos comuns, a frota passou a ser representada pelo ícone de navegação (`Navigation`) dinamicamente animado.
  - **Faixas (Lanes) Dinâmicas:** 5 Drones fluem de modo cíclico pelo mapa simulando rotas instrumentadas independentes. Drones entregando possuem cor Cyan + "Glow", drones retornando operam em tom "Muted".
* **Animação Realista de Quedas:** As perdas de pacotes ativam uma animação de queda, onde o ícone permuta para `<AlertTriangle />` piscando em alerta, rotaciona e cai do grid SVG principal. Rapidamente um drone repositor adentra na base de Origem para recuperar o limite da frota operacional.
* **Stream Via Fetch:** Substituição da arquitetura tradicional EventSource pelo uso de `fetch` atrelado a um `ReadableStream`, interpretando precisamente blocos SSE customizados e alinhado aos padrões restritos do servidor.

---

*Estas modificações estabeleceram as bases para a operação síncrona e visualmente rica do simulador GUI Drones na web.*
