document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const boardEl = document.getElementById('chessboard');
    const statusEl = document.getElementById('status');
    const timerWEl = document.getElementById('timer-w');
    const timerBEl = document.getElementById('timer-b');
    const historyEl = document.getElementById('move-history');
    const promotionModal = document.getElementById('promotion-modal');
    const promotionChoices = document.getElementById('promotion-choices');
    const newGameBtn = document.getElementById('newGame'); // Added for event listener
    const flipBoardBtn = document.getElementById('flipBoard'); // Added for event listener

    // Game State
    let gameState;
    const initialTime = 300; // 5 minutes in seconds

    const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    // --- START OF NEW ADDITION/CHANGE ---
    // Object to map piece type and color to their image URLs
    const pieceImageUrls = {

        //blancas
        'pw': 'https://png.pngtree.com/png-clipart/20230928/original/pngtree-gold-chess-bishop-3d-render-png-image_13007406.png',
        'rw': 'https://png.pngtree.com/png-clipart/20230928/original/pngtree-gold-chess-rook-3d-render-png-image_13006203.png',
        'nw': 'https://png.pngtree.com/png-clipart/20250603/original/pngtree-golden-chess-knight-piece-isolated-on-transparent-background-png-image_21119744.png',
       //problema ubicado
        'bw': 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-gold-chess-pawn-3d-render-png-image_13001002.png',
        'qw': 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-isolated-golden-king-chess-piece-png-image_14626586.png',
        'kw': 'https://png.pngtree.com/png-clipart/20250118/original/pngtree-golden-chess-piece-featuring-a-crown-with-in-gold-png-image_20181462.png',
        
        
        

       //negras
        'pb': 'https://png.pngtree.com/png-clipart/20230928/original/pngtree-gold-chess-bishop-3d-render-png-image_13007406.png',
        'rb': 'https://png.pngtree.com/png-clipart/20230928/original/pngtree-gold-chess-rook-3d-render-png-image_13006203.png',
        'nb': 'https://png.pngtree.com/png-clipart/20250603/original/pngtree-golden-chess-knight-piece-isolated-on-transparent-background-png-image_21119744.png',
        'bb': 'https://png.pngtree.com/png-clipart/20230927/original/pngtree-gold-chess-pawn-3d-render-png-image_13001002.png',
        'qb': 'https://png.pngtree.com/png-clipart/20240319/original/pngtree-isolated-golden-king-chess-piece-png-image_14626586.png',
        'kb': 'https://png.pngtree.com/png-clipart/20250118/original/pngtree-golden-chess-piece-featuring-a-crown-with-in-gold-png-image_20181462.png'
    };


    // --- CORE GAME LOGIC ---

    function initGame() {
        if (gameState && gameState.timerInterval) clearInterval(gameState.timerInterval);

        gameState = {
            board: [],
            timers: { w: initialTime, b: initialTime },
            currentPlayer: 'w',
            castling: { w: { k: true, q: true }, b: { k: true, q: true } },
            enPassantTarget: null,
            halfmoveClock: 0,
            fullmoveNumber: 1,
            history: [],
            gameOver: false,
            selectedSquare: null,
            timerInterval: null
        };
        
        loadFEN(FEN_START);
        renderBoard();
        updateTimers();
        updateStatus();
        historyEl.innerHTML = '';
        promotionModal.style.display = 'none';
        
        gameState.timerInterval = setInterval(timerTick, 1000);
    }
    
    function loadFEN(fen) {
        const [placement, turn, castling, enPassant] = fen.split(' ');
        gameState.currentPlayer = turn;
        
        // Initialize an empty 8x8 board
        gameState.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        let row = 0;
        let col = 0;
        for (const char of placement) {
            if (char === '/') {
                row++;
                col = 0;
            } else if (/\d/.test(char)) {
                // If it's a number, skip that many squares
                col += parseInt(char);
            } else {
                // If it's a piece character, place the piece
                const color = (char === char.toUpperCase()) ? 'w' : 'b'; // Mayúscula = blanca, minúscula = negra
                const type = char.toLowerCase(); // Convierte a minúscula para el tipo (p, r, n, b, q, k)
                gameState.board[row][col] = { type: type, color: color };
                col++;
            }
        }
        // NOTE: Full FEN parsing for castling, en passant etc. is complex and omitted for brevity.
        // This setup is sufficient for a standard starting game.
    }
    
    function handleTileClick(row, col) {
        if (gameState.gameOver) return;

        const clickedPiece = gameState.board[row][col];

        if (gameState.selectedSquare) {
            const from = gameState.selectedSquare;
            const legalMoves = getLegalMoves(from.row, from.col);
            const move = legalMoves.find(m => m.to.row === row && m.to.col === col);
            
            if (move) {
                makeMove(move);
            } else {
                // Deselect if clicking on a non-legal square or same piece
                gameState.selectedSquare = null;
                if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
                    gameState.selectedSquare = { row, col };
                }
                renderBoard();
            }
        } else if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
            gameState.selectedSquare = { row, col };
            renderBoard();
        }
    }

    function makeMove(move) {
        const { from, to, type } = move;
        const piece = gameState.board[from.row][from.col];

        // Add to history before making the move for notation
        // Pass a deep copy of the board for notation generation
        gameState.history.push(getNotation(move, JSON.parse(JSON.stringify(gameState.board))));


        // En Passant capture
        if (type === 'enpassant') {
            gameState.board[from.row][to.col] = null; // Remove captured pawn
        }

        // Move piece
        gameState.board[to.row][to.col] = piece;
        gameState.board[from.row][from.col] = null;
        
        // Castling
        if (type === 'castling') {
            const rookFromCol = to.col > from.col ? 7 : 0; // King side: rook from 7, Queen side: rook from 0
            const rookToCol = to.col > from.col ? 5 : 3;   // King side: rook to 5, Queen side: rook to 3
            gameState.board[to.row][rookToCol] = gameState.board[to.row][rookFromCol];
            gameState.board[to.row][rookFromCol] = null;
        }

        // Update Castling Rights
        if (piece.type === 'k') {
            gameState.castling[piece.color].k = false;
            gameState.castling[piece.color].q = false;
        }
        if (piece.type === 'r') {
            const rookRow = (piece.color === 'w' ? 7 : 0);
            if (from.col === 0 && from.row === rookRow) gameState.castling[piece.color].q = false;
            if (from.col === 7 && from.row === rookRow) gameState.castling[piece.color].k = false;
        }
        
        // Set En Passant Target
        gameState.enPassantTarget = type === 'pawn_double' ? { row: (from.row + to.row)/2, col: from.col } : null;
        
        // Pawn Promotion
        if (type === 'promotion') {
            promotePawn(to.row, to.col);
            return; // endTurn will be called by promotion handler
        }

        endTurn();
    }

    function endTurn() {
        gameState.selectedSquare = null;
        if (gameState.currentPlayer === 'b') gameState.fullmoveNumber++;
        gameState.currentPlayer = gameState.currentPlayer === 'w' ? 'b' : 'w';
        
        renderBoard();
        checkGameStatus();
        updateStatus();
    }

    function promotePawn(row, col) {
        clearInterval(gameState.timerInterval); // Pause timers during promotion choice
        promotionModal.style.display = 'block';
        promotionChoices.innerHTML = '';
        const pawnColor = gameState.board[row][col].color; // Get the pawn's color for promotion pieces

        // --- START OF CHANGE IN promotePawn ---
        ['q', 'r', 'b', 'n'].forEach(type => {
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${type} ${pawnColor}`; // Use existing pawn color
            
            const imgEl = document.createElement('img'); // Create img element
            imgEl.src = pieceImageUrls[`${type}${pawnColor}`]; // Set src from map
            imgEl.alt = `${pawnColor}${type}`;
            pieceEl.appendChild(imgEl); // Append img to piece div

            pieceEl.dataset.type = type;
            pieceEl.onclick = () => {
                gameState.board[row][col].type = type;
                promotionModal.style.display = 'none';
                gameState.timerInterval = setInterval(timerTick, 1000); // Resume timer
                endTurn();
            };
            promotionChoices.appendChild(pieceEl);
        });
        // --- END OF CHANGE IN promotePawn ---
    }

    function checkGameStatus() {
        const legalMoves = getAllLegalMoves(gameState.currentPlayer);
        if (legalMoves.length === 0) {
            gameState.gameOver = true;
            clearInterval(gameState.timerInterval);
            if (isKingInCheck(gameState.currentPlayer)) {
                gameState.status = `JAQUE MATE. Ganan las ${gameState.currentPlayer === 'w' ? 'Negras' : 'Blancas'}!`;
            } else {
                gameState.status = "TABLAS. Empate por ahogado.";
            }
        }
    }
    
    // --- MOVEMENT AND VALIDATION ---

    function getLegalMoves(row, col) {
        const piece = gameState.board[row][col];
        if (!piece || piece.color !== gameState.currentPlayer) return [];

        const pseudoLegalMoves = getPseudoLegalMoves(row, col);
        
        return pseudoLegalMoves.filter(move => {
            // Simulate move on a temporary board
            const tempBoard = JSON.parse(JSON.stringify(gameState.board));
            const tempPiece = tempBoard[move.from.row][move.from.col]; // Keep reference to moving piece for temp board

            // Special handling for en passant simulation
            if (move.type === 'enpassant') {
                const pawnToCaptureRow = move.from.row;
                const pawnToCaptureCol = move.to.col;
                tempBoard[pawnToCaptureRow][pawnToCaptureCol] = null;
            }

            // Special handling for castling simulation
            if (move.type === 'castling') {
                const rookFromCol = move.to.col > move.from.col ? 7 : 0;
                const rookToCol = move.to.col > move.from.col ? 5 : 3;
                tempBoard[move.to.row][rookToCol] = tempBoard[move.to.row][rookFromCol];
                tempBoard[move.to.row][rookFromCol] = null;
            }

            tempBoard[move.to.row][move.to.col] = tempPiece; // Move the piece
            tempBoard[move.from.row][move.from.col] = null; // Clear original square

            // Check if king is in check after the simulated move
            return !isKingInCheck(gameState.currentPlayer, tempBoard);
        });
    }
    
    function getAllLegalMoves(color) {
        let allMoves = [];
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const piece = gameState.board[r][c];
                if (piece && piece.color === color) {
                    allMoves.push(...getLegalMoves(r, c));
                }
            }
        }
        return allMoves;
    }

    function getPseudoLegalMoves(row, col) {
        const piece = gameState.board[row][col];
        const moves = [];
        const from = {row, col};
        const color = piece.color;
        const dir = color === 'w' ? -1 : 1; // Direction for pawns: -1 for white (up), 1 for black (down)

        const addMove = (to, type='normal', promotionType = null) => moves.push({ from, to, type, promotionType });

        switch (piece.type) {
            case 'p': // Pawn
                // Forward 1
                if (isValid(row + dir, col) && !gameState.board[row + dir][col]) {
                    if (row + dir === 0 || row + dir === 7) { // Promotion row
                        ['q', 'r', 'b', 'n'].forEach(promoType => {
                            addMove({row: row + dir, col}, 'promotion', promoType);
                        });
                    } else {
                        addMove({row: row + dir, col});
                    }
                    // Forward 2 (only from starting row)
                    if (((color === 'w' && row === 6) || (color === 'b' && row === 1)) && !gameState.board[row + 2 * dir][col]) {
                        addMove({row: row + 2 * dir, col}, 'pawn_double');
                    }
                }
                // Captures
                [-1, 1].forEach(dCol => {
                    const targetRow = row + dir;
                    const targetCol = col + dCol;
                    if (isValid(targetRow, targetCol)) {
                        const targetPiece = gameState.board[targetRow][targetCol];
                        if (targetPiece && targetPiece.color !== color) {
                            if (targetRow === 0 || targetRow === 7) { // Promotion row with capture
                                ['q', 'r', 'b', 'n'].forEach(promoType => {
                                    addMove({row: targetRow, col: targetCol}, 'promotion', promoType);
                                });
                            } else {
                                addMove({row: targetRow, col: targetCol});
                            }
                        } else if (gameState.enPassantTarget && targetRow === gameState.enPassantTarget.row && targetCol === gameState.enPassantTarget.col) {
                            addMove({row: targetRow, col: targetCol}, 'enpassant');
                        }
                    }
                });
                break;
            case 'n': // Knight
                const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                knightMoves.forEach(([dr, dc]) => {
                    const to = {row: row + dr, col: col + dc};
                    if (isValid(to.row, to.col) && (!gameState.board[to.row][to.col] || gameState.board[to.row][to.col].color !== color)) {
                        addMove(to);
                    }
                });
                break;
            case 'b': // Bishop
                const bishopDirections = [[-1,-1],[-1,1],[1,-1],[1,1]];
                bishopDirections.forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const to = {row: row + i * dr, col: col + i * dc};
                        if (!isValid(to.row, to.col)) break;
                        const targetPiece = gameState.board[to.row][to.col];
                        if (targetPiece) {
                            if (targetPiece.color !== color) addMove(to);
                            break; // Blocked by piece
                        }
                        addMove(to);
                    }
                });
                break;
            case 'r': // Rook
                const rookDirections = [[-1,0],[1,0],[0,-1],[0,1]];
                rookDirections.forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const to = {row: row + i * dr, col: col + i * dc};
                        if (!isValid(to.row, to.col)) break;
                        const targetPiece = gameState.board[to.row][to.col];
                        if (targetPiece) {
                            if (targetPiece.color !== color) addMove(to);
                            break; // Blocked by piece
                        }
                        addMove(to);
                    }
                });
                break;
            case 'q': // Queen
                const queenDirections = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
                queenDirections.forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const to = {row: row + i * dr, col: col + i * dc};
                        if (!isValid(to.row, to.col)) break;
                        const targetPiece = gameState.board[to.row][to.col];
                        if (targetPiece) {
                            if (targetPiece.color !== color) addMove(to);
                            break; // Blocked by piece
                        }
                        addMove(to);
                    }
                });
                break;
            case 'k': // King
                const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                kingMoves.forEach(([dr, dc]) => {
                    const to = {row: row + dr, col: col + dc};
                    if (isValid(to.row, to.col) && (!gameState.board[to.row][to.col] || gameState.board[to.row][to.col].color !== color)) {
                        addMove(to);
                    }
                });
                // Castling
                if (color === 'w' && row === 7) { // White King's initial row
                    // King-side castling
                    if (gameState.castling.w.k && !gameState.board[7][5] && !gameState.board[7][6] &&
                        !isSquareAttacked(7, 4, 'w') && !isSquareAttacked(7, 5, 'w') && !isSquareAttacked(7, 6, 'w')) {
                        const rook = gameState.board[7][7];
                        if (rook && rook.type === 'r' && rook.color === 'w') {
                            addMove({row: 7, col: 6}, 'castling');
                        }
                    }
                    // Queen-side castling
                    if (gameState.castling.w.q && !gameState.board[7][3] && !gameState.board[7][2] && !gameState.board[7][1] &&
                        !isSquareAttacked(7, 4, 'w') && !isSquareAttacked(7, 3, 'w') && !isSquareAttacked(7, 2, 'w')) {
                        const rook = gameState.board[7][0];
                        if (rook && rook.type === 'r' && rook.color === 'w') {
                            addMove({row: 7, col: 2}, 'castling');
                        }
                    }
                } else if (color === 'b' && row === 0) { // Black King's initial row
                    // King-side castling
                    if (gameState.castling.b.k && !gameState.board[0][5] && !gameState.board[0][6] &&
                        !isSquareAttacked(0, 4, 'b') && !isSquareAttacked(0, 5, 'b') && !isSquareAttacked(0, 6, 'b')) {
                        const rook = gameState.board[0][7];
                        if (rook && rook.type === 'r' && rook.color === 'b') {
                            addMove({row: 0, col: 6}, 'castling');
                        }
                    }
                    // Queen-side castling
                    if (gameState.castling.b.q && !gameState.board[0][3] && !gameState.board[0][2] && !gameState.board[0][1] &&
                        !isSquareAttacked(0, 4, 'b') && !isSquareAttacked(0, 3, 'b') && !isSquareAttacked(0, 2, 'b')) {
                        const rook = gameState.board[0][0];
                        if (rook && rook.type === 'r' && rook.color === 'b') {
                            addMove({row: 0, col: 2}, 'castling');
                        }
                    }
                }
                break;
        }
        return moves;
    }

    function isKingInCheck(kingColor, board = gameState.board) {
        const kingPos = findKing(kingColor, board);
        if (!kingPos) return false; 
        return isSquareAttacked(kingPos.row, kingPos.col, kingColor, board);
    }
    
    function isSquareAttacked(row, col, byColor, board = gameState.board) {
        const attackerColor = byColor === 'w' ? 'b' : 'w';
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === attackerColor) {
                    const moves = getPseudoLegalMovesForAttackCheck(r, c, board); 
                    if (moves.some(m => m.to.row === row && m.to.col === col)) return true;
                }
            }
        }
        return false;
    }

    function getPseudoLegalMovesForAttackCheck(row, col, board) {
        const piece = board[row][col];
        if (!piece) return [];
        const moves = [];
        const from = {row, col};
        const color = piece.color;
        const dir = color === 'w' ? -1 : 1; 

        const addMove = (to) => moves.push({ from, to });

        switch (piece.type) {
            case 'p':
                // Pawn attacks (diagonal)
                [-1, 1].forEach(dCol => {
                    const to = {row: row + dir, col: col + dCol};
                    if (isValid(to.row, to.col)) {
                        addMove(to); 
                    }
                });
                break;
            case 'n':
                const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                knightMoves.forEach(([dr, dc]) => {
                    const to = {row: row+dr, col: col+dc};
                    if (isValid(to.row, to.col)) {
                        addMove(to);
                    }
                });
                break;
            case 'k':
                const kingMoves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
                kingMoves.forEach(([dr, dc]) => {
                    const to = {row: row+dr, col: col+dc};
                    if (isValid(to.row, to.col)) {
                        addMove(to);
                    }
                });
                break;
            case 'r':
            case 'b':
            case 'q':
                const directions = piece.type === 'r' ? [[-1,0],[1,0],[0,-1],[0,1]] :
                                             piece.type === 'b' ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
                                             [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
                directions.forEach(([dr, dc]) => {
                    for (let i=1; i<8; i++) {
                        const to = {row: row+i*dr, col: col+i*dc};
                        if (!isValid(to.row, to.col)) break;
                        const targetPiece = board[to.row][to.col];
                        if (targetPiece) {
                            addMove(to); 
                            break;
                        }
                        addMove(to);
                    }
                });
                break;
        }
        return moves;
    }


    function findKing(color, board = gameState.board) {
        for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (board[r][c]?.type === 'k' && board[r][c]?.color === color) return {row: r, col: c};
        return null;
    }

    function isValid(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
    
    function getNotation(move, currentBoardState) { 
        const pieceMoving = currentBoardState[move.from.row][move.from.col];
        const capturedPiece = currentBoardState[move.to.row][move.to.col];

        const tempBoardForNotation = JSON.parse(JSON.stringify(currentBoardState));
        
        // Apply the move to this temporary board for accurate check/checkmate detection
        tempBoardForNotation[move.to.row][move.to.col] = tempBoardForNotation[move.from.row][move.from.col];
        tempBoardForNotation[move.from.row][move.from.col] = null;

        if (move.type === 'enpassant') {
            const pawnToCaptureRow = move.from.row;
            const pawnToCaptureCol = move.to.col;
            tempBoardForNotation[pawnToCaptureRow][pawnToCaptureCol] = null;
        }
        if (move.type === 'castling') {
            const rookFromCol = move.to.col > move.from.col ? 7 : 0;
            const rookToCol = move.to.col > move.from.col ? 5 : 3;
            tempBoardForNotation[move.to.row][rookToCol] = tempBoardForNotation[move.to.row][rookFromCol];
            tempBoardForNotation[move.to.row][rookFromCol] = null;
        }

        let notation = '';

        if (move.type === 'castling') {
            notation = move.to.col > move.from.col ? 'O-O' : 'O-O-O';
        } else {
            notation += pieceMoving.type === 'p' ? '' : pieceMoving.type.toUpperCase();

            // Disambiguation
            let needsRowDisambiguation = false;
            let needsColDisambiguation = false;

            // Iterate over all squares to find other pieces of the same type that could move to 'to'
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    // Skip the piece that is actually moving
                    if (r === move.from.row && c === move.from.col) continue;

                    const otherPiece = currentBoardState[r][c];
                    if (otherPiece && otherPiece.type === pieceMoving.type && otherPiece.color === pieceMoving.color) {
                        // Create a temporary board state *without* the current moving piece
                        const tempBoardForOtherPiece = JSON.parse(JSON.stringify(currentBoardState));
                        tempBoardForOtherPiece[move.from.row][move.from.col] = null;

                        // Check if the other piece could legally move to the target square
                        const pseudoMovesFromOtherPiece = getPseudoLegalMovesForAttackCheck(r, c, tempBoardForOtherPiece); // Use simplified for checks
                        const otherPieceCanMoveToTarget = pseudoMovesFromOtherPiece.some(m => m.to.row === move.to.row && m.to.col === move.to.col);

                        if (otherPieceCanMoveToTarget) {
                            if (c === move.from.col) { // If same column, need row for disambiguation
                                needsRowDisambiguation = true;
                            } else if (r === move.from.row) { // If same row, need column for disambiguation
                                needsColDisambiguation = true;
                            } else { // Different row and column, but still ambiguous. Prioritize column.
                                needsColDisambiguation = true;
                            }
                        }
                    }
                }
            }

            if (pieceMoving.type === 'p' && (capturedPiece || move.type === 'enpassant')) {
                // Pawn captures always include the file of origin
                notation += String.fromCharCode(97 + move.from.col);
            } else {
                if (needsColDisambiguation) {
                    notation += String.fromCharCode(97 + move.from.col);
                }
                if (needsRowDisambiguation && !needsColDisambiguation) {
                    notation += (8 - move.from.row);
                }
            }
            
            if (capturedPiece || move.type === 'enpassant') {
                notation += 'x';
            }

            notation += `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;

            if (move.type === 'promotion') {
                notation += `=${move.promotionType.toUpperCase()}`;
            }
        }
        
        const opponentColor = pieceMoving.color === 'w' ? 'b' : 'w';
        if (isKingInCheck(opponentColor, tempBoardForNotation)) {
            const opponentLegalMoves = getAllLegalMovesForBoard(opponentColor, tempBoardForNotation);
            if (opponentLegalMoves.length === 0) {
                notation += '#'; // Checkmate
            } else {
                notation += '+'; // Check
            }
        }
        return notation;
    }

    function getAllLegalMovesForBoard(color, boardState) {
        let allMoves = [];
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                const piece = boardState[r][c];
                if (piece && piece.color === color) {
                    const pseudoMoves = getPseudoLegalMovesForAttackCheck(r, c, boardState); 
                    allMoves.push(...pseudoMoves.filter(move => {
                        const tempBoard = JSON.parse(JSON.stringify(boardState));
                        const tempPiece = tempBoard[move.from.row][move.from.col];

                        if (move.type === 'enpassant') {
                            const pawnToCaptureRow = move.from.row;
                            const pawnToCaptureCol = move.to.col;
                            tempBoard[pawnToCaptureRow][pawnToCaptureCol] = null;
                        }
                        if (move.type === 'castling') {
                            const rookFromCol = move.to.col > move.from.col ? 7 : 0;
                            const rookToCol = move.to.col > move.from.col ? 5 : 3;
                            tempBoard[move.to.row][rookToCol] = tempBoard[move.to.row][rookFromCol];
                            tempBoard[move.to.row][rookFromCol] = null;
                        }
                        tempBoard[move.to.row][move.to.col] = tempPiece;
                        tempBoard[move.from.row][move.from.col] = null;
                        return !isKingInCheck(color, tempBoard);
                    }));
                }
            }
        }
        return allMoves;
    }


    // --- UI & RENDERING ---

    function renderBoard() {
        boardEl.innerHTML = '';
        const legalMoves = gameState.selectedSquare ? getLegalMoves(gameState.selectedSquare.row, gameState.selectedSquare.col) : [];
        const kingPos = findKing(gameState.currentPlayer);
        const inCheck = kingPos && isKingInCheck(gameState.currentPlayer);

        const rowsToRender = boardFlipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
        const colsToRender = boardFlipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

        rowsToRender.forEach(r => {
            colsToRender.forEach(c => {
                const tile = document.createElement('div');
                tile.className = `tile ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                tile.onclick = () => handleTileClick(r, c);

                const overlay = document.createElement('div');
                overlay.className = 'highlight-overlay';
                
                if (gameState.selectedSquare && gameState.selectedSquare.row === r && gameState.selectedSquare.col === c) {
                    overlay.classList.add('selected');
                }
                if (inCheck && kingPos.row === r && kingPos.col === c) {
                    overlay.classList.add('in-check');
                }
                tile.appendChild(overlay);

                const piece = gameState.board[r][c];
                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `piece ${piece.type} ${piece.color}`;
                    
                    // --- START OF CHANGE IN renderBoard ---
                    // Create an <img> element for the piece image
                    const imgEl = document.createElement('img');
                    imgEl.src = pieceImageUrls[`${piece.type}${piece.color}`]; // Get URL from the map
                    imgEl.alt = `${piece.color} ${piece.type}`; // Add alt text for accessibility
                    pieceEl.appendChild(imgEl); // Append the img to the piece div
                    // --- END OF CHANGE IN renderBoard ---

                    if (boardFlipped) {
                        pieceEl.style.transform = 'rotate(180deg)';
                    }
                    tile.appendChild(pieceEl);
                }

                const move = legalMoves.find(m => m.to.row === r && m.to.col === c);
                if (move) {
                    const hint = document.createElement('div');
                    const isCapture = (gameState.board[r][c] && gameState.board[r][c].color !== gameState.currentPlayer) || move.type === 'enpassant';
                    hint.className = isCapture ? 'capture-hint' : 'move-hint';
                    tile.appendChild(hint);
                }
                boardEl.appendChild(tile);
            });
        });
        renderHistory();
    }

    function renderHistory() {
        historyEl.innerHTML = '';
        for (let i = 0; i < gameState.history.length; i += 2) {
            const li = document.createElement('li');
            const moveNumber = document.createElement('span');
            moveNumber.className = 'move-number';
            moveNumber.textContent = `${i/2 + 1}.`;
            
            const whiteMove = document.createElement('span');
            whiteMove.className = 'move-notation';
            whiteMove.textContent = gameState.history[i];
            
            const blackMove = document.createElement('span');
            blackMove.className = 'move-notation';
            blackMove.textContent = gameState.history[i+1] || '';
            
            li.append(moveNumber, whiteMove, blackMove);
            historyEl.appendChild(li);
        }
        historyEl.scrollTop = historyEl.scrollHeight;
    }

    function updateStatus() {
        if (gameState.gameOver) {
            statusEl.textContent = gameState.status;
            return;
        }
        const kingPos = findKing(gameState.currentPlayer);
        const inCheck = kingPos && isKingInCheck(gameState.currentPlayer);
        
        let statusText = `Turno de las ${gameState.currentPlayer === 'w' ? 'Blancas' : 'Negras'}.`;
        if (inCheck) statusText += ' ¡JAQUE!';
        statusEl.textContent = statusText;
    }
    
    // --- TIMERS & CONTROLS ---

    function timerTick() {
        if (gameState.gameOver) {
            clearInterval(gameState.timerInterval);
            return;
        }
        gameState.timers[gameState.currentPlayer]--;
        if (gameState.timers[gameState.currentPlayer] <= 0) {
            gameState.gameOver = true;
            gameState.status = `Se acabó el tiempo. Ganan las ${gameState.currentPlayer === 'w' ? 'Negras' : 'Blancas'}!`;
            updateStatus();
            updateTimers();
            clearInterval(gameState.timerInterval);
        }
        updateTimers();
    }
    
    function updateTimers() {
        const format = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
        timerWEl.textContent = format(gameState.timers.w);
        timerBEl.textContent = format(gameState.timers.b);
        timerWEl.classList.toggle('active', gameState.currentPlayer === 'w' && !gameState.gameOver);
        timerBEl.classList.toggle('active', gameState.currentPlayer === 'b' && !gameState.gameOver);
    }
    
    let boardFlipped = false;
    function flipBoard() {
        boardFlipped = !boardFlipped;
        boardEl.style.transform = boardFlipped ? 'rotate(180deg)' : '';
        // Flip the pieces themselves if the board is flipped to keep them upright
        document.querySelectorAll('.piece').forEach(pieceEl => {
            pieceEl.style.transform = boardFlipped ? 'rotate(180deg)' : '';
        });
        renderBoard(); // Re-render to update tile order if needed for numbers/letters (not currently implemented)
    }

    // Event Listeners for buttons
    newGameBtn.addEventListener('click', initGame);
    flipBoardBtn.addEventListener('click', flipBoard);

    // Initial game setup
    initGame();
});