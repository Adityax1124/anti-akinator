import React, { useEffect, useRef } from "react";

const Stars = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let stars = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createStars = (count) => {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.8 + 0.5,
          brightness: Math.random() * 0.6 + 0.4,
          twinkleSpeed: Math.random() * 0.025 + 0.005,
        });
      }
    };

    // ✅ Draw gradient background - Top-Left Black to Bottom-Right Navy Blue
    const drawBackground = () => {
      // Top-left to Bottom-right diagonal
      const gradient = ctx.createLinearGradient(
        0, 0,              // Start: Top-Left
        canvas.width, canvas.height  // End: Bottom-Right
      );
      
      gradient.addColorStop(0, '#0a0a12');        // Top-Left: Very dark (almost black)
      gradient.addColorStop(0.3, '#0d0d2b');      // 30%: Dark navy
      gradient.addColorStop(0.6, '#12123a');      // 60%: Medium navy
      gradient.addColorStop(0.85, '#18184a');     // 85%: Light navy
      gradient.addColorStop(1, '#1a1a5a');        // Bottom-Right: Light navy blue
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawStars = () => {
      // ✅ Clear and draw background first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();

      // ✅ Draw stars with subtle blue glow
      stars.forEach((star) => {
        const twinkle = Math.sin(Date.now() * star.twinkleSpeed) * 0.3 + 0.7;
        const opacity = star.brightness * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        
        // Stars with slight blue tint
        ctx.fillStyle = `rgba(200, 220, 255, ${opacity * 0.9})`;
        ctx.fill();

        // Glow for brighter stars
        if (star.radius > 1.2) {
          ctx.shadowColor = `rgba(100, 150, 255, ${opacity * 0.2})`;
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // ✅ Extra large stars with more glow
      stars.filter(s => s.radius > 1.5).forEach((star) => {
        const twinkle = Math.sin(Date.now() * star.twinkleSpeed * 0.7) * 0.3 + 0.7;
        const opacity = star.brightness * twinkle;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 0.5, 0, Math.PI * 2);
        ctx.shadowColor = `rgba(150, 180, 255, ${opacity * 0.15})`;
        ctx.shadowBlur = 25;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    };

    const animate = () => {
      drawStars();
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createStars(220);
    animate();

    const handleResize = () => {
      resize();
      createStars(220);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

export default Stars;