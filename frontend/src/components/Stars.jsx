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
          twinkleSpeed: Math.random() * 0.008 + 0.002,
          // ✅ Random velocity for movement
          vx: (Math.random() - 0.5) * 0.15, // Very slow horizontal speed
          vy: (Math.random() - 0.5) * 0.15, // Very slow vertical speed
        });
      }
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(
        0, 0,
        canvas.width, canvas.height
      );
      
      gradient.addColorStop(0, '#0a0a12');
      gradient.addColorStop(0.3, '#0d0d2b');
      gradient.addColorStop(0.6, '#12123a');
      gradient.addColorStop(0.85, '#18184a');
      gradient.addColorStop(1, '#1a1a5a');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();

      stars.forEach((star) => {
        // ✅ Update position with random movement
        star.x += star.vx;
        star.y += star.vy;

        // ✅ Bounce off walls (or wrap around)
        if (star.x < 0 || star.x > canvas.width) {
          star.vx *= -1;
          star.x = Math.max(0, Math.min(canvas.width, star.x));
        }
        if (star.y < 0 || star.y > canvas.height) {
          star.vy *= -1;
          star.y = Math.max(0, Math.min(canvas.height, star.y));
        }

        // ✅ Twinkle
        const twinkle = Math.sin(Date.now() * star.twinkleSpeed) * 0.3 + 0.7;
        const opacity = star.brightness * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${opacity * 0.9})`;
        ctx.fill();

        if (star.radius > 1.2) {
          ctx.shadowColor = `rgba(100, 150, 255, ${opacity * 0.2})`;
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Extra large stars with more glow
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