// Minimal interactions for a premium feel
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.glass-card');
  const container = document.querySelector('.container');

  // Subtle mouse movement effect for the glass card
  if (window.innerWidth > 768) {
    container.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xRotation = (clientY - innerHeight / 2) / 50;
      const yRotation = (clientX - innerWidth / 2) / 50;
      
      card.style.transform = `perspective(1000px) rotateX(${-xRotation}deg) rotateY(${yRotation}deg)`;
    });

    container.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  // Prevent scroll unless on mobile
  window.addEventListener('wheel', (e) => {
    if (window.innerWidth > 768) {
      e.preventDefault();
    }
  }, { passive: false });
});
