import React, { useEffect, useRef } from "react";

const Stars = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationId;
    let stars = [];

    // Background image
    const bgImage = new Image();
    bgImage.src = "/anime-bg.jpg";

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
          brightness: Math.random() * 0.5 + 0.5,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
        });
      }
    };

    // Draw background image like CSS background-size: cover
    const drawBackground = () => {
      if (!bgImage.complete) return;

      const canvasRatio = canvas.width / canvas.height;
      const imageRatio = bgImage.width / bgImage.height;

      let drawWidth;
      let drawHeight;
      let offsetX;
      let offsetY;

      if (imageRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imageRatio;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imageRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(
        bgImage,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background first
      drawBackground();

      // Draw stars
      stars.forEach((star) => {
        const twinkle =
          Math.sin(Date.now() * star.twinkleSpeed) * 0.3 + 0.7;

        const opacity = star.brightness * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.shadowBlur = 8;

        ctx.fill();

        ctx.shadowBlur = 0;
      });
    };

    const animate = () => {
      drawStars();
      animationId = requestAnimationFrame(animate);
    };

    bgImage.onload = () => {
      resize();
      createStars(220);
      animate();
    };

    // If image is already cached, trigger onload manually
    if (bgImage.complete) {
      bgImage.onload();
    }

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
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
};

export default Stars;