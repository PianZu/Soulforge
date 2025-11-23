import { useEffect, useRef } from 'react'
import { Game } from './game/Game'
import './App.css'

function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      gameRef.current = new Game();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div id="game-container" ref={gameContainerRef}></div>
    </div>
  )
}

export default App
