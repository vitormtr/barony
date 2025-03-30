export const gameState = {
    // Estado principal
    currentBoard: [],
    players: new Map(),
    textureMap: new Map(),
    connections: {
      isConnected: false,
      socketId: null
    },
    
    // Controles do jogo
    currentPlayer: null,
    gamePhase: 'setup', // ['setup', 'placement', 'battle', 'ended']
    
    /**
     * Inicializa o estado do jogo
     * @param {Array} boardData - Dados iniciais do tabuleiro
     */
    init(boardData) {
      this.currentBoard = boardData.map(row => [...row]);
      this.textureMap.clear();
      this.players.clear();
      this.gamePhase = 'setup';
      this._buildTextureCache();
    },
  
    /**
     * Atualiza todo o tabuleiro
     * @param {Array} newBoard - Nova matriz do tabuleiro
     */
    updateBoard(newBoard) {
      this.currentBoard = newBoard.map(row => [...row]);
      this._buildTextureCache();
    },
  
    /**
     * Atualiza lista de jogadores
     * @param {Object} players - Objeto de jogadores indexado por ID
     */
    updatePlayers(players) {
      this.players = new Map(Object.entries(players));
    },
  
    /**
     * Define/Cria uma textura em coordenadas específicas
     * @param {number} row - Linha do hexágono
     * @param {number} col - Coluna do hexágono
     * @param {string} texture - Nome da textura
     */
    setTexture(row, col, texture) {
      if (!this.validateCoordinates(row, col)) return;
      
      this.currentBoard[row][col].texture = texture;
      this.textureMap.set(`${row},${col}`, texture);
    },
  
    /**
     * Verifica existência de textura em coordenadas
     * @param {number} row - Linha do hexágono
     * @param {number} col - Coluna do hexágono
     * @returns {boolean}
     */
    hasTextureAt(row, col) {
      return this.textureMap.has(`${row},${col}`);
    },
  
    /**
     * Verifica se posição é adjacente a texturas
     * @param {number} row - Linha alvo
     * @param {number} col - Coluna alva
     * @returns {boolean}
     */
    isAdjacentToTexture(row, col) {
      return CONFIG.DIRECTIONS(row).some(([dRow, dCol]) => {
        return this.hasTextureAt(row + dRow, col + dCol);
      });
    },
  
    /**
     * Atualiza estado de conexão
     * @param {boolean} status - Status da conexão
     * @param {string} socketId - ID da conexão
     */
    updateConnection(status, socketId = null) {
      this.connections.isConnected = status;
      this.connections.socketId = socketId;
    },
  
    // Métodos auxiliares
    validateCoordinates(row, col) {
      return (
        row >= 0 &&
        col >= 0 &&
        row < this.currentBoard.length &&
        col < this.currentBoard[row]?.length
      );
    },
  
    _buildTextureCache() {
      this.textureMap.clear();
      this.currentBoard.forEach((row, r) => {
        row.forEach((hex, c) => {
          if (hex.texture) this.textureMap.set(`${r},${c}`, hex.texture);
        });
      });
    },
  
    // Getters de estado
    get hasTextures() {
      return this.textureMap.size > 0;
    },
  
    get currentPlayerData() {
      return this.players.get(this.currentPlayer);
    }
  };