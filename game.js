// 游戏配置
const CONFIG = {
    BOARD_SIZE: 8,
    GHOST_TYPES: ['👻', '👹', '👺', '🤡', '🎃', '😈'],
    INITIAL_MOVES: 30,
    TARGET_SCORE: 1000,
    MATCH_MIN: 3,
    ANIMATION_DURATION: 300
};

// 游戏状态
class Game {
    constructor() {
        this.board = [];
        this.score = 0;
        this.moves = CONFIG.INITIAL_MOVES;
        this.target = CONFIG.TARGET_SCORE;
        this.selectedCell = null;
        this.isAnimating = false;
        this.gameOver = false;
        
        this.initElements();
        this.initGame();
        this.bindEvents();
    }

    initElements() {
        this.boardElement = document.getElementById('gameBoard');
        this.scoreElement = document.getElementById('score');
        this.movesElement = document.getElementById('moves');
        this.targetElement = document.getElementById('target');
        this.modal = document.getElementById('gameOverModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.finalScoreElement = document.getElementById('finalScore');
    }

    initGame() {
        this.score = 0;
        this.moves = CONFIG.INITIAL_MOVES;
        this.gameOver = false;
        this.selectedCell = null;
        
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        this.modal.classList.remove('show');
    }

    createBoard() {
        // 创建初始棋盘
        this.board = [];
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            this.board[row] = [];
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                this.board[row][col] = this.randomGhost();
            }
        }

        // 确保初始棋盘没有匹配
        while (this.hasMatches()) {
            for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
                for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                    if (this.isPartOfMatch(row, col)) {
                        this.board[row][col] = this.randomGhost();
                    }
                }
            }
        }
    }

    randomGhost() {
        return CONFIG.GHOST_TYPES[Math.floor(Math.random() * CONFIG.GHOST_TYPES.length)];
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = this.board[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                this.boardElement.appendChild(cell);
            }
        }
    }

    bindEvents() {
        this.boardElement.addEventListener('click', (e) => this.handleCellClick(e));
        document.getElementById('newGameBtn').addEventListener('click', () => this.initGame());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('restartBtn').addEventListener('click', () => this.initGame());
        
        // 音效按钮
        const audioBtn = document.getElementById('audioBtn');
        audioBtn.addEventListener('click', () => {
            const enabled = audioManager.toggle();
            audioBtn.textContent = enabled ? '🔊 音效' : '🔇 静音';
            audioBtn.classList.toggle('muted', !enabled);
            if (enabled) audioManager.playSelect();
        });
    }

    handleCellClick(e) {
        if (this.isAnimating || this.gameOver) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.selectedCell === null) {
            // 第一次选择
            this.selectedCell = { row, col, element: cell };
            cell.classList.add('selected');
            audioManager.playSelect();
        } else {
            // 第二次选择
            const { row: selectedRow, col: selectedCol, element: selectedElement } = this.selectedCell;
            
            // 检查是否点击同一个格子
            if (row === selectedRow && col === selectedCol) {
                selectedElement.classList.remove('selected');
                this.selectedCell = null;
                return;
            }

            // 检查是否相邻
            if (this.isAdjacent(selectedRow, selectedCol, row, col)) {
                this.swapCells(selectedRow, selectedCol, row, col);
            } else {
                // 不相邻，重新选择
                selectedElement.classList.remove('selected');
                this.selectedCell = { row, col, element: cell };
                cell.classList.add('selected');
                audioManager.playSelect();
            }
        }
    }

    isAdjacent(row1, col1, row2, col2) {
        const rowDiff = Math.abs(row1 - row2);
        const colDiff = Math.abs(col1 - col2);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    async swapCells(row1, col1, row2, col2) {
        this.isAnimating = true;

        // 交换数据
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;

        // 更新显示
        this.renderBoard();

        // 检查是否有匹配
        if (this.hasMatches()) {
            // 有效移动
            this.moves--;
            this.updateUI();
            
            // 清除选择状态
            if (this.selectedCell) {
                this.selectedCell.element.classList.remove('selected');
                this.selectedCell = null;
            }

            // 处理匹配和下落
            await this.processMatches();
            
            this.isAnimating = false;
            
            // 检查游戏是否结束
            this.checkGameOver();
        } else {
            // 无效移动，交换回来
            audioManager.playInvalid();
            setTimeout(() => {
                const temp = this.board[row1][col1];
                this.board[row1][col1] = this.board[row2][col2];
                this.board[row2][col2] = temp;
                this.renderBoard();
                
                // 添加无效动画
                const cells = this.boardElement.querySelectorAll('.cell');
                cells[row1 * CONFIG.BOARD_SIZE + col1].classList.add('invalid');
                cells[row2 * CONFIG.BOARD_SIZE + col2].classList.add('invalid');
                
                setTimeout(() => {
                    if (this.selectedCell) {
                        this.selectedCell.element.classList.remove('selected');
                        this.selectedCell = null;
                    }
                    this.isAnimating = false;
                }, 300);
            }, 300);
        }
    }

    hasMatches() {
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                if (this.isPartOfMatch(row, col)) {
                    return true;
                }
            }
        }
        return false;
    }

    isPartOfMatch(row, col) {
        const ghost = this.board[row][col];
        
        // 检查水平匹配
        let horizontalCount = 1;
        // 向左
        for (let c = col - 1; c >= 0 && this.board[row][c] === ghost; c--) {
            horizontalCount++;
        }
        // 向右
        for (let c = col + 1; c < CONFIG.BOARD_SIZE && this.board[row][c] === ghost; c++) {
            horizontalCount++;
        }
        
        if (horizontalCount >= CONFIG.MATCH_MIN) return true;

        // 检查垂直匹配
        let verticalCount = 1;
        // 向上
        for (let r = row - 1; r >= 0 && this.board[r][col] === ghost; r--) {
            verticalCount++;
        }
        // 向下
        for (let r = row + 1; r < CONFIG.BOARD_SIZE && this.board[r][col] === ghost; r++) {
            verticalCount++;
        }
        
        return verticalCount >= CONFIG.MATCH_MIN;
    }

    async processMatches() {
        let hasMatch = true;
        
        while (hasMatch) {
            const matches = this.findAllMatches();
            
            if (matches.length === 0) {
                hasMatch = false;
                break;
            }

            // 标记匹配的格子
            matches.forEach(({ row, col }) => {
                const index = row * CONFIG.BOARD_SIZE + col;
                const cell = this.boardElement.children[index];
                if (cell) {
                    cell.classList.add('matched');
                    this.createParticles(cell);
                }
            });
            
            // 播放消除音效
            audioManager.playMatch();

            // 计算得分
            this.score += matches.length * 10 * (matches.length >= 4 ? 2 : 1);
            this.updateUI();

            // 等待动画
            await this.delay(CONFIG.ANIMATION_DURATION);

            // 移除匹配的格子
            matches.forEach(({ row, col }) => {
                this.board[row][col] = null;
            });

            // 下落
            this.applyGravity();
            this.renderBoard();
            audioManager.playDrop();

            // 等待下落动画
            await this.delay(CONFIG.ANIMATION_DURATION);
        }
    }

    findAllMatches() {
        const matches = [];
        const checked = new Set();

        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                const key = `${row},${col}`;
                if (checked.has(key)) continue;

                if (this.isPartOfMatch(row, col)) {
                    const matchCells = this.getMatchGroup(row, col);
                    matchCells.forEach(cell => {
                        const cellKey = `${cell.row},${cell.col}`;
                        if (!checked.has(cellKey)) {
                            matches.push(cell);
                            checked.add(cellKey);
                        }
                    });
                }
            }
        }

        return matches;
    }

    getMatchGroup(row, col) {
        const ghost = this.board[row][col];
        const group = [];

        // 水平匹配
        const horizontal = [{ row, col }];
        for (let c = col - 1; c >= 0 && this.board[row][c] === ghost; c--) {
            horizontal.push({ row, col: c });
        }
        for (let c = col + 1; c < CONFIG.BOARD_SIZE && this.board[row][c] === ghost; c++) {
            horizontal.push({ row, col: c });
        }
        if (horizontal.length >= CONFIG.MATCH_MIN) {
            group.push(...horizontal);
        }

        // 垂直匹配
        const vertical = [{ row, col }];
        for (let r = row - 1; r >= 0 && this.board[r][col] === ghost; r--) {
            vertical.push({ row: r, col });
        }
        for (let r = row + 1; r < CONFIG.BOARD_SIZE && this.board[r][col] === ghost; r++) {
            vertical.push({ row: r, col });
        }
        if (vertical.length >= CONFIG.MATCH_MIN) {
            group.push(...vertical);
        }

        // 去重
        const unique = [];
        const seen = new Set();
        group.forEach(cell => {
            const key = `${cell.row},${cell.col}`;
            if (!seen.has(key)) {
                unique.push(cell);
                seen.add(key);
            }
        });

        return unique;
    }

    applyGravity() {
        // 从下往上处理每一列
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            let writeRow = CONFIG.BOARD_SIZE - 1;
            
            // 从下往上读取非空格子
            for (let row = CONFIG.BOARD_SIZE - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    this.board[writeRow][col] = this.board[row][col];
                    if (writeRow !== row) {
                        this.board[row][col] = null;
                    }
                    writeRow--;
                }
            }
            
            // 填充顶部空格
            while (writeRow >= 0) {
                this.board[writeRow][col] = this.randomGhost();
                writeRow--;
            }
        }
    }

    createParticles(cell) {
        const rect = cell.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = cell.textContent;
            particle.style.position = 'fixed';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.fontSize = '1em';
            particle.style.zIndex = '1000';
            
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 50 + Math.random() * 30;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => particle.remove(), 600);
        }
    }

    showHint() {
        if (this.isAnimating || this.gameOver) return;

        // 简单实现：随机高亮一个可能的移动
        for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
                // 尝试向右交换
                if (col < CONFIG.BOARD_SIZE - 1) {
                    if (this.wouldCreateMatch(row, col, row, col + 1)) {
                        this.highlightHint(row, col, row, col + 1);
                        return;
                    }
                }
                // 尝试向下交换
                if (row < CONFIG.BOARD_SIZE - 1) {
                    if (this.wouldCreateMatch(row, col, row + 1, col)) {
                        this.highlightHint(row, col, row + 1, col);
                        return;
                    }
                }
            }
        }
    }

    wouldCreateMatch(row1, col1, row2, col2) {
        // 临时交换
        const temp = this.board[row1][col1];
        this.board[row1][col1] = this.board[row2][col2];
        this.board[row2][col2] = temp;

        const hasMatch = this.isPartOfMatch(row1, col1) || this.isPartOfMatch(row2, col2);

        // 交换回来
        this.board[row2][col2] = this.board[row1][col1];
        this.board[row1][col1] = temp;

        return hasMatch;
    }

    highlightHint(row1, col1, row2, col2) {
        const cells = this.boardElement.querySelectorAll('.cell');
        const cell1 = cells[row1 * CONFIG.BOARD_SIZE + col1];
        const cell2 = cells[row2 * CONFIG.BOARD_SIZE + col2];

        cell1.style.backgroundColor = '#fff3cd';
        cell2.style.backgroundColor = '#fff3cd';

        setTimeout(() => {
            cell1.style.backgroundColor = '';
            cell2.style.backgroundColor = '';
        }, 1000);
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.movesElement.textContent = this.moves;
    }

    checkGameOver() {
        if (this.score >= this.target) {
            this.showGameOver(true);
        } else if (this.moves <= 0) {
            this.showGameOver(false);
        }
    }

    showGameOver(won) {
        this.gameOver = true;
        this.modalTitle.textContent = won ? '🎉 恭喜过关！' : '😢 游戏结束';
        this.modalMessage.innerHTML = won 
            ? `太棒了！你的得分：<span id="finalScore">${this.score}</span>` 
            : `很遗憾！你的得分：<span id="finalScore">${this.score}</span>`;
        this.modal.classList.add('show');
        
        // 播放胜利或失败音效
        if (won) {
            audioManager.playWin();
        } else {
            audioManager.playLose();
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

