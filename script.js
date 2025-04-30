// === Color Constants ===
const COLOR_BEZIER_START = '#353535'; // dark gray
const COLOR_BEZIER_END = '#353535';   // dark gray

// Store the current control points to prevent jitter during resize
let currentControlPoints = {};

// Debounce variables
let resizeTimeout;
const RESIZE_DELAY = 300; // ms to wait after resize stops

// Initialize canvases when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all canvas elements
    const canvases = document.querySelectorAll('.bezier-canvas');
    
    // Initialize each canvas with unique control points
    canvases.forEach((canvas, index) => {
        currentControlPoints[index] = {
            randomPoint1: null,
            randomPoint2: null
        };
        initCanvas(canvas, index);
    });
});

// Set canvas size to match its container and draw bezier curve
function initCanvas(canvas, index) {
    const ctx = canvas.getContext('2d');
    
    // Set initial size
    resizeCanvasToContainer(canvas, index);
    
    // Redraw on window resize
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvasToContainer(canvas, index);
        }, RESIZE_DELAY);
    });
}

// Resize a canvas to match its container size
function resizeCanvasToContainer(canvas, index) {
    // Set canvas size to match its displayed (CSS) size to avoid squeeze
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Draw with current control points or generate new ones
    drawBezierCurve(canvas, index, true);
}

// Draw the Bezier curve
function drawBezierCurve(canvas, index, generateNewRandomPoints = false) {
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate padding values based on canvas dimensions
    const paddingRatio = 0.15;
    const minSide = Math.min(canvas.width, canvas.height);
    const xPadding = Math.min(20, minSide * paddingRatio);
    const yPadding = Math.min(20, minSide * paddingRatio);
    
    // Define start (0,0)->bottom-left and end (1,1)->top-right in canvas coords
    const p0 = { x: xPadding, y: canvas.height - yPadding };
    const p3 = { x: canvas.width - xPadding, y: yPadding };
    
    // Parse control values from card text "x1, y1, x2, y2"
    const vals = canvas.closest('.card').querySelector('.card-content p').textContent.trim().split(',').map(Number);
    const [x1, y1, x2, y2] = vals;
    const usableW = canvas.width - 2 * xPadding;
    const usableH = canvas.height - 2 * yPadding;
    const cp1 = { x: p0.x + x1 * usableW, y: p0.y - y1 * usableH };
    const cp2 = { x: p0.x + x2 * usableW, y: p0.y - y2 * usableH };
    
    // Create gradient for the curve
    // Gradient goes from fixedPoint1 (top right, COLOR_BEZIER_START) to fixedPoint2 (bottom left, COLOR_BEZIER_END)
    const gradient = ctx.createLinearGradient(
        p0.x, p0.y,
        
        p3.x, p3.y
    );
    gradient.addColorStop(0, COLOR_BEZIER_START);  // Top right color (fixedPoint1)
    gradient.addColorStop(1, COLOR_BEZIER_END);    // Bottom left color (fixedPoint2)

    // --- Fill the area under the curve with a curve-following gradient ---
    ctx.save();
    const N = 100; // Number of curve segments (higher = smoother)
    for (let i = 0; i < N; i++) {
        const t1 = i / N;
        const t2 = (i + 1) / N;
        // Get points along the curve
        const p1 = getCubicBezierPoint(p0, cp1, cp2, p3, t1);
        const p2 = getCubicBezierPoint(p0, cp1, cp2, p3, t2);
        // Interpolate color for each segment
        const color1 = lerpColor(COLOR_BEZIER_START, COLOR_BEZIER_END, t1);
        const color2 = lerpColor(COLOR_BEZIER_START, COLOR_BEZIER_END, t2);
        // Draw a vertical strip for this segment
        const baseY = Math.max(p0.y, p3.y);
        // Create vertical gradient for the strip
        const grad = ctx.createLinearGradient(0, p1.y, 0, baseY);
        grad.addColorStop(0, hexToRgba(color1, 0.2)); // Reduced opacity (0.45 -> 0.2)
        grad.addColorStop(1, hexToRgba(color1, 0.0));
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, baseY);
        ctx.lineTo(p1.x, baseY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }
    ctx.restore();

    // Draw the curve
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(
        cp1.x, cp1.y,
        cp2.x, cp2.y,
        p3.x, p3.y
    );
    
    // Style the curve with gradient
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.min(canvas.width, canvas.height) * 0.03; // Reduced thickness
    ctx.stroke();
    
    // Draw circles at the fixed points
    const circleRadius = Math.max(2, Math.min(Math.min(canvas.width, canvas.height) * 0.02, 4));
    
    // Draw circle at first fixed point (bottom left)
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_BEZIER_START;
    ctx.fill();
    
    // Draw circle at second fixed point (top right)
    ctx.beginPath();
    ctx.arc(p3.x, p3.y, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_BEZIER_END;
    ctx.fill();
}

// Helper: Get a point on a cubic Bezier curve
function getCubicBezierPoint(p0, p1, p2, p3, t) {
    const x = Math.pow(1-t,3)*p0.x + 3*Math.pow(1-t,2)*t*p1.x + 3*(1-t)*t*t*p2.x + Math.pow(t,3)*p3.x;
    const y = Math.pow(1-t,3)*p0.y + 3*Math.pow(1-t,2)*t*p1.y + 3*(1-t)*t*t*p2.y + Math.pow(t,3)*p3.y;
    return {x, y};
}

// Helper: Linear interpolate between two hex colors
function lerpColor(a, b, t) {
    const ah = a.replace('#','');
    const bh = b.replace('#','');
    const ar = parseInt(ah.substring(0,2),16), ag = parseInt(ah.substring(2,4),16), ab = parseInt(ah.substring(4,6),16);
    const br = parseInt(bh.substring(0,2),16), bg = parseInt(bh.substring(2,4),16), bb = parseInt(bh.substring(4,6),16);
    const rr = Math.round(ar + (br-ar)*t);
    const rg = Math.round(ag + (bg-ag)*t);
    const rb = Math.round(ab + (bb-ab)*t);
    return `#${rr.toString(16).padStart(2,'0')}${rg.toString(16).padStart(2,'0')}${rb.toString(16).padStart(2,'0')}`;
}

// Helper: Convert hex to rgba string
function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// Force initial draw after a short delay to ensure canvas is properly sized
setTimeout(() => {
    const canvases = document.querySelectorAll('.bezier-canvas');
    canvases.forEach((canvas, index) => {
        resizeCanvasToContainer(canvas, index);
    });
}, 100);
