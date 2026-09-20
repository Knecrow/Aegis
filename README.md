# Aegis

A browser-based JARVIS-style HUD built with vanilla JavaScript and the Google Gemini API. 

It lets you talk to an AI assistant directly from your browser, speaks back to you, and visualizes audio on an interactive particle canvas.

[Try the live demo](https://knecrow.github.io/Aegis/)

## What it does
- Voice conversations powered by Google Gemini
- Speaks responses aloud using browser speech synthesis
- Visualizes sound waves in real time using the Web Audio API
- Interactive background particle effect that reacts to your mouse
- Works completely in the browser without complex dependencies

## Built with
- JavaScript (ES6)
- Google Gemini Pro API
- Web Audio API & Web Speech API
- HTML5 Canvas & CSS3

## How to run it
1. Clone the repo:
   ```bash
   git clone https://github.com/Knecrow/Aegis.git
   cd Aegis
   ```

2. Add your Gemini API key in `js/config.js`:
   ```javascript
   const GEMINI_API_KEY = "your-key-here";
   ```

3. Run a local server:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

## License
MIT
