// === Color Constants ===
const COLOR_BEZIER_START = '#6b6b6b'; // dark gray
const COLOR_BEZIER_END = '#6b6b6b';   // dark gray

// Debounce variables
let resizeTimeout;
const RESIZE_DELAY = 300; // ms to wait after resize stops

// Inner padding (as a fraction of the clipping rect) to ensure stroke/circles are not clipped
const INNER_PADDING_RATIO = 0.05; // 5%

// Initialize SVGs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Find all containers where we want to insert SVGs
    const containers = document.querySelectorAll('.svg-container');
    
    // Create and insert SVGs for each container
    containers.forEach((container, index) => {
        // Create SVG element dynamically
        const svg = createSVGElement(container, index);
        
        // Initialize the newly created SVG
        initSVG(svg, index);
    });
});

// Create a complete SVG element with all necessary components
function createSVGElement(container, index) {
    // Create the main SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('bezier-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    
    // Create defs section for gradients and clipping paths
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Create curve gradient
    const curveGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    curveGradient.id = `bezier-curve-gradient-${index}`;
    curveGradient.setAttribute('x1', '0%');
    curveGradient.setAttribute('y1', '100%');
    curveGradient.setAttribute('x2', '100%');
    curveGradient.setAttribute('y2', '0%');
    
    // Add stops to the curve gradient
    const curveStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    curveStop1.setAttribute('offset', '0%');
    curveStop1.setAttribute('stop-color', COLOR_BEZIER_START);
    
    const curveStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    curveStop2.setAttribute('offset', '100%');
    curveStop2.setAttribute('stop-color', COLOR_BEZIER_END);
    
    // Build the gradient
    curveGradient.appendChild(curveStop1);
    curveGradient.appendChild(curveStop2);
    defs.appendChild(curveGradient);
    
    // Create a clipping path to constrain the curve within 0-1 range
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.id = `bezier-clip-${index}`;
    const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    // The actual dimensions will be set in updateBezierSVG
    clipRect.setAttribute('x', '0');
    clipRect.setAttribute('y', '0');
    clipRect.setAttribute('width', '100%');
    clipRect.setAttribute('height', '100%');
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    
    // Add defs to SVG
    svg.appendChild(defs);
    
    // Create a group for all curve elements that will be clipped
    const curveGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    curveGroup.classList.add('curve-group');
    curveGroup.setAttribute('clip-path', `url(#bezier-clip-${index})`);
    svg.appendChild(curveGroup);
    
    // Create area container for gradient strips
    const areaContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    areaContainer.classList.add('bezier-area-container');
    curveGroup.appendChild(areaContainer);
    
    // Create the original area path (will be hidden but useful as reference)
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.classList.add('bezier-area');
    areaPath.setAttribute('fill', `url(#bezier-curve-gradient-${index})`);
    areaPath.setAttribute('fill-opacity', '0.2');
    areaPath.style.display = 'none';
    curveGroup.appendChild(areaPath);
    
    // Create the curve path
    const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curvePath.classList.add('bezier-curve');
    curvePath.setAttribute('stroke', `url(#bezier-curve-gradient-${index})`);
    curvePath.setAttribute('stroke-width', '3');
    curvePath.setAttribute('fill', 'none');
    curveGroup.appendChild(curvePath);
    
    // Create start and end points
    const startPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startPoint.classList.add('start-point');
    startPoint.setAttribute('fill', COLOR_BEZIER_START);
    curveGroup.appendChild(startPoint);
    
    const endPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endPoint.classList.add('end-point');
    endPoint.setAttribute('fill', COLOR_BEZIER_END);
    curveGroup.appendChild(endPoint);
    
    // Create boundary indicators (0-1 range)
    const boundaryGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    boundaryGroup.classList.add('boundary-group');
    svg.appendChild(boundaryGroup);
    
    // Append the SVG to its container
    container.innerHTML = ''; // Clear any existing content
    container.appendChild(svg);
    
    return svg;
}

// Initialize SVG and set up resize listener
function initSVG(svg, index) {
    // Get target bezier values from the card
    const card = svg.closest('.card');
    const vals = card.querySelector('.card-content p').textContent.trim().split(',').map(Number);
    const [targetX1, targetY1, targetX2, targetY2] = vals;

    // Initial draw with linear curve (0,0,1,1)
    updateBezierSVG(svg, 0, 0, 1, 1);

    // Animate to target values
    animateBezierCurve(svg, targetX1, targetY1, targetX2, targetY2);

    // Update on window resize (redraw with final values)
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Pass the final target values for resize updates
            updateBezierSVG(svg, targetX1, targetY1, targetX2, targetY2);
        }, RESIZE_DELAY);
    });
}

// --- Animation Function ---
function animateBezierCurve(svg, targetX1, targetY1, targetX2, targetY2) {
    const duration = 1000; // Animation duration in ms
    const startX1 = 0, startY1 = 0, startX2 = 1, startY2 = 1;
    let startTime = null;

    function step(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // Simple ease-out easing function (t => 1 - pow(1 - t, 3))
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        // Interpolate control points
        const currentX1 = startX1 + (targetX1 - startX1) * easedProgress;
        const currentY1 = startY1 + (targetY1 - startY1) * easedProgress;
        const currentX2 = startX2 + (targetX2 - startX2) * easedProgress;
        const currentY2 = startY2 + (targetY2 - startY2) * easedProgress;

        // Update the SVG with interpolated values
        updateBezierSVG(svg, currentX1, currentY1, currentX2, currentY2);

        // Continue animation if not finished
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    // Start the animation
    requestAnimationFrame(step);
}

// Update the SVG bezier curve based on container dimensions and control points
function updateBezierSVG(svg, x1, y1, x2, y2) { 
    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;
    
    // Calculate padding values
    const paddingRatio = 0;
    const minSide = Math.min(width, height);
    const xPadding = Math.min(20, minSide * paddingRatio);
    const yPadding = Math.min(20, minSide * paddingRatio);
    
    // Define outer rectangle (clipping bounds)
    const p0_outer = { x: xPadding, y: height - yPadding }; // bottom-left of clipping rect
    const p3_outer = { x: width - xPadding, y: yPadding };   // top-right of clipping rect

    // Apply inner padding so curve stays inside clipping rect by INNER_PADDING_RATIO on all sides
    const innerXOffset = INNER_PADDING_RATIO * (p3_outer.x - p0_outer.x);
    const innerYOffset = INNER_PADDING_RATIO * (p0_outer.y - p3_outer.y);

    // Start/end points after padding
    const p0 = { x: p0_outer.x + innerXOffset, y: p0_outer.y - innerYOffset }; // bottom-left inner
    const p3 = { x: p3_outer.x - innerXOffset, y: p3_outer.y + innerYOffset }; // top-right inner

    const usableW = (p3_outer.x - p0_outer.x) - 2 * innerXOffset;
    const usableH = (p0_outer.y - p3_outer.y) - 2 * innerYOffset;
    
    // Calculate control points within inner rectangle using passed arguments
    const cp1 = { x: p0.x + x1 * usableW, y: p0.y - y1 * usableH };
    const cp2 = { x: p0.x + x2 * usableW, y: p0.y - y2 * usableH };
    
    // Update the SVG viewBox to match dimensions
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Calculate the 0-1 range in SVG coordinates (outer clipping rect)
    const normalizedRect = {
        x: p0_outer.x,
        y: p3_outer.y,
        width: p3_outer.x - p0_outer.x,
        height: p0_outer.y - p3_outer.y
    };
    
    // Update the clipping path to match the 0-1 range
    const clipPathId = svg.querySelector('clipPath').id;
    const clipRect = svg.querySelector(`#${clipPathId} rect`);
    clipRect.setAttribute('x', normalizedRect.x);
    clipRect.setAttribute('y', normalizedRect.y);
    clipRect.setAttribute('width', normalizedRect.width);
    clipRect.setAttribute('height', normalizedRect.height);
    
    // Update the bezier curve path
    const curvePath = svg.querySelector('.bezier-curve');
    curvePath.setAttribute('d', `M ${p0.x},${p0.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p3.x},${p3.y}`);
    
    // Update stroke width based on size
    curvePath.setAttribute('stroke-width', Math.min(width, height) * 0.03);
    
    // Update the reference area path (hidden)
    const areaPath = svg.querySelector('.bezier-area');
    areaPath.setAttribute('d', `M ${p0.x},${p0.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p3.x},${p3.y} L ${p3.x},${p0_outer.y} L ${p0.x},${p0_outer.y} Z`);
    
    // Get the index from the gradient ID
    const curveGradient = svg.querySelector('defs linearGradient');
    const index = parseInt(curveGradient.id.split('-').pop());
    
    // Generate gradient strips for the area under the curve
    generateGradientStrips(svg, p0, cp1, cp2, p3, index, p0_outer.y);
    
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
    
    // Draw boundary indicators (optional, for debugging)
    // drawBoundaryIndicators(svg, normalizedRect);
}

// Draw boundary indicators for the 0-1 range
function drawBoundaryIndicators(svg, rect) {
    const boundaryGroup = svg.querySelector('.boundary-group');
    boundaryGroup.innerHTML = ''; // Clear existing indicators
    
    // Uncomment the following code if you want to see the boundary rectangle
    
    // Create a rectangle showing the 0-1 range
    const boundaryRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boundaryRect.setAttribute('x', rect.x);
    boundaryRect.setAttribute('y', rect.y);
    boundaryRect.setAttribute('width', rect.width);
    boundaryRect.setAttribute('height', rect.height);
    boundaryRect.setAttribute('fill', 'none');
    boundaryRect.setAttribute('stroke', 'rgba(100, 100, 100, 0.2)');
    boundaryRect.setAttribute('stroke-width', '1');
    boundaryRect.setAttribute('stroke-dasharray', '4,4');
    boundaryGroup.appendChild(boundaryRect);
    
}

// Generate gradient strips that follow the curve
function generateGradientStrips(svg, p0, cp1, cp2, p3, index, height) {
    // Get or create the area container
    const areaContainer = svg.querySelector('.bezier-area-container');
    areaContainer.innerHTML = ''; // Clear existing paths
    
    // Number of segments for better gradient effect
    const N = 50;
    
    // Clean up any old gradient definitions
    const defs = svg.querySelector('defs');
    Array.from(defs.querySelectorAll('linearGradient')).forEach(gradient => {
        if (gradient.id.includes('bezier-strip-gradient')) {
            defs.removeChild(gradient);
        }
    });
    
    for (let i = 0; i < N; i++) {
        const t1 = i / N;
        const t2 = (i + 1) / N;
        
        // Get points along the curve
        const p1 = getCubicBezierPoint(p0, cp1, cp2, p3, t1);
        const p2 = getCubicBezierPoint(p0, cp1, cp2, p3, t2);
        
        // Interpolate color between start and end
        const color = lerpColor(COLOR_BEZIER_START, COLOR_BEZIER_END, t1);
        
        // Create a vertical strip path
        const stripPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const baseY = height;
        
        // Define the path for this strip
        stripPath.setAttribute('d', `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p2.x},${baseY} L ${p1.x},${baseY} Z`);
        
        // Create a unique gradient ID for this strip
        const gradientId = `bezier-strip-gradient-${index}-${i}`;
        
        // Create a vertical gradient for this strip
        const stripGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        stripGradient.id = gradientId;
        stripGradient.setAttribute('x1', '0%');
        stripGradient.setAttribute('y1', '0%');
        stripGradient.setAttribute('x2', '0%');
        stripGradient.setAttribute('y2', '100%');
        
        // Add stops for the gradient
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', color);
        stop1.setAttribute('stop-opacity', '0.2'); // Top of strip (at curve)
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', color);
        stop2.setAttribute('stop-opacity', '0'); // Bottom of strip (fully transparent)
        
        stripGradient.appendChild(stop1);
        stripGradient.appendChild(stop2);
        defs.appendChild(stripGradient);
        
        // Apply the gradient to the strip
        stripPath.setAttribute('fill', `url(#${gradientId})`);
        
        // Add the strip to the container
        areaContainer.appendChild(stripPath);
    }
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
// --- MODIFIED: Initial draw is now handled by initSVG and animation ---
// setTimeout(() => {
//     const svgs = document.querySelectorAll('.bezier-svg');
//     svgs.forEach((svg) => {
//         // Need to get target values here if we were to call update directly
//         // For simplicity, relying on initSVG to handle initial state and animation
//         // updateBezierSVG(svg, /* need target values here */);
//     });
// }, 100);
