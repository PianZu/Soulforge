import Phaser from 'phaser';
import { Player } from '../entities/Player';

type PauseMenuCallbacks = {
  onResume: () => void;
  onRestart: () => void;
};

export class GameUI {
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreBg!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private pausePanel!: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private player: Player;
  private callbacks: PauseMenuCallbacks;
  private readonly resizeHandler: (gameSize: Phaser.Structs.Size) => void;

  constructor(scene: Phaser.Scene, player: Player, callbacks: PauseMenuCallbacks) {
    this.scene = scene;
    this.player = player;
    this.callbacks = callbacks;

    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layoutHud(gameSize.width);
    };
    this.scene.scale.on('resize', this.resizeHandler);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off('resize', this.resizeHandler);
    });

    // Create score text first (includes healthText)
    this.createScoreText();
    // Then create health bar
    this.createHealthBar();
    this.createLivesDisplay();
    // Update health after everything is initialized
    this.updateHealth(this.player.getHealth());
    this.createInstructions();
    this.layoutHud();
  }

  private createHealthBar() {
    const barX = 16;
    const barY = 70;
    const barW = 240;
    const barH = 26;
    const hudDepth = 2000;

    // Sichtbarer Rahmen + Hintergrund (damit die Leiste immer erkennbar ist)
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.setDepth(hudDepth);
    this.healthBarBg.fillStyle(0x1a1a1a, 0.95);
    this.healthBarBg.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    this.healthBarBg.lineStyle(3, 0xffffff, 1);
    this.healthBarBg.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    this.healthBar = this.scene.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(hudDepth + 1);

    this.healthText = this.scene.add.text(barX + barW / 2, barY - 22, '100 / 100', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.healthText.setOrigin(0.5, 0);
    this.healthText.setScrollFactor(0);
    this.healthText.setDepth(hudDepth + 2);
  }

  private createScoreText() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const hudDepth = 2000;
    this.scoreBg = this.scene.add.rectangle(cx, 50, 300, 75, 0x1a1a1a, 0.95);
    this.scoreBg.setStrokeStyle(3, 0xffffff, 1);
    this.scoreBg.setScrollFactor(0);
    this.scoreBg.setDepth(hudDepth);

    this.scoreText = this.scene.add.text(cx, 18, 'Score: 0', {
      fontSize: '34px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    });
    this.scoreText.setOrigin(0.5, 0);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(hudDepth + 1);

    this.waveText = this.scene.add.text(cx, 58, 'Wave 1', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.waveText.setOrigin(0.5, 0);
    this.waveText.setScrollFactor(0);
    this.waveText.setDepth(hudDepth + 1);
  }

  private createLivesDisplay() {
    const hudDepth = 2000;
    const livesBg = this.scene.add.rectangle(70, 28, 140, 36, 0x1a1a1a, 0.95);
    livesBg.setStrokeStyle(3, 0xff4444, 1);
    livesBg.setScrollFactor(0);
    livesBg.setDepth(hudDepth);

    this.livesText = this.scene.add.text(70, 14, 'Leben: ❤❤❤', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.livesText.setOrigin(0.5, 0);
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(hudDepth + 1);
  }

  private createInstructions() {
    this.instructionsText = this.scene.add.text(10, 102, 'WASD: Bewegen | Klick/LEER: Angriff | SHIFT: Ausweichen', {
      fontSize: '16px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    });
    this.instructionsText.setScrollFactor(0);
    
    // Hide instructions after 5 seconds
    this.scene.time.delayedCall(5000, () => {
      this.scene.tweens.add({
        targets: this.instructionsText,
        alpha: 0,
        duration: 1000
      });
    });
  }

  updateHealth(health: number) {
    const maxHealth = this.player.getMaxHealth();
    const healthPercent = Math.max(0, health / maxHealth);
    const barX = 16;
    const barY = 70;
    const barW = 240;
    const barH = 26;

    this.healthBar.clear();
    let color = 0x00cc00;
    if (healthPercent < 0.3) {
      color = 0xcc0000;
    } else if (healthPercent < 0.6) {
      color = 0xcccc00;
    }
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(barX, barY, barW * healthPercent, barH);

    if (this.healthText) {
      this.healthText.setText(`${Math.ceil(health)} / ${maxHealth}`);
    }
  }

  updateScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
  }

  updateWave(wave: number) {
    if (this.waveText) {
      this.waveText.setText(`Wave ${wave}`);
    }
  }

  updateLives(lives: number) {
    if (this.livesText) {
      const hearts = lives > 0 ? '❤'.repeat(lives) : '✖';
      this.livesText.setText(`Leben: ${hearts}`);
    }
  }

  private layoutHud(viewWidth?: number) {
    const w = viewWidth && viewWidth > 0
      ? viewWidth
      : this.scene.scale.width || this.scene.cameras.main.width;
    const cx = w / 2;

    if (this.scoreBg) {
      this.scoreBg.setX(cx);
    }
    if (this.scoreText) {
      this.scoreText.setX(cx);
      this.scoreText.setY(18);
    }
    if (this.waveText) {
      this.waveText.setX(cx);
      this.waveText.setY(58);
    }
  }

  showGameOver(finalScore: number) {
    // Create semi-transparent background
    const bg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    );
    bg.setScrollFactor(0);
    bg.setDepth(3000);

    // Game Over text
    const gameOverText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 50,
      'GAME OVER',
      {
        fontSize: '48px',
        color: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(3000);

    // Final score
    const scoreText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      `Final Score: ${finalScore}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    );
    scoreText.setOrigin(0.5);
    scoreText.setScrollFactor(0);
    scoreText.setDepth(3000);

    // Restart button
    const restartText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 60,
      'Press R to Restart',
      {
        fontSize: '24px',
        color: '#4a9eff',
        fontFamily: 'Arial'
      }
    );
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);
    restartText.setDepth(3000);

    const goContainer = this.scene.add.container(0, 0, [bg, gameOverText, scoreText, restartText]);
    goContainer.setDepth(3000);
  }

  showPauseMenu(currentScore: number) {
    // Don't show if already showing
    if (this.pausePanel) {
      return;
    }

    // Create semi-transparent background
    const bg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.8
    );
    bg.setScrollFactor(0);

    // Pause text
    const pauseText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 100,
      'PAUSIERT',
      {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    pauseText.setOrigin(0.5);
    pauseText.setScrollFactor(0);

    // Current score
    const scoreText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 30,
      `Score: ${currentScore}`,
      {
        fontSize: '32px',
        color: '#4a9eff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    scoreText.setOrigin(0.5);
    scoreText.setScrollFactor(0);

    // Continue button
    const continueButton = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 40,
      250,
      60,
      0x4a9eff,
      0.8
    );
    continueButton.setStrokeStyle(3, 0xffffff, 1);
    continueButton.setInteractive({ useHandCursor: true });
    continueButton.setScrollFactor(0);

    const continueText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 40,
      'Fortsetzen',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    continueText.setOrigin(0.5);
    continueText.setScrollFactor(0);

    // Hover effects for continue button
    continueButton.on('pointerover', () => {
      continueButton.setFillStyle(0x4a9eff, 1);
      continueButton.setScale(1.1);
      continueText.setScale(1.1);
    });

    continueButton.on('pointerout', () => {
      continueButton.setFillStyle(0x4a9eff, 0.8);
      continueButton.setScale(1);
      continueText.setScale(1);
    });

    continueButton.on('pointerdown', () => {
      this.callbacks.onResume();
    });

    // Restart button
    const restartButton = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 120,
      250,
      60,
      0xff4444,
      0.8
    );
    restartButton.setStrokeStyle(3, 0xffffff, 1);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.setScrollFactor(0);

    const restartText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 120,
      'Neustart',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }
    );
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);

    // Hover effects for restart button
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0xff4444, 1);
      restartButton.setScale(1.1);
      restartText.setScale(1.1);
    });

    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0xff4444, 0.8);
      restartButton.setScale(1);
      restartText.setScale(1);
    });

    restartButton.on('pointerdown', () => {
      this.callbacks.onRestart();
    });

    // Instruction text
    const instructionText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 200,
      'ESC: Pause/Unpause',
      {
        fontSize: '18px',
        color: '#aaaaaa',
        fontFamily: 'Arial'
      }
    );
    instructionText.setOrigin(0.5);
    instructionText.setScrollFactor(0);

    this.pausePanel = this.scene.add.container(0, 0, [
      bg,
      pauseText,
      scoreText,
      continueButton,
      continueText,
      restartButton,
      restartText,
      instructionText
    ]);
    this.pausePanel.setDepth(3000);
  }

  hidePauseMenu() {
    if (this.pausePanel) {
      this.pausePanel.destroy();
      this.pausePanel = null as any;
    }
  }
}

