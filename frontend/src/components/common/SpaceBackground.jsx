import React, { useState, useEffect } from 'react';

const SpaceBackground = () => {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random stars on mount
    // 200 stars to make it look like a dense space
    const generatedStars = Array.from({ length: 200 }).map(() => {
      // Create sizes varying from 1px to 3px
      const size = Math.random() * 2.5 + 0.5;
      return {
        id: Math.random().toString(36).substring(7),
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        // Randomize twinkle speed
        animationDuration: `${Math.random() * 3 + 1.5}s`,
        animationDelay: `${Math.random() * 5}s`,
        // Some stars are slightly colored (blueish or purplish)
        backgroundColor: Math.random() > 0.8 ? (Math.random() > 0.5 ? '#a855f7' : '#3b82f6') : '#ffffff',
      };
    });
    setStars(generatedStars);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        // The black hole mask: Hides the stars right under the cursor, making a "void"
        maskImage: 'radial-gradient(circle 120px at var(--mouse-x, -100px) var(--mouse-y, -100px), transparent 10%, black 100%)',
        WebkitMaskImage: 'radial-gradient(circle 120px at var(--mouse-x, -100px) var(--mouse-y, -100px), transparent 10%, black 100%)',
        transition: 'mask-image 0.1s ease-out, -webkit-mask-image 0.1s ease-out',
      }}
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.width,
            height: star.height,
            backgroundColor: star.backgroundColor,
            animation: `twinkle ${star.animationDuration} infinite alternate ${star.animationDelay}`,
            boxShadow: `0 0 ${parseFloat(star.width) * 2}px ${star.backgroundColor}`,
          }}
        />
      ))}
    </div>
  );
};

export default SpaceBackground;
