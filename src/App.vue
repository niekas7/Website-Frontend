<template>
  <div class="video-container">
    <video autoplay loop muted playsinline class="video-background">
      <source src="./assets/Stars.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
    <div class="content">
      <h1 class="text-white text-4xl font-bold">Welcome to My Vue App</h1>
    </div>
  </div>
</template>

<script setup>
// You can add any setup logic here if needed
</script>

<style scoped>
.video-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

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

.content {
  position: relative;
  z-index: 10;
  color: white;
  text-align: center; /* Center text for better mobile display */
}

h1 {
  font-size: 8vw; /* Use viewport width units for responsive font size */
  font-weight: bold;
  margin: 0;
  padding: 0 5%; /* Add padding to prevent text from touching edges */
}

/* Optional: Adjust font size for smaller screens */
@media (max-width: 768px) {
  h1 {
    font-size: 10vw; /* Increase font size for smaller screens */
  }
}
</style>