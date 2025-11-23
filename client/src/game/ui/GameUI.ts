import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class GameUI {
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private pausePanel!: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Create score text first (includes healthText)
    this.createScoreText();
    // Then create health bar
    this.createHealthBar();
    // Update health after everything is initialized
    this.updateHealth(this.player.getHealth());
    this.createInstructions();
  }

  private createHealthBar() {
    // Background
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(10, 10, 200, 20);

    // Health bar
    this.healthBar = this.scene.add.graphics();
    this.healthBar.setScrollFactor(0);
  }

  private createScoreText() {
    this.scoreText = this.scene.add.text(10, 40, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreText.setScrollFactor(0);

    // Health text
    this.healthText = this.scene.add.text(220, 12, '100/100', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    this.healthText.setScrollFactor(0);
  }

  private createInstructions() {
    this.instructionsText = this.scene.add.text(10, 70, 'WASD/Arrow Keys: Move | Left Click/SPACE: Attack', {
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
    const healthPercent = health / maxHealth;

    this.healthBar.clear();
    
    // Health color (green to red)
    let color = 0x00ff00; // Green
    if (healthPercent < 0.3) {
      color = 0xff0000; // Red
    } else if (healthPercent < 0.6) {
      color = 0xffff00; // Yellow
    }

    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(12, 12, 196 * healthPercent, 16);

    // Update health text (only if it exists)
    if (this.healthText) {
      this.healthText.setText(`${Math.ceil(health)}/${maxHealth}`);
    }
  }

  updateScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
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

    this.gameOverPanel = this.scene.add.container(0, 0, [bg, gameOverText, scoreText, restartText]);
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
      this.hidePauseMenu();
      this.scene.scene.resume();
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
      this.scene.scene.start('WeaponSelectionScene');
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
  }

  hidePauseMenu() {
    if (this.pausePanel) {
      this.pausePanel.destroy();
      this.pausePanel = null as any;
    }
  }
}

