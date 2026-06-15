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
    let mouse = { x: -1000, y: -1000 }; // start off-screen
    
    // Resize handler
    const resizeCanvas = () => {
      // Use parent container dimensions
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initStars();
    };

    // Initialize stars
    const initStars = () => {
      stars = [];
      const numStars = 400; // More stars for a better vortex effect
      
      for (let i = 0; i < numStars; i++) {
        const size = Math.random() * 2 + 0.5;
        // Slower base movement for a calmer space effect
        const speedMultiplier = 0.5;
        const baseVx = (Math.random() - 0.5) * speedMultiplier;
        const baseVy = (Math.random() - 0.5) * speedMultiplier;
        
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: size,
          baseVx: baseVx,
          baseVy: baseVy,
          vx: baseVx,
          vy: baseVy,
          color: Math.random() > 0.8 ? (Math.random() > 0.5 ? '#a855f7' : '#3b82f6') : '#ffffff',
          alpha: Math.random() * 0.5 + 0.5
        });
      }
    };

    // Animation Loop
    const animate = () => {
      // Clear canvas with a very slight fade for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // Match dark theme surface-900 roughly
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Actually clear to let hero background show through!
      
      // If we want trails, we'd use fillRect, but we want the CSS background to show.
      // So we just clear it entirely.
      
      const maxDistance = 120; // Tighter radius so it only affects exactly around the mouse
      const eventHorizon = 10; // Radius where stars get "sucked in"

      stars.forEach(star => {
        // Calculate distance to mouse
        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          // Calculate angle from star to mouse
          const angle = Math.atan2(dy, dx);
          // Tangential angle for orbital spinning
          const spinAngle = angle + (Math.PI / 2);
          
          // Target orbit radius (where they should spin)
          const targetOrbit = 35;
          // Distance difference from the ideal orbit
          const radialDist = distance - targetOrbit;
          
          // Spring force pulling them towards the orbit ring
          // If too far, pulls in. If too close, pushes out.
          const gravityStrength = radialDist * 0.04;
          
          star.vx += Math.cos(angle) * gravityStrength;
          star.vy += Math.sin(angle) * gravityStrength;
          
          // Strong continuous spin force
          const spinStrength = 2.5; 
          star.vx += Math.cos(spinAngle) * spinStrength;
          star.vy += Math.sin(spinAngle) * spinStrength;

          // Limit speed to prevent chaotic physics explosions
          const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
          const maxSpeed = 7;
          if (speed > maxSpeed) {
            star.vx = (star.vx / speed) * maxSpeed;
            star.vy = (star.vy / speed) * maxSpeed;
          }
        } else {
          // Outside influence: slowly return to normal drift
          star.vx += (star.baseVx - star.vx) * 0.02;
          star.vy += (star.baseVy - star.vy) * 0.02;
        }

        // Apply friction to max speed so they don't fly out of control
        star.vx *= 0.98;
        star.vy *= 0.98;

        // Move star
        star.x += star.vx;
        star.y += star.vy;

        // Screen wrap
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        
        // Add a glow effect based on speed
        const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
        const glowAlpha = Math.min(star.alpha + (speed * 0.1), 1);
        
        ctx.fillStyle = star.color;
        ctx.globalAlpha = glowAlpha;
        ctx.fill();
        ctx.globalAlpha = 1.0; // Reset
      });

      // Optional: Draw the black hole center (event horizon)
      if (mouse.x > -100 && mouse.y > -100) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, eventHorizon + 5, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, eventHorizon + 5);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Event Listeners
    window.addEventListener('resize', resizeCanvas);
    
    // We attach mousemove to the parent window/document to track it properly
    // But we only care about coordinates relative to the canvas
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      // Move black hole off screen
      mouse.x = -1000;
      mouse.y = -1000;
    };

    // Need to bind mouse to the parent section
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
      style={{ opacity: 0.8 }}
    />
  );
};

export default SpaceBackground;
