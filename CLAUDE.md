# Barony - Notas de Desenvolvimento

## Última Sessão (2025-12-18)

### Regras de Vitória:
1. **Maior título vence**
2. **Desempate 1:** mais cidades construídas
3. **Desempate 2:** mais batalhas vencidas

### Ranking de Títulos:
- Baron: 0
- Viscount: 1
- Count: 2
- Marquis: 3
- Duke: 4

### Pontuação (para exibição, não determina vencedor):
- `score = victoryPoints + resources`
- VP inclui 10 pontos por cada cidade construída

### Limite de Peças por Hex:
- Máximo 2 peças por hex em batalha
- Movimento bloqueado se resultaria em 3+ peças
- Combate pode reduzir peças (2 cavaleiros destroem 1 inimigo)

### Movimento de Cavaleiros:
- Cada cavaleiro só pode mover 1x por turno
- Jogador pode fazer 2 movimentos com cavaleiros diferentes

### Comandos Úteis:
```bash
npm test                    # Rodar todos os testes
npm start                   # Iniciar servidor
git diff                    # Ver alterações não commitadas
```
