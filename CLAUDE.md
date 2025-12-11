# Barony - Notas de Desenvolvimento

## Última Sessão (2025-12-09)

### Trabalho em Progresso: Regras Oficiais de Pontuação

**Objetivo:** Ajustar o sistema de pontuação para seguir as regras oficiais do Barony.

### Regras Oficiais do Barony:
- **Pontuação Final** = Victory Points + Recursos não gastos
- VP já inclui 10 pontos por cada cidade construída
- **NÃO há pontos por título** (título é apenas visual/desempate)
- **Desempate:** jogador empatado mais distante do primeiro jogador na ordem de turno vence

### Alterações Concluídas:

1. **server/BattleActions.js** - `calculateFinalScore()`:
   - Removido `titlePoints` (baron:0, viscount:5, count:10, marquis:15, duke:25)
   - Agora calcula apenas: `victoryPoints + getTotalResources()`

2. **server/TurnManager.js**:
   - `calculateAllScores()`: Adicionado `turnOrderIndex` para cada jogador
   - `determineWinner()`: Ordena por score, desempata por `turnOrderIndex` (maior índice = jogou por último = vence)
   - `endGame()`: Retorna `sortedScores` ordenado corretamente

3. **client/PlayerInterface.js** + **client/style.css**:
   - Adicionado HUD mostrando título e pontos de recursos de todos jogadores
   - Badges coloridos por título (baron cinza, viscount azul, count roxo, marquis dourado, duke rosa)

### Alterações Pendentes:

1. **tests/TurnManager.test.js** - Precisa atualizar:
   - `should calculate score based on title` → mudar para testar VP + recursos
   - `should calculate scores for all players` → remover expectativa de ordenação por título
   - `should sort scores by highest first` → testar por VP, não por título

2. **tests/Sessions.test.js** e **tests/simulation.test.js**:
   - Verificar se `calculateFinalScore` esperado precisa ser ajustado

### Problema Encontrado:
- Arquivos sendo modificados automaticamente (provavelmente linter/IDE com auto-save)
- Isso bloqueia a ferramenta Edit

### Comandos Úteis:
```bash
npm test                    # Rodar todos os testes
npm start                   # Iniciar servidor
git diff                    # Ver alterações não commitadas
```

### Commits Recentes:
- `8a126df` - feat: add player HUD showing titles and resource points for all players
- `4dd0801` - fix: update resource display after knight movement and fix tests
