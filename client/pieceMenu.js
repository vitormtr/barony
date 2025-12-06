// Módulo para menu de seleção de peças (fase de posicionamento inicial)
import { socket, player, emitRequestPlayerData } from "./ClientSocketEvents.js";
import { showError, showSuccess, showWarning, showInfo } from "./notifications.js";
import { isMyTurn, getLocalPlayerId } from "./turnIndicator.js";

let currentPhase = 'waiting';
let citiesRemaining = 3;
let isProcessing = false;
let pieceMenuElement = null;
let phaseIndicatorElement = null;

export function setPhase(phase) {
  currentPhase = phase;
  updatePhaseIndicator();
}

export function setPlacementStep(step) {
  // Mantido por compatibilidade, mas não é mais usado
  updatePhaseIndicator();
}

export function setCitiesRemaining(count) {
  citiesRemaining = count;
  updatePhaseIndicator();
}

export function setCityPosition(pos) {
  // Mantido por compatibilidade, mas não é mais usado
}

export function getCurrentPhase() {
  return currentPhase;
}

// Cria ou atualiza o indicador de fase
function updatePhaseIndicator() {
  if (!phaseIndicatorElement) {
    phaseIndicatorElement = document.createElement('div');
    phaseIndicatorElement.id = 'phase-indicator';
    document.body.appendChild(phaseIndicatorElement);
  }

  let message = '';
  let subMessage = '';

  if (currentPhase === 'initialPlacement') {
    message = `Coloque sua Cidade (${citiesRemaining} restante${citiesRemaining > 1 ? 's' : ''})`;
    subMessage = 'Planície ou Campo - Cavaleiro adicionado automaticamente';
  } else if (currentPhase === 'battle') {
    message = 'Fase de Batalha';
    subMessage = 'O jogo começou!';
  } else {
    message = 'Aguardando...';
    subMessage = '';
  }

  phaseIndicatorElement.innerHTML = `
    <div class="phase-message">${message}</div>
    ${subMessage ? `<div class="phase-submessage">${subMessage}</div>` : ''}
  `;

  phaseIndicatorElement.style.display = currentPhase === 'initialPlacement' || currentPhase === 'battle' ? 'block' : 'none';
}

// Mostra o menu de peças ao clicar em um hexágono
export function showPieceMenu(hex) {
  if (currentPhase !== 'initialPlacement') {
    return;
  }

  // Verifica se é o turno do jogador
  if (!isMyTurn()) {
    showWarning('Não é seu turno!');
    return;
  }

  const hexData = JSON.parse(hex.dataset.hex);

  // Verifica se o hexágono tem textura
  if (!hexData.texture) {
    showWarning('Selecione um hexágono com textura!');
    return;
  }

  // Verifica se o hexágono já está ocupado
  if (hexData.pieces && hexData.pieces.length > 0) {
    showWarning('Este hexágono já está ocupado!');
    return;
  }

  // Validação de terreno para cidade (apenas planície e campo)
  const validCityTerrains = ['plain.png', 'farm.png'];
  if (!validCityTerrains.includes(hexData.texture)) {
    showError('Cidades só podem ser colocadas em planície ou campo!');
    return;
  }

  // Mostra o menu de confirmação
  showPieceConfirmation(hex);
}

// Mostra diálogo de confirmação para colocar a cidade
function showPieceConfirmation(hex) {
  if (pieceMenuElement) {
    pieceMenuElement.remove();
  }

  const cityCount = player?.pieces?.city || 0;
  const knightCount = player?.pieces?.knight || 0;

  pieceMenuElement = document.createElement('div');
  pieceMenuElement.id = 'piece-menu';
  pieceMenuElement.className = 'piece-menu';
  pieceMenuElement.innerHTML = `
    <div class="piece-menu-content">
      <div class="piece-icon city"></div>
      <div class="piece-name">Cidade + Cavaleiro</div>
      <div class="piece-count">Cidades: ${cityCount} | Cavaleiros: ${knightCount}</div>
      <button id="confirmPieceBtn" class="piece-btn confirm">Confirmar</button>
      <button id="cancelPieceBtn" class="piece-btn cancel">Cancelar</button>
    </div>
  `;

  document.body.appendChild(pieceMenuElement);

  // Posiciona perto do hexágono
  const rect = hex.getBoundingClientRect();
  pieceMenuElement.style.left = `${rect.left + rect.width / 2}px`;
  pieceMenuElement.style.top = `${rect.top - 10}px`;

  // Event listeners
  document.getElementById('confirmPieceBtn').addEventListener('click', () => {
    placePiece(hex);
  });

  document.getElementById('cancelPieceBtn').addEventListener('click', () => {
    hidePieceMenu();
  });

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', handleClickOutsidePieceMenu);
  }, 100);
}

function handleClickOutsidePieceMenu(event) {
  if (pieceMenuElement && !pieceMenuElement.contains(event.target)) {
    hidePieceMenu();
  }
}

function hidePieceMenu() {
  if (pieceMenuElement) {
    pieceMenuElement.remove();
    pieceMenuElement = null;
  }
  document.removeEventListener('click', handleClickOutsidePieceMenu);
}

// Envia a requisição para colocar a cidade (cavaleiro é automático)
function placePiece(hex) {
  if (isProcessing) {
    showWarning('Aguarde a ação anterior ser processada...');
    return;
  }

  const payload = {
    row: parseInt(hex.dataset.row),
    col: parseInt(hex.dataset.col)
  };

  isProcessing = true;
  showLoadingOverlay(true);

  socket.emit('placePiece', payload);

  socket.once('placePieceResult', (result) => {
    isProcessing = false;
    showLoadingOverlay(false);
    hidePieceMenu();

    if (result.success) {
      showSuccess('Cidade + Cavaleiro colocados!');
      emitRequestPlayerData();
    } else {
      showError(result.message || 'Falha ao colocar a cidade.');
    }
  });

  // Timeout de segurança
  setTimeout(() => {
    if (isProcessing) {
      isProcessing = false;
      showLoadingOverlay(false);
      showError('Tempo esgotado. Tente novamente.');
    }
  }, 5000);
}

function showLoadingOverlay(show) {
  let overlay = document.getElementById('loading-overlay');

  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

// Reseta o estado quando o jogo reinicia
export function resetPlacementState() {
  currentPhase = 'waiting';
  citiesRemaining = 3;
  isProcessing = false;
  hidePieceMenu();
  updatePhaseIndicator();
}

// Adiciona handler de clique nos hexágonos para a fase de posicionamento
export function addPieceClickHandler() {
  document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('click', handleHexClickForPiece);
  });
}

function handleHexClickForPiece(event) {
  if (currentPhase === 'initialPlacement') {
    event.stopPropagation();
    showPieceMenu(this);
  }
}
