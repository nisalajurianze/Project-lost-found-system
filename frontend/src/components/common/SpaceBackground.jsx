import React, { useEffect, useRef } from 'react';

const SpaceBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let stars = [];
    
    // Mouse tracking
    let mouse = { x: -1000, y: -1000 }; 
    
    // Resize handler
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initStars();
    };

    // Initialize stars with Z-depth (3D)
    const initStars = () => {
      stars = [];
      const numStars = 2000; // Increased star count (user point 6)
      
      for (let i = 0; i < numStars; i++) {
        // Z-depth: 1 is very close, 3 is very far
        const z = Math.random() * 2 + 1; 
        const size = (Math.random() * 2.0 + 0.8) / z; 
        
        // Slower movement for further stars (user point 3: "star moving speed ek thwa tikak adu krnna")
        const speedMultiplier = 0.15 / z;
        const baseVx = (Math.random() - 0.5) * speedMultiplier;
        const baseVy = (Math.random() - 0.5) * speedMultiplier;
        
        // Random base colors
        let r, g, b;
        const rand = Math.random();
        if (rand > 0.8) {
          r = 168; g = 85; b = 247; // Purple
        } else if (rand > 0.6) {
          r = 59; g = 130; b = 246; // Blue
        } else {
          r = 255; g = 255; b = 255; // White
        }

        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: z,
          radius: size,
          baseVx: baseVx,
          baseVy: baseVy,
          vx: baseVx,
          vy: baseVy,
          baseR: r, baseG: g, baseB: b,
          r: r, g: g, b: b,
          alpha: Math.random() * 0.8 + 0.2 
        });
      }
    };

    // Animation Loop
    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      
      const maxDistance = 90; // "podima area" (user point 4)
      const targetOrbit = 15;

      stars.forEach(star => {
        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        star.r = star.baseR;
        star.g = star.baseG;
        star.b = star.baseB;

        if (distance < maxDistance) {
          const angle = Math.atan2(dy, dx);
          const spinAngle = angle + (Math.PI / 2);
          
          const radialDist = distance - targetOrbit;
          
          // Strong gravity to pull them strictly into the small area
          const gravityStrength = radialDist * 0.15;
          star.vx += Math.cos(angle) * gravityStrength;
          star.vy += Math.sin(angle) * gravityStrength;
          
          // Fast spin around the mouse
          const spinStrength = 5.0; 
          star.vx += Math.cos(spinAngle) * spinStrength;
          star.vy += Math.sin(spinAngle) * spinStrength;

          const heat = Math.max(0, 1 - (distance / maxDistance));
          star.r = star.baseR + (255 - star.baseR) * heat;
          star.g = star.baseG + (255 - star.baseG) * heat;
          star.b = star.baseB + (255 - star.baseB) * heat;

          // High friction inside vortex so they don't sling out
          star.vx *= 0.75;
          star.vy *= 0.75;
        } else {
          // Slowly return to base slow drift
          star.vx += (star.baseVx - star.vx) * 0.05;
          star.vy += (star.baseVy - star.vy) * 0.05;
          star.vx *= 0.98;
          star.vy *= 0.98;
        }

        let prevX = star.x;
        let prevY = star.y;

        star.x += star.vx;
        star.y += star.vy;

        // Screen wrap
        if (star.x < 0) { star.x = canvas.width; prevX = star.x; }
        if (star.x > canvas.width) { star.x = 0; prevX = star.x; }
        if (star.y < 0) { star.y = canvas.height; prevY = star.y; }
        if (star.y > canvas.height) { star.y = 0; prevY = star.y; }

        // Draw star (Gravitational Lensing / Motion Blur)
        const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
        const glowAlpha = Math.min(star.alpha + (speed * 0.05), 1);
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${Math.floor(star.r)}, ${Math.floor(star.g)}, ${Math.floor(star.b)}, ${glowAlpha})`;
        ctx.lineWidth = star.radius;
        ctx.lineCap = 'round';
        
        // If it's moving fast (in the vortex), stretch it out (lensing)
        if (speed > 1) {
          ctx.moveTo(star.x - star.vx * 1.5, star.y - star.vy * 1.5);
        } else {
          ctx.moveTo(star.x, star.y);
        }
        ctx.lineTo(star.x, star.y);
        ctx.stroke();
      });

      // Draw Accretion Disk / Black Hole
      if (mouse.x > -100 && mouse.y > -100) {
        // Event Horizon (Pure Black Void)
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fill();

        // Accretion Disk Glow
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, targetOrbit + 20, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 12, mouse.x, mouse.y, targetOrbit + 20);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)'); // Purple inner glow
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)'); // Blue mid glow
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Event Listeners
    window.addEventListener('resize', resizeCanvas);
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const parentSection = canvas.closest('section');
    if (parentSection) {
      parentSection.addEventListener('mousemove', handleMouseMove);
      parentSection.addEventListener('mouseleave', handleMouseLeave);
    }

    // Init
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (parentSection) {
        parentSection.removeEventListener('mousemove', handleMouseMove);
        parentSection.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  );
};

export default SpaceBackground;
