<template>
  <div class="whole-page">
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
            <img src="/canfusion_logo.svg" alt="Logo" class="logo" />
            <span class="brand-name">CanFusion</span>
          </div>

          <nav class="desktop-nav">
            <a href="#mission" class="nav-link" @click="(e) => handleNavClick(e, '#mission')">Misija</a>
            <a href="#bio-section" class="nav-link" @click="(e) => handleNavClick(e, '#bio-section')">Apie mus</a>
            <router-link to="/grafikai" class="nav-link">Grafikai</router-link>
            <router-link to="/track" class="nav-link">Žemėlapis</router-link>
            <router-link to="/3d" class="nav-link">3D Modelis</router-link>
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
          <a href="#mission" class="nav-link" @click="closeMenu">Misija</a>
          <a href="#bio-section" class="nav-link" @click="closeMenu">Apie mus</a>
          <router-link to="/grafikai" class="nav-link" @click="closeMenu">Grafikai</router-link>
          <router-link to="/track" class="nav-link" @click="closeMenu">Žemėlapis</router-link>
          <router-link to="/3d" class="nav-link" @click="closeMenu">3D Modelis</router-link>
        </div>
      </transition>

      <!-- Main content -->
      <div class="content-wrapper">
        <!-- Hero section with star background -->
        <section id="hero" class="hero">
          <div class="hero-content">
            <div class="hero-title">
              <span>Can</span>
              <img src="/canfusion_logo.svg" alt="Logo" class="hero-logo" />
              <span>Fusion</span>
            </div>
            <span class="hero-subtitle">KTU inžinerijos licėjus</span>
          </div>
        </section>

        <!-- Mission section now inside app-container -->
        <section id="mission" class="mission-section">
          <div class="mission-container">
            <h2 class="section-title">Misija</h2>
            <div class="mission-content">
              <p class="mission-text">
                Mūsų projekto tikslas yra sukurti inovatyvų CanSat palydovą, kuris ne tik atitiktų visus konkurso reikalavimus, 
                bet ir leistų atlikti mokslinius tyrimus atmosferoje. Siekiame tobulinti savo inžinerines žinias, 
                komandinio darbo įgūdžius ir prisidėti prie kosmoso technologijų plėtros Lietuvoje.
              </p>
              <p class="mission-text" style="margin-top: 1rem;">
                Pagrindinė misija – įkvepti kūrybiškumą ir asmeninį tobulėjimą, suteikiant galimybę komandai atrasti 
                naujus sprendimus, įgyvendinti inovacijas ir augti kartu per praktinius inžinerijos iššūkius.
              </p>
            </div>
          </div>
        </section>

        <!-- Bio section now inside app-container -->
        <div id="bio-section" class="bio-container">
          <div class="bio1">
            <div class="bio-content">
              <div class="bio-left">
                <div class="name-container">
                  <div class="name" @click="toggleBio">Dominykas</div>
                  <button class="bio-toggle" @click="toggleBio" :class="{ 'open': bioOpen }">
                    <span class="arrow"></span>
                  </button>
                </div>
                <div class="bio-text" :class="{ 'visible': bioOpen }">
                  Sveiki! Aš esu Dominykas, CanFusion komandos narys atsakingas už mechanikos, konstravimo ir visų techninių detalių įgyvendinimą CanSat projekte. Mano pagrindinės atsakomybės apima sistemų projektavimą, komponentų paiešką bei gamybą, techninius skaičiavimus, praktinius testavimus, taip pat viso proceso vykdymo sklandumą ir optimizavimą.<br><br>
                  Be to, rūpinuosi, kad mūsų projekto žinia pasiektų platesnę auditoriją – prisidedu prie viešosios projekto sklaidos ir pristatymo. Man svarbu, kad kiekvienas žingsnis būtų atliktas efektyviai ir inovatyviai, siekdamas maksimaliai kokybiško rezultato, todėl bandau komandoje diegti efektyvumą bei komandos tarpusavio darba gerinančius įrankius.
                </div>
              </div>
              <div class="bio-right">
                <img src="/Dominykas.png" alt="Dominykas" class="bio-image" />
              </div>
            </div>
          </div>
          
          <div class="bio2">
            <div class="bio-content">
              <div class="bio-right">
                <img src="/Kipras.png" alt="Kipras" class="bio-image" />
              </div>
              <div class="bio-left">
                <div class="name-container">
                  <div class="name" @click="toggleBio2">Kipras</div>
                  <button class="bio-toggle" @click="toggleBio2" :class="{ 'open': bio2Open }">
                    <span class="arrow"></span>
                  </button>
                </div>
                <div class="bio-text" :class="{ 'visible': bio2Open }">
                  Sveiki! Aš esu Kipras, CanFusion komandos narys, atsakingas už elektroniką ir pagrindinį ryšio tiltą tarp CanSat ir žemės stoties – ESP32 modulį. Mano darbas apima elektroninių schemų kūrimą, komponentų parinkimą, litavimą ir integraciją į CanSat konstrukciją. Taip pat rūpinuosi, kad ESP32 patikimai perduotų duomenis į žemės stotį naudojant LoRa ryšio modulį.<br><br>
                  Nors sudėtingi skaičiavimai ir skrydžio sprendimai vykdomi žemės stotyje, mano atsakomybė – užtikrinti stabilų ir patikimą duomenų srautą iš CanSat į ją. Dirbu tam, kad visa elektronika veiktų tiksliai, o ryšys išliktų stiprus net sudėtingomis sąlygomis. Mano tikslas – sukurti efektyvią ir patikimą elektroninę aplinką CanSat sėkmei.
                </div>
              </div>
            </div>
          </div>
          
          <div class="bio3">
            <div class="bio-content">
              <div class="bio-left">
                <div class="name-container">
                  <div class="name" @click="toggleBio3">Emilis</div>
                  <button class="bio-toggle" @click="toggleBio3" :class="{ 'open': bio3Open }">
                    <span class="arrow"></span>
                  </button>
                </div>
                <div class="bio-text" :class="{ 'visible': bio3Open }">
                  Sveiki! Aš esu Emilis, CanFusion komandos narys, prisidedantis prie mechanikos inžinerijos, idėjų generavimo ir bendro projekto sklandumo. Mano pareigos yra glaudžiai susijusios su Dominyko veikla – dėl panašių interesų ir įgūdžių mes efektyviai bendradarbiaujame, kad užduotys būtų įgyvendinamos greitai ir kokybiškai.<br><br>
                  Taip pat aktyviai prisidedu prie projekto ir komandos viešinimo, kad mūsų veikla pasiektų kuo platesnę auditoriją. Esu visada pasirengęs padėti kitiems komandos nariams, kai reikia papildomų rankų ar šviežių idėjų, siekdamas užtikrinti sklandų darbų eigą ir gerą komandinę atmosferą.
                </div>
              </div>
              <div class="bio-right">
                <img src="/Emilis.png" alt="Emilis" class="bio-image" />
              </div>
            </div>
          </div>
          
          <div class="bio4">
            <div class="bio-content">
              <div class="bio-right">
                <img src="/Kristupas.png" alt="Kristupas" class="bio-image" />
              </div>
              <div class="bio-left">
                <div class="name-container">
                  <div class="name" @click="toggleBio4">Kristupas</div>
                  <button class="bio-toggle" @click="toggleBio4" :class="{ 'open': bio4Open }">
                    <span class="arrow"></span>
                  </button>
                </div>
                <div class="bio-text" :class="{ 'visible': bio4Open }">
                  Sveiki! Aš esu Kristupas, CanFusion komandos narys, atsakingas už CanSat projekto elektronikos dalį. Mano pagrindinės atsakomybės apima tinkamiausių elektronikos komponentų atranką, jų kainų analizę ir bendro biudžeto planavimą, taip pat atsakingai rūpinuosi visų vidinių elektronikos mazgų litavimu bei jų patikimu veikimu.<br><br>
                  Užtikrinu, kad visa elektroninė sistema veiktų sklandžiai ir būtų techniškai pasiruošusi išbandymams bei paleidimui. Mano tikslas – užtikrinti kokybę, tikslumą ir patikimumą kiekviename etape, todėl nuolat siekiu geriausių sprendimų ir glaudaus bendradarbiavimo su komanda.
                </div>
              </div>
            </div>
          </div>
          
          <div class="bio5">
            <div class="bio-content">
              <div class="bio-left">
                <div class="name-container">
                  <div class="name" @click="toggleBio5">Domantas</div>
                  <button class="bio-toggle" @click="toggleBio5" :class="{ 'open': bio5Open }">
                    <span class="arrow"></span>
                  </button>
                </div>
                <div class="bio-text" :class="{ 'visible': bio5Open }">
                  Sveiki! Aš esu Domantas, CanFusion komandos pagrindinis programuotojas, atsakingas už šio tinklalapio kūrimą ir CanSat valdymą iš projekto serverio. Mano darbas apima tinklalapio architektūros projektavimą, funkcionalumo kūrimą ir realaus laiko duomenų apdorojimą iš CanSat palydovo.<br><br>
                  Užtikrinu, kad tinklalapis būtų ne tik informatyvus ir vizualiai patrauklus, bet ir funkcionalus kaip valdymo centras, kuriame galima stebėti CanSat parametrus realiu laiku. Taip pat kuriu tvirtą serverio infrastruktūrą, kuri patikimai priima, apdoroja ir perduoda duomenis iš CanSat, užtikrindamas sklandų viso projekto darbą technologiniame lygmenyje.
                </div>
              </div>
              <div class="bio-right">
                <img src="/Domantas.png" alt="Domantas" class="bio-image" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const menuOpen = ref(false);
const bioOpen = ref(false);
const bio2Open = ref(false);
const bio3Open = ref(false);
const bio4Open = ref(false);
const bio5Open = ref(false);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const toggleBio = () => {
  bioOpen.value = !bioOpen.value;
};

const toggleBio2 = () => {
  bio2Open.value = !bio2Open.value;
};

const toggleBio3 = () => {
  bio3Open.value = !bio3Open.value;
};

const toggleBio4 = () => {
  bio4Open.value = !bio4Open.value;
};

const toggleBio5 = () => {
  bio5Open.value = !bio5Open.value;
};

const closeMenu = () => {
  menuOpen.value = false;
  // Updated scrolling behavior
  const hash = window.location.hash;
  if (hash) {
    setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }
};

// Add new function for handling navigation clicks
const handleNavClick = (event, targetId) => {
  event.preventDefault();
  const target = document.querySelector(targetId);
  if (target) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
};
</script>

<style>
/* Import Orbitron font */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
/* Import News Gothic font (or alternative if unavailable) */
@import url('https://fonts.googleapis.com/css2?family=News+Cycle:wght@400;700&display=swap');

/* =============================================
   COMMON BASE STYLES (APPLIES TO ALL SCREENS)
   ============================================= */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #0f172a
}

html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: visible;
  height: auto;
  width: 100%;
}

.whole-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

.app-container {
  font-family: 'Orbitron', sans-serif;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.content-wrapper {
  width: 100%;
  position: relative;
  z-index: 1;
  overflow: visible;
}

.background-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;      /* Use viewport width */
  height: 100vh;     /* Use viewport height */
  min-width: 100vw;
  min-height: 100vh;
  object-fit: cover;
  z-index: -1;
  pointer-events: none;
  touch-action: none;
  user-select: none;
}

/* Header (common across all screen sizes) */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  background-color: transparent;
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

/* Navigation base styles */
.nav-link {
  color: white;
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

/* Hero section base styles */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  position: relative;
  z-index: 2;
  overflow: hidden; /* Prevent content from overflowing */
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  width: 100%;
  padding: 0 1rem;
}

.hero-title {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  color: white;
  font-size: clamp(2rem, 5vw, 3rem); /* Responsive font size with clamp */
  animation: fadeIn 1s ease-in-out;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  width: 100%;
}

.hero-title span {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-shadow: none;
  -webkit-text-stroke: 0;
  white-space: nowrap;
}

.hero-logo {
  height: clamp(3rem, 8vw, 4.5rem); /* Responsive logo size */
  width: auto;
  animation: fadeIn 1s ease-in-out;
  min-width: 0;
}

.hero-subtitle {
  color: white;
  font-size: clamp(1.2rem, 3.5vw, 1.8rem); /* Responsive font size with clamp */
  font-family: 'News Gothic', 'News Cycle', sans-serif;
  animation: fadeIn 1s ease-in-out;
  white-space: nowrap; /* Prevent text from wrapping */
}

/* Team introduction base styles */
.team-intro {
  min-height: 100vh;
  background-color: #0f172a;
  color: white;
  padding: 6rem 1rem 3rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background-color: rgba(30, 41, 59, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 3;
}

/* Bio container styles */
.bio-container {
  background-color: transparent;
  padding: 3rem;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  flex-wrap: wrap;
  width: 100%;
  gap: 3rem;
}

.bio1, .bio2, .bio3, .bio4, .bio5 {
  width: 100%;
  max-width: 900px;
  height: auto;
  background-color: rgba(30, 41, 59, 0.8);
  border-radius: 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
}

.bio1 {
  margin-left: 0;
}

.bio2 {
  margin-right: 0;
  margin-left: auto;
}

.bio3 {
  margin-left: 0;
  margin-right: auto;
}

.bio4 {
  margin-right: 0;
  margin-left: auto;
}

.bio5 {
  margin-left: 0;
  margin-right: auto;
}

.bio-content {
  display: flex;
  gap: 1.5rem;
}

.bio-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bio-right {
  flex: 0 0 35%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.bio-image {
  width: 100%;
  max-width: 300px;
  height: auto;
  border-radius: 20px;
  object-fit: cover;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.name-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 0.5rem;
}

.name {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 1.8rem;
  color: #2563eb;
  border-bottom: none;
  padding-bottom: 0;
}

.bio-toggle {
  background: none;
  border: none;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  position: relative;
  display: none; /* Hide by default for all devices */
  align-items: center;
  justify-content: center;
  margin-left: 1rem; /* Add spacing from the name */
}

.arrow {
  display: block;
  width: 0.8rem;
  height: 0.8rem;
  border-right: 2px solid #2563eb;
  border-bottom: 2px solid #2563eb;
  transform: rotate(-45deg);
  transition: transform 0.3s ease;
  position: relative;
  right: 0.2rem; /* Slight adjustment to center the arrow in its container */
}

.bio-toggle.open .arrow {
  transform: rotate(45deg);
}

.bio-text {
  color: white;
  font-family: 'News Gothic', 'News Cycle', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  margin-top: 1rem;
  text-align: justify;
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: normal;
  white-space: normal;
}

/* =============================================
   1. LARGE SCREENS (DESKTOPS)
   ============================================= */
@media (min-width: 1223px) {
  /* Desktop-specific hero styles */
  .hero-title {
    font-size: 5rem;
  }
  
  .hero-logo {
    height: 8rem;
  }
  
  .hero-subtitle {
    font-size: 3rem;
  }
  
  .hero-title span {
    font-weight: 700;
    -webkit-text-stroke: 0;
  }
  
  /* Desktop-specific navigation */
  .desktop-nav {
    display: flex;
    gap: 2.5rem;
  }
  
  .menu-toggle {
    display: none;
  }
}

/* =============================================
   2. PHONES (MOBILE)
   ============================================= */
@media (max-width: 1222px) {
  /* Mobile header */
  .header-inner {
    padding: 0 1rem;
  }
  
  .brand-name {
    font-size: 1.6rem;
  }
  
  /* Mobile navigation */
  .desktop-nav {
    display: none !important; /* Force hide on mobile */
  }
  
  .menu-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    display: flex !important; /* Force display on mobile */
    align-items: center;
    justify-content: center;
    z-index: 20; /* Ensure it's above other elements */
    position: absolute; /* Position it absolutely */
    right: 1rem; /* Position from right edge */
  }
  
  .menu-toggle svg {
    width: 2rem;
    height: 2rem;
    color: white;
    fill: none; /* Ensure the SVG has no fill */
    stroke: white; /* Set the stroke color explicitly */
  }
  
  .mobile-menu {
    position: fixed;
    top: 5rem;
    left: 0;
    width: 100%;
    background: rgba(15, 23, 42, 0.9);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 9;
  }
  
  .mobile-menu .nav-link {
    padding: 1.2rem 0;
    font-size: 1.8rem;
    -webkit-tap-highlight-color: rgba(37, 99, 235, 0.1);
  }
  
  /* Mobile tap feedback */
  .mobile-menu .nav-link:active {
    color: #2563eb;
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
  
  /* Mobile hero adjustments - replace scaling with fluid sizing */
  .hero-title {
    font-size: clamp(3rem, 10vw, 4rem);
    gap: 0.4rem;
  }
  
  .hero-logo {
    height: clamp(5rem, 12vw, 6rem);
  }
  
  .hero-subtitle {
    font-size: clamp(2rem, 7vw, 2.5rem);
    margin-top: 0.5rem;
  }
  
  /* Center bio card on mobile */
  .bio-container {
    justify-content: center;
    align-items: center;
  }
  
  .bio1, .bio2, .bio3, .bio4, .bio5 {
    margin-left: 0; /* Remove left margin on mobile */
  }
  
  /* Mobile bio styles - show toggle and hide text by default */
  .bio-content {
    flex-direction: column-reverse;
  }
  
  .bio-right {
    flex: 0 0 auto;
    margin-bottom: 1.5rem;
  }
  
  .bio-image {
    max-height: 250px; /* Limit image height on mobile */
    width: 100%;
    object-fit: cover;
  }
  
  .bio1, .bio2, .bio3, .bio4, .bio5 {
    margin: 1rem auto;
  }

  .bio-text {
    font-size: 1rem;
    line-height: 1.5;
    padding: 0 0.5rem;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.5s ease, margin 0.3s ease;
    margin-top: 0;
    text-align: left; /* Left align on mobile for better readability */
    hyphens: auto; /* Enable hyphenation for better text wrapping */
    overflow-wrap: break-word;
    word-break: normal;
  }

  .bio-text.visible {
    max-height: 2000px; /* Increase to ensure all text is shown */
    margin-top: 1rem;
    padding-bottom: 1rem; /* Add some padding at the bottom */
  }

  .bio-toggle {
    display: flex; /* Only show on mobile */
  }

  .name-container {
    align-items: center;
    padding-right: 0.5rem; /* Ensure there's space on the right side */
  }
  
  .name {
    font-size: 1.8rem; /* Slightly smaller on mobile */
    cursor: pointer; /* Show pointer cursor to indicate clickability */
  }
}

/* Keep extra small screen styles */
@media (max-width: 360px) {
  .hero-title {
    font-size: clamp(2.5rem, 9vw, 3.5rem);
    gap: 0.3rem;
  }
  
  .hero-logo {
    height: clamp(4rem, 11vw, 5rem);
  }
  
  .hero-subtitle {
    font-size: clamp(1.8rem, 6vw, 2.2rem);
  }
}

/* =============================================
   3. TABLETS
   ============================================= */
/* Tablet-specific styles (768px-1023px) */
@media (min-width: 768px) and (max-width: 1222px) {
  .header-inner {
    padding: 0 1rem;
  }
  
  .brand-name {
    font-size: 1.5rem;
  }
  
  .logo {
    height: 2.8rem;
  }
  
  /* Hide desktop nav on tablets too */
  .desktop-nav {
    display: none !important;
  }
  
  /* Show menu toggle on tablets */
  .menu-toggle {
    display: flex !important;
    position: absolute;
    right: 1rem;
  }
  
  /* Adjust nav links for tablets that still show them */
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

/* =============================================
   4. ANIMATIONS
   ============================================= */
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

/* Mission section styles */
.mission-section {
  min-height: 100vh;
  width: 100%;
  padding: 6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: transparent;
  z-index: 2;
}

.mission-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem;
  background-color: rgba(30, 41, 59, 0.8);
  border-radius: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.section-title {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 3rem;
  color: #2563eb;
  margin-bottom: 2rem;
  letter-spacing: 0.05em;
}

.mission-content {
  width: 100%;
}

.mission-text {
  color: white;
  font-family: 'News Gothic', 'News Cycle', sans-serif;
  font-size: 1.2rem;
  line-height: 1.8;
  text-align: justify;
}

/* Mobile styles for mission section */
@media (max-width: 767px) {
  .mission-section {
    padding: 5rem 1rem;
  }
  
  .mission-container {
    padding: 2rem 1.5rem;
  }
  
  .section-title {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
  }
  
  .mission-text {
    font-size: 1.1rem;
    line-height: 1.6;
  }
}
</style>