// === Color Constants ===
const COLOR_BEZIER_START = '#353535'; // dark gray
const COLOR_BEZIER_END = '#353535';   // dark gray

// Debounce variables
let resizeTimeout;
const RESIZE_DELAY = 300; // ms to wait after resize stops

// Initialize SVGs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all SVG elements
    const svgs = document.querySelectorAll('.bezier-svg');
    
    // Initialize each SVG with unique gradient IDs
    svgs.forEach((svg, index) => {
        // Ensure unique gradient IDs
        const gradient = svg.querySelector('linearGradient');
        gradient.id = `bezier-gradient-${index}`;
        
        // Update gradient references
        svg.querySelector('.bezier-area').setAttribute('fill', `url(#bezier-gradient-${index})`);
        svg.querySelector('.bezier-curve').setAttribute('stroke', `url(#bezier-gradient-${index})`);
        
        initSVG(svg, index);
    });
});

// Initialize SVG and set up resize listener
function initSVG(svg, index) {
    // Initial draw
    updateBezierSVG(svg);
    
    // Update on window resize
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateBezierSVG(svg);
        }, RESIZE_DELAY);
    });
}

// Update the SVG bezier curve based on container dimensions
function updateBezierSVG(svg) {
    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;
    
    // Calculate padding values
    const paddingRatio = 0;
    const minSide = Math.min(width, height);
    const xPadding = Math.min(20, minSide * paddingRatio);
    const yPadding = Math.min(20, minSide * paddingRatio);
    
    // Define start and end points (bottom-left to top-right)
    const p0 = { x: xPadding, y: height - yPadding };
    const p3 = { x: width - xPadding, y: yPadding };
    
    // Get bezier curve parameters from the card's text
    const card = svg.closest('.card');
    const vals = card.querySelector('.card-content p').textContent.trim().split(',').map(Number);
    const [x1, y1, x2, y2] = vals;
    
    // Calculate control points
    const usableW = width - 2 * xPadding;
    const usableH = height - 2 * yPadding;
    const cp1 = { x: p0.x + x1 * usableW, y: p0.y - y1 * usableH };
    const cp2 = { x: p0.x + x2 * usableW, y: p0.y - y2 * usableH };
    
    // Update the SVG viewBox to match dimensions
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Update the bezier curve path
    const curvePath = svg.querySelector('.bezier-curve');
    curvePath.setAttribute('d', `M ${p0.x},${p0.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p3.x},${p3.y}`);
    
    // Update stroke width based on size
    curvePath.setAttribute('stroke-width', Math.min(width, height) * 0.03);
    
    // Update the area under the curve
    const areaPath = svg.querySelector('.bezier-area');
    areaPath.setAttribute('d', `M ${p0.x},${p0.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p3.x},${p3.y} L ${p3.x},${height} L ${p0.x},${height} Z`);
    
    // Update the start and end circles
    const startCircle = svg.querySelector('.start-point');
    const endCircle = svg.querySelector('.end-point');
    const circleRadius = Math.max(2, Math.min(Math.min(width, height) * 0.02, 4));
    
    startCircle.setAttribute('cx', p0.x);
    startCircle.setAttribute('cy', p0.y);
    startCircle.setAttribute('r', circleRadius);
    
    endCircle.setAttribute('cx', p3.x);
    endCircle.setAttribute('cy', p3.y);
    endCircle.setAttribute('r', circleRadius);
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

// Force initial draw after a short delay to ensure SVG is properly sized
setTimeout(() => {
    const svgs = document.querySelectorAll('.bezier-svg');
    svgs.forEach((svg) => {
        updateBezierSVG(svg);
    });
}, 100);
