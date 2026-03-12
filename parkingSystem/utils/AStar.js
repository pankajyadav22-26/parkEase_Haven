class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.g = Infinity;
        this.h = 0;
        this.f = Infinity;
        this.parent = null;
        this.walkable = true;
    }
}

class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(node) {
        this.heap.push(node);
        this.bubbleUp();
    }

    bubbleUp() {
        let idx = this.heap.length - 1;
        const node = this.heap[idx];

        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            let parent = this.heap[parentIdx];

            if (node.f >= parent.f) break;

            this.heap[parentIdx] = node;
            this.heap[idx] = parent;
            idx = parentIdx;
        }
    }

    pop() {
        const top = this.heap[0];
        const end = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }

        return top;
    }

    sinkDown(idx) {
        const length = this.heap.length;
        const node = this.heap[idx];

        while (true) {
            let left = 2 * idx + 1;
            let right = 2 * idx + 2;
            let swap = null;

            if (left < length) {
                if (this.heap[left].f < node.f) swap = left;
            }

            if (right < length) {
                if (
                    this.heap[right].f <
                    (swap === null ? node.f : this.heap[left].f)
                ) {
                    swap = right;
                }
            }

            if (swap === null) break;

            this.heap[idx] = this.heap[swap];
            this.heap[swap] = node;
            idx = swap;
        }
    }

    size() {
        return this.heap.length;
    }
}

const octile = (dx, dy) => {
    const F = Math.SQRT2 - 1;
    return dx < dy ? F * dx + dy : F * dy + dx;
};

const hasLineOfSight = (a, b, grid, cols, rows) => {
    let x0 = a.x,
        y0 = a.y;
    let x1 = b.x,
        y1 = b.y;

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);

    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;

    while (true) {
        if (
            x0 < 0 ||
            x0 >= cols ||
            y0 < 0 ||
            y0 >= rows ||
            !grid[x0][y0].walkable
        )
            return false;

        if (x0 === x1 && y0 === y1) break;

        let e2 = 2 * err;

        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }

        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }

    return true;
};

const smoothPath = (path, grid, cols, rows) => {
    if (path.length <= 2) return path;

    const result = [path[0]];
    let idx = 0;

    while (idx < path.length - 1) {
        let next = path.length - 1;

        for (let i = path.length - 1; i > idx; i--) {
            if (hasLineOfSight(path[idx], path[i], grid, cols, rows)) {
                next = i;
                break;
            }
        }

        result.push(path[next]);
        idx = next;
    }

    return result;
};

export const findAStarPath = (
    startPx,
    endPx,
    obstacles,
    mapWidth,
    mapHeight,
    gridSize = 12
) => {
    const cols = Math.ceil(mapWidth / gridSize);
    const rows = Math.ceil(mapHeight / gridSize);

    const grid = Array.from({ length: cols }, (_, x) =>
        Array.from({ length: rows }, (_, y) => new Node(x, y))
    );

    const padding = 6;

    obstacles.forEach((obs) => {
        const sc = Math.max(0, Math.floor((obs.x - padding) / gridSize));
        const ec = Math.min(
            cols - 1,
            Math.floor((obs.x + obs.w + padding) / gridSize)
        );

        const sr = Math.max(0, Math.floor((obs.y - padding) / gridSize));
        const er = Math.min(
            rows - 1,
            Math.floor((obs.y + obs.h + padding) / gridSize)
        );

        for (let i = sc; i <= ec; i++) {
            for (let j = sr; j <= er; j++) {
                grid[i][j].walkable = false;
            }
        }
    });

    const sCol = Math.floor(startPx.x / gridSize);
    const sRow = Math.floor(startPx.y / gridSize);
    const eCol = Math.floor(endPx.x / gridSize);
    const eRow = Math.floor(endPx.y / gridSize);

    const start = grid[sCol][sRow];
    const end = grid[eCol][eRow];

    start.g = 0;
    start.h = octile(Math.abs(sCol - eCol), Math.abs(sRow - eRow));
    start.f = start.h;

    const openHeap = new MinHeap();
    const closed = new Set();

    openHeap.push(start);

    const dirs = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ];

    while (openHeap.size()) {
        const current = openHeap.pop();

        if (current === end) {
            let path = [];
            let t = current;

            while (t) {
                path.push(t);
                t = t.parent;
            }

            path.reverse();
            path = smoothPath(path, grid, cols, rows);

            return path.map((n) => ({
                x: n.x * gridSize + gridSize / 2,
                y: n.y * gridSize + gridSize / 2,
            }));
        }

        closed.add(`${current.x},${current.y}`);

        for (let [dx, dy] of dirs) {
            const nx = current.x + dx;
            const ny = current.y + dy;

            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

            const neighbor = grid[nx][ny];

            if (!neighbor.walkable) continue;
            if (closed.has(`${nx},${ny}`)) continue;

            if (dx !== 0 && dy !== 0) {
                if (!grid[current.x + dx][current.y].walkable) continue;
                if (!grid[current.x][current.y + dy].walkable) continue;
            }

            const cost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;

            const g = current.g + cost;

            if (g < neighbor.g) {
                neighbor.g = g;
                neighbor.h = octile(Math.abs(nx - eCol), Math.abs(ny - eRow));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;

                openHeap.push(neighbor);
            }
        }
    }

    return [startPx, endPx];
};