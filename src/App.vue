<template>
  <div class="app-container">
    <video 
      class="background-video" 
      src="/Stars.mp4" 
      autoplay 
      loop 
      muted 
      playsinline
      disablepictureinpicture
      controlslist="nodownload nofullscreen noremoteplayback"
      disableremoteplayback
    ></video>
    
    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <img src="/Canfusion_logo.svg" alt="Logo" class="logo" />
          <span class="brand-name">CanFusion</span>
        </div>

        <nav class="desktop-nav">
          <a href="" class="nav-link">Misija</a>
          <a href="" class="nav-link">Projekto progresas</a>
          <a href="" class="nav-link">Apie mus</a>
          <a href="/galerija" class="nav-link">Galerija</a>
        </nav>

        <button class="menu-toggle" @click="toggleMenu">
          <svg v-if="!menuOpen" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>

    <!-- Mobile menu -->
    <transition name="menu-transition">
      <div v-if="menuOpen" class="mobile-menu">
        <a href="" class="nav-link" @click="closeMenu">Misija</a>
        <a href="" class="nav-link" @click="closeMenu">Projekto progresas</a>
        <a href="" class="nav-link" @click="closeMenu">Apie mus</a>
        <a href="/galerija" class="nav-link" @click="closeMenu">Galerija</a>
      </div>
    </transition>

    <!-- Hero section -->
    <div class="hero">
      <div class="hero-content">
        <div class="hero-title">
          <span>Can</span>
          <img src="/Canfusion_logo.svg" alt="Logo" class="hero-logo" />
          <span>Fusion</span>
        </div>
        <span class="hero-subtitle">KTU inžinerijos licėjus</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const menuOpen = ref(false);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};
</script>

<style scoped>
/* Import Orbitron font */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
/* Import News Gothic font (or alternative if unavailable) */
@import url('https://fonts.googleapis.com/css2?family=News+Cycle:wght@400;700&display=swap');

/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  font-family: 'Orbitron', sans-serif;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.background-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
  pointer-events: none; /* Prevent interaction with the video */
  touch-action: none; /* Disable touch actions */
  user-select: none; /* Prevent selection */
}

/* Header styles */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo {
  height: 3.5rem;
  width: auto;
}

.brand-name {
  color: #2563eb;
  font-weight: 700;
  font-size: 2rem;
  font-family: 'Orbitron', sans-serif;
}

/* Navigation */
.desktop-nav {
  display: none;
  gap: 2.5rem;
}

.nav-link {
  color: #1f2937;
  font-weight: 500;
  font-size: 1.7rem;
  text-decoration: underline;
  transition: color 0.2s;
  font-family: 'Orbitron', sans-serif;
}

.nav-link:hover,
.nav-link:active,
.nav-link:focus {
  color: #2563eb;
  text-decoration: underline;
}

.menu-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-toggle svg {
  width: 2rem;
  height: 2rem;
  color: #1f2937;
}

.menu-toggle img {
  width: 2rem;
  height: 2rem;
  display: block;
}

.mobile-menu {
  position: fixed;
  top: 5rem;
  left: 0;
  width: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  gap: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 9;
  animation: slideDown 0.3s ease-out;
}

/* Hero section */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  position: relative;
  z-index: 1;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-title {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: white;
  font-size: 3rem;
  padding: 0 1rem;
  animation: fadeIn 1s ease-in-out;
}

.hero-title span {
  font-family: 'Orbitron', sans-serif;
}

.hero-logo {
  height: 4.5rem;
  width: auto;
  animation: fadeIn 1s ease-in-out;
}

.hero-subtitle {
  color: white;
  font-size: 1.8rem;
  font-family: 'News Gothic', 'News Cycle', sans-serif;
  animation: fadeIn 1s ease-in-out;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-10px); opacity: 0; }
}

/* Vue transition classes for mobile menu */
.menu-transition-enter-active {
  animation: slideDown 0.3s ease-out;
}

.menu-transition-leave-active {
  animation: slideUp 0.2s ease-in;
}

/* Tablet and larger screens */
@media (min-width: 768px) {
  .desktop-nav {
    display: flex;
  }
  
  .menu-toggle {
    display: none;
  }
  
  .hero-title {
    font-size: 4rem;
  }
  
  .hero-logo {
    height: 6rem;
  }
  
  .hero-subtitle {
    font-size: 2.5rem;
  }
}

/* Large screens */
@media (min-width: 1024px) {
  .hero-title {
    font-size: 5rem;
  }
  
  .hero-logo {
    height: 8rem;
  }
  
  .hero-subtitle {
    font-size: 3rem;
  }
}

/* Tablet-specific styles for 800x1280 resolution */
@media (min-width: 768px) and (max-width: 1023px) {
  .header-inner {
    padding: 0 1rem;
  }
  
  .brand-name {
    font-size: 1.5rem;
  }
  
  .logo {
    height: 2.8rem;
  }
  
  .desktop-nav {
    gap: 1.2rem;
  }
  
  .nav-link {
    font-size: 1.3rem;
  }
}

/* Fix for smaller tablets (768px-858px) where navbar breaks */
@media (min-width: 768px) and (max-width: 858px) {
  .nav-link {
    font-size: 1.1rem;
    font-weight: 500;
  }
}

/* Mobile-specific styles */
@media (max-width: 767px) {
  .header-inner {
    padding: 0 1rem;
  }
  
  .brand-name {
    font-size: 1.6rem;
  }
  
  .mobile-menu {
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .mobile-menu .nav-link {
    padding: 1.2rem 0;
    font-size: 1.8rem;
    -webkit-tap-highlight-color: rgba(37, 99, 235, 0.1); /* Light blue highlight on tap */
  }
  
  /* Improve tap feedback on mobile */
  .mobile-menu .nav-link:active {
    color: #2563eb;
    transform: scale(0.98); /* Slight scale effect for feedback */
    transition: transform 0.1s ease;
  }
}
</style>