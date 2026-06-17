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
    let accretionHeat = 0; // 0 = purple/cool, 1 = orange/hot

    // Resize handler
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initStars();
    };

    // Initialize stars with Z-depth (3D) and Galaxies
    const initStars = () => {
      stars = [];
      const numStars = 2000; 
      
      for (let i = 0; i < numStars; i++) {
        const z = Math.random() * 2 + 1; 
        const isGalaxy = Math.random() > 0.99; // 1% chance to be a large galaxy/nebula
        const isMedium = !isGalaxy && Math.random() > 0.95; // 5% chance to be a medium star
        
        let size;
        if (isGalaxy) size = Math.random() * 15 + 10; // 10 to 25 pixels for galaxies
        else if (isMedium) size = Math.random() * 3 + 1.5;
        else size = (Math.random() * 2.0 + 0.8) / z; 
        
        const speedMultiplier = 0.1 / z;
        const baseVx = (Math.random() - 0.5) * speedMultiplier;
        const baseVy = (Math.random() - 0.5) * speedMultiplier;
        
        // Random base colors
        let r, g, b;
        const rand = Math.random();
        if (rand > 0.8) {
          r = 168; g = 85; b = 247; // Purple
        } else if (rand > 0.6) {
          r = 59; g = 130; b = 246; // Blue
        } else if (isGalaxy) {
          r = 236; g = 72; b = 153; // Pinkish galaxies
        } else {
          r = 255; g = 255; b = 255; // White
        }

        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: z,
          radius: size,
          isGalaxy: isGalaxy,
          baseVx: baseVx,
          baseVy: baseVy,
          vx: baseVx,
          vy: baseVy,
          baseR: r, baseG: g, baseB: b,
          r: r, g: g, b: b,
          alpha: isGalaxy ? Math.random() * 0.4 + 0.1 : Math.random() * 0.8 + 0.2,
          wobbleOffset: Math.random() * Math.PI * 2
        });
      }
    };

    // Animation Loop
    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      
      const maxDistance = 120; // Increased gravity pull radius slightly
      const time = Date.now() * 0.002;

      // Handle Accretion Heat (Orange Glow)
      if (mouse.x > -100 && mouse.y > -100) {
        accretionHeat = Math.min(accretionHeat + 0.003, 1); // Slowly heat up
      } else {
        accretionHeat = Math.max(accretionHeat - 0.01, 0); // Cool down fast
      }

      stars.forEach(star => {
        const dx = mouse.x - star.x;
        const dy = mouse.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        star.r = star.baseR;
        star.g = star.baseG;
        star.b = star.baseB;

        if (distance < maxDistance) {
          const angle = Math.atan2(dy, dx);
          // Introduce turbulence/spiral effect so it's not a perfect circle
          const wobble = Math.sin(time + star.wobbleOffset) * 5;
          // Give each star a slightly different permanent orbit so they don't form a single thin line
          const targetOrbit = 12 + wobble + (star.z * 2) + (star.wobbleOffset * 1.5); 
          
          const spinAngle = angle + (Math.PI / 2) + (Math.sin(time) * 0.1); 
          
          const radialDist = distance - targetOrbit;
          
          const gravityStrength = radialDist * 0.04; 
          star.vx += Math.cos(angle) * gravityStrength;
          star.vy += Math.sin(angle) * gravityStrength;
          
          const spinStrength = 1.0 + (accretionHeat * 0.8); // Less aggressive spin
          star.vx += Math.cos(spinAngle) * spinStrength;
          star.vy += Math.sin(spinAngle) * spinStrength;

          const heat = Math.max(0, 1 - (distance / maxDistance));
          
          // The spinning stars should turn blinding white/orange when heated up
          // Cool: Bright White (255, 255, 255)
          // Hot: Blinding Warm White (255, 240, 220)
          const targetR = 255;
          const targetG = 255 - (15 * accretionHeat); 
          const targetB = 255 - (35 * accretionHeat); 

          star.r = star.baseR + (targetR - star.baseR) * heat;
          star.g = star.baseG + (targetG - star.baseG) * heat;
          star.b = star.baseB + (targetB - star.baseB) * heat;

          // Higher friction so they stay in orbit and don't get thrown out
          star.vx *= 0.70;
          star.vy *= 0.70;
        } else {
          const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
          // If they were just released (moving fast), add a scatter force so they don't clump
          if (speed > 1.5) {
             star.vx += (Math.random() - 0.5) * 1.2;
             star.vy += (Math.random() - 0.5) * 1.2;
          }

          // Slowly return to base slow drift
          star.vx += (star.baseVx - star.vx) * 0.01;
          star.vy += (star.baseVy - star.vy) * 0.01;
          
          // Varied friction to break up clumps naturally
          const friction = 0.95 + ((star.wobbleOffset % 1) * 0.03); 
          star.vx *= friction;
          star.vy *= friction;
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

        // Draw star
        const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
        const glowAlpha = Math.min(star.alpha + (speed * 0.03), 1);
        
        ctx.beginPath();
        const colorStr = `rgba(${Math.floor(star.r)}, ${Math.floor(star.g)}, ${Math.floor(star.b)}, ${glowAlpha})`;
        
        if (star.isGalaxy) {
          // Milky Way style large nebulas - using soft radial gradients and transforms
          ctx.save();
          ctx.translate(star.x, star.y);
          // Rotate oval based on movement direction
          const moveAngle = Math.atan2(star.vy, star.vx);
          ctx.rotate(moveAngle);
          ctx.scale(1, 0.4); // squash into a galaxy disk

          const r = Math.floor(star.r);
          const g = Math.floor(star.g);
          const b = Math.floor(star.b);

          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, star.radius);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.8})`);
          gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.4})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, star.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        } else {
          // Normal stars
          ctx.shadowBlur = 0;
          ctx.strokeStyle = colorStr;
          ctx.lineWidth = star.radius;
          ctx.lineCap = 'round';
          
          if (speed > 1) {
            ctx.moveTo(star.x - star.vx * 2.0, star.y - star.vy * 2.0); // Longer lensing trail
          } else {
            ctx.moveTo(star.x, star.y);
          }
          ctx.lineTo(star.x, star.y);
          ctx.stroke();
        }
      });

      // Disable shadow for UI
      ctx.shadowBlur = 0;

      // Draw Accretion Disk / Black Hole
      if (mouse.x > -100 && mouse.y > -100) {
        // Calculate dynamic colors based on accretionHeat
        // Cool: Purple (168, 85, 247), Hot: Blinding White-Orange (255, 240, 200)
        const innerR = 168 + (255 - 168) * accretionHeat;
        const innerG = 85 + (240 - 85) * accretionHeat;
        const innerB = 247 + (200 - 247) * accretionHeat;

        // Cool: Blue (59, 130, 246), Hot: Intense Orange (255, 120, 0)
        const midR = 59 + (255 - 59) * accretionHeat;
        const midG = 130 + (120 - 130) * accretionHeat;
        const midB = 246 + (0 - 246) * accretionHeat;

        const bhRadius = 8;
        
        // 1. Accretion Disk Glow (Ring) - Larger and softer
        const diskRadius = 28 + (accretionHeat * 15); 
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, diskRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, bhRadius, mouse.x, mouse.y, diskRadius);
        
        // Intense core fading into space
        gradient.addColorStop(0, `rgba(${innerR}, ${innerG}, ${innerB}, 0.9)`); 
        gradient.addColorStop(0.3, `rgba(${midR}, ${midG}, ${midB}, 0.5)`); 
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // 3. Event Horizon (Pure Black Void)
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, bhRadius, 0, Math.PI * 2); // Pitch black center
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        
        // 4. Photon Sphere (Sharp bright edge that makes it "pop" out in 3D)
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, bhRadius + 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + (accretionHeat * 0.5)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
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
