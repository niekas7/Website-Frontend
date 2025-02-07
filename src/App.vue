<template>
  <div class="video-container">
    <video autoplay loop muted playsinline disablePictureInPicture class="video-background">
      <source src="./assets/Stars.mp4" type="video/mp4" />
    </video>
    <div class="content">
      <h1 class="title">
        <span class="neon-orange">Can</span>
        <img src="/canfusion_logo.svg" alt="Logo" class="logo-img" />
        <span class="electric-blue">Fusion</span>
      </h1>
    </div>
  </div>
</template>

<script setup>
// Add any setup logic here if needed
</script>

<style scoped>
/* Background video container */
.video-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Background video styling */
.video-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  object-fit: cover;
  z-index: -1;
}

/* Content styling */
.content {
  position: relative;
  z-index: 10;
  color: white;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

/* Title styling */
.title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7vw; /* Increased size */
  font-weight: bold;
  margin: 0;
}

/* Logo image styling */
.logo-img {
  height: 15vw;
  width: auto;
  margin: 0 1.5rem;
  filter: 
    drop-shadow(-0.8vw 0 0.6vw rgba(255, 71, 0, 0.8))  /* Orange core glow */
    drop-shadow(0.8vw 0 0.6vw rgba(0, 180, 255, 0.7))   /* Blue core glow */
}


/* Electric blue text styling */
.electric-blue {
  color: #00FFFF; /* Cyan base color */
  text-shadow: 
    0 0 10px #00FFFF, 
    0 0 20px #1E90FF, 
    0 0 30px #4682B4, 
    0 0 40px #00FFFF; /* Bright and soft layers for depth */
}

/* Neon purple text styling */
.neon-purple {
  color: #8a2be2;
  text-shadow: 0 0 15px #8a2be2, 0 0 25px #6a0dad;
}

.neon-orange {
  color: #FFA500; /* Bright orange base color */
  text-shadow: 
    0 0 10px #FFA500, 
    0 0 20px #FF8C00, 
    0 0 30px #FF4500, 
    0 0 40px #FF6347; /* Add layers of glowing effect */
}

/* Responsiveness for smaller screens */
@media (max-width: 768px) {
  .title {
    font-size: 10vw; /* Larger text for smaller screens */
  }

  .logo-img {
    height: 20vw; /* Larger logo for smaller screens */
  }
}
</style>
