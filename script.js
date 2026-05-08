document.addEventListener('DOMContentLoaded', () => {
    // 1. ELEMENTE UND GLOBALE VARIABLEN
    const canvas = document.getElementById('muehle-canvas');
    const ctx = canvas.getContext('2d');
    const statusText = document.getElementById('status-text');
    const phaseText = document.getElementById('phase-text');
    const resetButton = document.getElementById('reset-button');
    const capturedByPlayer1Div = document.getElementById('captured-by-player1');
    const capturedByPlayer2Div = document.getElementById('captured-by-player2');

    const placeSound = document.getElementById('place-sound');
    const moveSound = document.getElementById('move-sound');
    const removeSound = document.getElementById('remove-sound');
    const winSound = document.getElementById('win-sound');

    const AI_PLAYER_NUM = 2;
    const AI_DIFFICULTY = 3;

    let gameState, currentPlayer, board, player1Stones, player2Stones, placedStonesP1, placedStonesP2, selectedPieceIndex;
    let size, margin, boxSize;
    const positions = [];
    const mills = [[0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0], [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8], [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16], [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]];
    const connections = [[1, 7], [0, 2, 9], [1, 3], [2, 4, 11], [3, 5], [4, 6, 13], [5, 7], [0, 6, 15], [9, 15], [1, 8, 10, 17], [9, 11], [3, 10, 12, 19], [11, 13], [5, 12, 14, 21], [13, 15], [7, 8, 14, 23], [16, 23], [9, 16, 18], [17, 19], [11, 18, 20], [19, 21], [13, 20, 22], [21, 23], [15, 16, 22]];

    // 2. ZEICHNEN UND DARSTELLUNG
    function setupCanvasDimensions() { /* ... (unverändert) ... */ }
    function calculatePositions() { /* ... (unverändert) ... */ }
    function drawBoard() { /* ... (unverändert) ... */ }
    function drawPiece(x, y, player, isSelected) { /* ... (unverändert) ... */ }
    function animate(action, from, to, onComplete) { /* ... (unverändert) ... */ }
    
    function updateCapturedStonesDisplay() {
        capturedByPlayer1Div.innerHTML = '';
        capturedByPlayer2Div.innerHTML = '';
        const p1Captured = 9 - player2Stones;
        const p2Captured = 9 - player1Stones;
        for (let i = 0; i < p1Captured; i++) {
            const stoneDiv = document.createElement('div');
            stoneDiv.className = 'captured-stone black';
            capturedByPlayer1Div.appendChild(stoneDiv);
        }
        for (let i = 0; i < p2Captured; i++) {
            const stoneDiv = document.createElement('div');
            stoneDiv.className = 'captured-stone white';
            capturedByPlayer2Div.appendChild(stoneDiv);
        }
    }

    // 3. SPIEL-LOGIK
    function resetGame() {
        setupCanvasDimensions();
        calculatePositions();
        gameState = 'placing';
        currentPlayer = 1;
        board = Array(24).fill(0);
        player1Stones = 9; player2Stones = 9;
        placedStonesP1 = 0; placedStonesP2 = 0;
        selectedPieceIndex = -1;
        updateStatus();
        updateCapturedStonesDisplay();
        drawBoard();
    }
    
    function getClickedPosition(event) { /* ... (unverändert) ... */ }

    function handleClick(event) {
        if (currentPlayer === AI_PLAYER_NUM || gameState === 'gameover') return;
        event.preventDefault();
        const index = getClickedPosition(event);
        if (index === -1) return;

        if (gameState === 'placing' && board[index] === 0) {
            placeSound.play().catch(()=>{});
            animate('place', null, index, () => {
                board[index] = currentPlayer;
                placedStonesP1++;
                processMoveEnd(index);
            });
        } else if (gameState === 'moving') {
            if (selectedPieceIndex === -1 && board[index] === currentPlayer) {
                selectedPieceIndex = index;
                drawBoard();
            } else if (selectedPieceIndex !== -1 && board[index] === 0) {
                const from = selectedPieceIndex;
                if ((player1Stones === 3) || connections[from].includes(index)) {
                    moveSound.play().catch(()=>{});
                    selectedPieceIndex = -1;
                    animate('move', from, index, () => {
                        board[index] = currentPlayer;
                        processMoveEnd(index);
                    });
                }
            } else {
                selectedPieceIndex = -1;
                drawBoard();
            }
        } else if (gameState === 'removing') {
            if (board[index] === AI_PLAYER_NUM && canRemovePiece(index, AI_PLAYER_NUM)) {
                removeSound.play().catch(()=>{});
                player2Stones--;
                board[index] = 0;
                updateCapturedStonesDisplay();
                gameState = (placedStonesP1 >= 9 && placedStonesP2 >= 9) ? 'moving' : 'placing';
                const gameOverReason = checkGameOver();
                if (gameOverReason) { endGame(currentPlayer, gameOverReason); } 
                else { switchPlayer(); }
            }
        }
    }
    
    function canRemovePiece(index, playerToRemove) {
        if (isInMill(index, playerToRemove, board)) {
            for (let i = 0; i < board.length; i++) {
                if (board[i] === playerToRemove && !isInMill(i, playerToRemove, board)) return false;
            }
        }
        return true;
    }

    function processMoveEnd(index) {
        const gameOverReason = checkGameOver();
        if (gameOverReason) {
            endGame(currentPlayer, gameOverReason);
            return;
        }
        if (isInMill(index, currentPlayer, board)) {
            gameState = 'removing';
            updateStatus();
            drawBoard();
            if (currentPlayer === AI_PLAYER_NUM) setTimeout(triggerAIMove, 200);
        } else {
            gameState = (placedStonesP1 >= 9 && placedStonesP2 >= 9) ? 'moving' : 'placing';
            switchPlayer();
        }
    }
    
    function switchPlayer() {
        currentPlayer = 3 - currentPlayer;
        updateStatus();
        drawBoard();
        if (currentPlayer === AI_PLAYER_NUM && gameState !== 'gameover') {
            setTimeout(triggerAIMove, 200);
        }
    }

    function isInMill(index, player, b) {
        for (const mill of mills) {
            if (mill.includes(index) && b[mill[0]] === player && b[mill[1]] === player && b[mill[2]] === player) return true;
        }
        return false;
    }
    
    function checkGameOver() {
        const playerToCheck = 3 - currentPlayer;
        const stones = (playerToCheck === 1) ? player1Stones : player2Stones;
        const placed = (playerToCheck === 1) ? placedStonesP1 : placedStonesP2;

        if (placed >= 9 && stones < 3) return 'stones';
        
        if (placedStonesP1 >= 9 && placedStonesP2 >= 9) {
            if (stones === 3) return null;
            for (let i = 0; i < board.length; i++) {
                if (board[i] === playerToCheck) {
                    for (const to of connections[i]) if (board[to] === 0) return null;
                }
            }
            return 'blocked';
        }
        return null;
    }

    function updateStatus() { /* ... (unverändert) ... */ }

    function endGame(winner, reason) {
        gameState = 'gameover';
        winSound.play().catch(() => {});
        const winnerName = (winner === AI_PLAYER_NUM) ? "Die KI" : "Du";
        const loserName = (winner === AI_PLAYER_NUM) ? "Du" : "die KI";
        
        let reasonText = "";
        if (reason === 'stones') {
            reasonText = `${loserName} hat weniger als 3 Steine.`;
        } else if (reason === 'blocked') {
            reasonText = `${loserName} kann keine Züge mehr machen.`;
        }
        statusText.textContent = `${winnerName} hast gewonnen!`;
        phaseText.textContent = reasonText;
    }

    // 4. KÜNSTLICHE INTELLIGENZ
    function triggerAIMove() {
        if (gameState === 'gameover') return;
        statusText.textContent = "KI (Schwarz) denkt nach...";
        phaseText.textContent = '...';
        
        setTimeout(() => {
            const { move } = minimax(board, player1Stones, player2Stones, placedStonesP1, placedStonesP2, AI_DIFFICULTY, -Infinity, Infinity, true, gameState);
            if (!move) { endGame(1, 'surrender'); return; }
            
            if (gameState === 'placing') {
                animate('place', null, move.to, () => {
                    board[move.to] = currentPlayer;
                    placedStonesP2++;
                    processMoveEnd(move.to);
                });
            } else if (gameState === 'moving') {
                animate('move', move.from, move.to, () => {
                    board[move.to] = currentPlayer;
                    processMoveEnd(move.to);
                });
            } else if (gameState === 'removing') {
                removeSound.play().catch(()=>{});
                player1Stones--;
                board[move.remove] = 0;
                updateCapturedStonesDisplay();
                // **BUG FIX HIER**
                gameState = (placedStonesP1 >= 9 && placedStonesP2 >= 9) ? 'moving' : 'placing';
                const gameOverReason = checkGameOver();
                if (gameOverReason) { endGame(currentPlayer, gameOverReason); } 
                else { switchPlayer(); }
            }
        }, 50);
    }
    
    function evaluateBoard(b, p1s, p2s, p1p, p2p) {
        const gameOverReason = checkGameOver();
        if(gameOverReason) return (currentPlayer === 1 ? 10000 : -10000);

        let score = 0;
        // 1. Stein-Differenz
        score += (p2s - p1s) * 10;
        
        // 2. Mühlen und Drohungen
        let twoPieceThreatsAI = 0;
        let twoPieceThreatsHuman = 0;

        for (const mill of mills) {
            const p = [b[mill[0]], b[mill[1]], b[mill[2]]];
            const aiCount = p.filter(x => x===2).length;
            const huCount = p.filter(x => x===1).length;

            if(aiCount === 3) score += 50;
            else if(huCount === 3) score -= 50;
            else if(aiCount === 2 && huCount === 0) twoPieceThreatsAI++;
            else if(huCount === 2 && aiCount === 0) twoPieceThreatsHuman++;
        }
        score += (twoPieceThreatsAI - twoPieceThreatsHuman) * 12;

        // 3. Mobilität
        const aiMoves = getPossibleMoves(b, 2, p1s, p2s, p1p, p2p, 'moving');
        const humanMoves = getPossibleMoves(b, 1, p1s, p2s, p1p, p2p, 'moving');
        score += (aiMoves.length - humanMoves.length) * 2;
        
        return score;
    }

    function getPossibleMoves(b, player, p1s, p2s, p1p, p2p, phase) { /* ... (unverändert von letzter Version) ... */ }
    function simulateMove(b, p1s, p2s, p1p, p2p, player, move) { /* ... (unverändert von letzter Version) ... */ }
    function minimax(cB, p1s, p2s, p1p, p2p, depth, alpha, beta, isMax, phase) { /* ... (unverändert von letzter Version) ... */ }
    
    // Unveränderte Funktionen hier einfügen, um sicherzustellen, dass sie komplett sind
    setupCanvasDimensions = function() { size = canvas.clientWidth; canvas.width = size; canvas.height = size; margin = size * 0.1; boxSize = (size - 2 * margin) / 6; }
    calculatePositions = function() { positions.length = 0; for (let ring = 0; ring < 3; ring++) { const r = ring * boxSize; positions.push({ x: margin + r, y: margin + r }, { x: margin + 3 * boxSize, y: margin + r }, { x: margin + 6 * boxSize - r, y: margin + r }, { x: margin + 6 * boxSize - r, y: margin + 3 * boxSize }, { x: margin + 6 * boxSize - r, y: margin + 6 * boxSize - r }, { x: margin + 3 * boxSize, y: margin + 6 * boxSize - r }, { x: margin + r, y: margin + 6 * boxSize - r }, { x: margin + r, y: margin + 3 * boxSize }); } }
    getClickedPosition = function(event) { const e = event.touches ? event.touches[0] : event; const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; const x = (e.clientX - rect.left) * scaleX; const y = (e.clientY - rect.top) * scaleY; for (let i = 0; i < positions.length; i++) { if (Math.sqrt((positions[i].x - x) ** 2 + (positions[i].y - y) ** 2) < boxSize * 0.5) return i; } return -1; }
    animate = function(action, from, to, onComplete) { let progress = 0; const player = (action === 'move') ? board[from] : currentPlayer; const endPos = positions[to]; const startPos = (action === 'move') ? positions[from] : null; function step() { progress += 0.1; drawBoard(); if (action === 'move') { const currentX = startPos.x + (endPos.x - startPos.x) * progress; const currentY = startPos.y + (endPos.y - startPos.y) * progress; drawPiece(currentX, currentY, player, false); } else { const tempRadius = boxSize * 0.4 * progress; ctx.beginPath(); ctx.arc(endPos.x, endPos.y, tempRadius, 0, 2 * Math.PI); ctx.fillStyle = player === 1 ? '#ffffff' : '#000000'; ctx.fill(); ctx.stroke(); } if (progress < 1) requestAnimationFrame(step); else if (onComplete) onComplete(); } if (action === 'move') board[from] = 0; step(); }
    drawBoard = function() { if (!size || positions.length === 0) return; ctx.clearRect(0, 0, size, size); ctx.strokeStyle = '#6b4e2a'; ctx.lineWidth = 3; for (let ring = 0; ring < 3; ring++) { const p = ring * 8; ctx.beginPath(); ctx.moveTo(positions[p + 7].x, positions[p + 7].y); for (let i = 0; i < 8; i++) ctx.lineTo(positions[p + i].x, positions[p + i].y); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(positions[1].x, positions[1].y); ctx.lineTo(positions[17].x, positions[17].y); ctx.moveTo(positions[3].x, positions[3].y); ctx.lineTo(positions[19].x, positions[19].y); ctx.moveTo(positions[5].x, positions[5].y); ctx.lineTo(positions[21].x, positions[21].y); ctx.moveTo(positions[7].x, positions[7].y); ctx.lineTo(positions[23].x, positions[23].y); ctx.stroke(); positions.forEach((pos, i) => { ctx.beginPath(); ctx.arc(pos.x, pos.y, size * 0.015, 0, 2 * Math.PI); ctx.fillStyle = '#6b4e2a'; ctx.fill(); if (board[i] !== 0) drawPiece(pos.x, pos.y, board[i], i === selectedPieceIndex); }); }
    drawPiece = function(x, y, player, isSelected) { const radius = boxSize * 0.4; ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fillStyle = player === 1 ? '#ffffff' : '#000000'; ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke(); if (isSelected) { ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4; ctx.stroke(); } }
    updateStatus = function() { if (gameState === 'gameover') return; statusText.textContent = (currentPlayer === 1) ? `Du (Weiß) bist am Zug.` : `KI (Schwarz) ist am Zug.`; let phaseDE = ""; switch(gameState){ case 'placing': phaseDE = 'Steine setzen'; break; case 'moving': phaseDE = ((currentPlayer === 1 ? player1Stones : player2Stones) === 3) ? 'Springen' : 'Steine bewegen'; break; case 'removing': phaseDE = 'Mühle! Entferne einen Stein.'; break; } phaseText.textContent = `Phase: ${phaseDE}`; }
    minimax = function(cB, p1s, p2s, p1p, p2p, depth, alpha, beta, isMax, phase) { const gameOverReason = checkGameOver(); if (gameOverReason) return {move: null, score: (currentPlayer === 1 ? 10000 : -10000) }; if (depth === 0) return { move: null, score: evaluateBoard(cB, p1s, p2s, p1p, p2p) }; const player = isMax ? AI_PLAYER_NUM : 1; const possibleMoves = getPossibleMoves(cB, player, p1s, p2s, p1p, p2p, phase); if(possibleMoves.length === 0) return { move: null, score: isMax ? -10000 : 10000 }; let bestMove = possibleMoves[0]; if (isMax) { let maxEval = -Infinity; for (const move of possibleMoves) { const s = simulateMove(cB, p1s, p2s, p1p, p2p, player, move); const { score } = minimax(s.board, s.p1s, s.p2s, s.p1p, s.p2p, depth - 1, alpha, beta, false, s.phase); if (score > maxEval) { maxEval = score; bestMove = move; } alpha = Math.max(alpha, score); if (beta <= alpha) break; } return { move: bestMove, score: maxEval }; } else { let minEval = Infinity; for (const move of possibleMoves) { const s = simulateMove(cB, p1s, p2s, p1p, p2p, player, move); const { score } = minimax(s.board, s.p1s, s.p2s, s.p1p, s.p2p, depth - 1, alpha, beta, true, s.phase); if (score < minEval) { minEval = score; bestMove = move; } beta = Math.min(beta, score); if (beta <= alpha) break; } return { move: bestMove, score: minEval }; } }
    simulateMove = function(b, p1s, p2s, p1p, p2p, player, move) { let nB = [...b], nP1s = p1s, nP2s = p2s, nP1p = p1p, nP2p = p2p, nPhase; if (move.remove !== undefined) { nB[move.remove] = 0; if ((3 - player) === 1) nP1s--; else nP2s--; } else { if (move.from !== undefined) nB[move.from] = 0; else if (player === 1) nP1p++; else nP2p++; nB[move.to] = player; } const formedMill = move.to !== undefined && isInMill(move.to, player, nB); nPhase = formedMill ? 'removing' : ((nP1p < 9 || nP2p < 9) ? 'placing' : 'moving'); return { board: nB, p1s: nP1s, p2s: nP2s, p1p: nP1p, p2p: nP2p, phase: nPhase }; }
    getPossibleMoves = function(b, player, p1s, p2s, p1p, p2p, phase) { const moves = []; if (phase === 'removing') { const opponent = 3 - player; const nonMillPieces = [], allOpponentPieces = []; for (let i = 0; i < 24; i++) { if (b[i] === opponent) { allOpponentPieces.push({ remove: i }); if (!isInMill(i, opponent, b)) nonMillPieces.push({ remove: i }); } } return nonMillPieces.length > 0 ? nonMillPieces : allOpponentPieces; } else if ((player === 1 && p1p < 9) || (player === 2 && p2p < 9)) { for (let i = 0; i < 24; i++) if (b[i] === 0) moves.push({ to: i }); } else { const stones = (player === 1) ? p1s : p2s; for (let from = 0; from < 24; from++) { if (b[from] === player) { if (stones === 3) { for (let to = 0; to < 24; to++) if (b[to] === 0) moves.push({ from, to }) } else { for (const to of connections[from]) if (b[to] === 0) moves.push({ from, to }); } } } } return moves; }

    // 5. EVENT LISTENERS UND SPIELSTART
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', (e) => handleClick(e), { passive: false });
    resetButton.addEventListener('click', resetGame);
    
    resetGame();
});
