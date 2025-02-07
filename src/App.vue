<template>
  <div class="app-container">
    <video class="background-video" src="/Stars.mp4" autoplay loop muted></video>
    
    <header class="fixed-header">
      <div class="header-inner">
        <!-- Left-aligned Branding -->
        <div class="brand-container">
          <img src="/canfusion_logo.svg" alt="CanFusion Logo" class="brand-logo" />
          <span class="brand-text">CanFusion</span>
        </div>
        
        <!-- Right-aligned Navigation -->
        <nav class="desktop-navigation">
          <div class="nav-links-container">
            <a href="" class="navigation-link">Misija</a>
            <a href="" class="navigation-link">Projekto progresas</a>
            <a href="" class="navigation-link">Apie mus</a>
            <a href="/galerija" class="navigation-link">Galerija</a>
          </div>
        </nav>
      </div>
    </header>
  </div>
</template>

<style scoped>
/* Previous root and container styles remain the same */

.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: clamp(4rem, 8vh, 6rem);
  background-color: white;
  box-shadow: 0 0.2vh 0.4vh -0.1vh rgba(0, 0, 0, 0.1), 
              0 0.1vh 0.2vh -0.2vh rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 clamp(1rem, 3vw, 2rem);
  width: 100%;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 1rem);
}

.desktop-navigation {
  display: none; /* Hidden by default */
}

.nav-links-container {
  display: flex;
  gap: clamp(1rem, 2vw, 1.5rem);
}

/* Show navigation on desktop */
@media (min-width: 768px) {
  .desktop-navigation {
    display: flex; /* Changed from block to flex */
    justify-content: flex-end;
  }
}

/* Rest of the styles remain the same */
.navigation-link {
  color: #1f2937;
  font-weight: 500;
  font-size: clamp(1.2rem, 1.8vw, 1.8rem);
  line-height: clamp(1.8rem, 2.5vw, 2.5rem);
  transition: color 0.2s ease;
}

.navigation-link:hover {
  color: #2563eb;
}

.brand-logo {
  height: clamp(3rem, 6vh, 5rem);
  width: auto;
}

.brand-text {
  color: #2563eb;
  font-weight: 700;
  font-size: clamp(1.8rem, 3vw, 3rem);
  line-height: clamp(2.2rem, 3.5vw, 3.5rem);
  letter-spacing: -0.05vw;
}
</style>