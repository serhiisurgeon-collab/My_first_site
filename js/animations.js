
const photoWrap = document.querySelector(".start-hero__photo-wrap");


if (photoWrap) {
  photoWrap.addEventListener("mousemove", (event) => {
    const rect = photoWrap.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    photoWrap.style.setProperty("--light-x", `${x}%`);
    photoWrap.style.setProperty("--light-y", `${y}%`);
    photoWrap.style.setProperty("--light-x-num", String(x / 100));
    photoWrap.style.setProperty("--light-y-num", String(y / 100));

    
  });

  photoWrap.addEventListener("mouseleave", () => {
    photoWrap.style.setProperty("--light-x", "50%");
    photoWrap.style.setProperty("--light-y", "50%");
    photoWrap.style.setProperty("--light-x-num", "0.5");
    photoWrap.style.setProperty("--light-y-num", "0.5");
  });
}

document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => {
    document.body.classList.add('hero-loaded');
  });
});