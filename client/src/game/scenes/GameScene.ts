import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DungeonGenerator } from '../utils/DungeonGenerator';
import { Enemy } from '../entities/Enemy';
import { GameUI } from '../ui/GameUI';
import type { WeaponType } from './WeaponSelectionScene';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private dungeonGenerator!: DungeonGenerator;
  private wallBodies: Phaser.GameObjects.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private gameUI!: GameUI;
  private score: number = 0;
  private enemySpawnTimer!: Phaser.Time.TimerEvent;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private weaponType: WeaponType = 'sword';
  private isPaused: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { weaponType?: WeaponType }) {
    if (data && data.weaponType) {
      this.weaponType = data.weaponType;
    }
  }

  create() {
    // Create particle texture if it doesn't exist
    if (!this.textures.exists('particle')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(0, 0, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }

    // Create dungeon
    this.dungeonGenerator = new DungeonGenerator(50, 50);
    const dungeon = this.dungeonGenerator.generate();

    // Create graphics for dungeon visualization with better visuals
    const floorGraphics = this.add.graphics();
    const wallGraphics = this.add.graphics();

    // Draw dungeon
    dungeon.forEach((row, y) => {
      row.forEach((cell, x) => {
        const worldX = x * 32;
        const worldY = y * 32;

        if (cell === 0) {
          // Wall - dark gray with depth effect
          wallGraphics.fillStyle(0x2a2a2a);
          wallGraphics.fillRect(worldX, worldY, 32, 32);
          // Add highlight for 3D effect
          wallGraphics.fillStyle(0x3a3a3a);
          wallGraphics.fillRect(worldX, worldY, 32, 2);
          wallGraphics.fillRect(worldX, worldY, 2, 32);
          
          // Create collision body - make it slightly smaller to avoid invisible walls
          const wallRect = this.add.rectangle(worldX + 16, worldY + 16, 30, 30, 0x333333);
          wallRect.setVisible(false); // Make it invisible but still collidable
          this.physics.add.existing(wallRect, true);
          // Set body size to match visual size
          const body = wallRect.body as Phaser.Physics.Arcade.Body;
          body.setSize(30, 30);
          this.wallBodies.push(wallRect);
        } else {
          // Floor - lighter gray with subtle pattern
          floorGraphics.fillStyle(0x555555);
          floorGraphics.fillRect(worldX, worldY, 32, 32);
          // Add subtle border for depth
          floorGraphics.lineStyle(1, 0x444444, 0.3);
          floorGraphics.strokeRect(worldX, worldY, 32, 32);
        }
      });
    });

    // Find spawn position (first floor tile)
    let spawnX = 0;
    let spawnY = 0;
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === 1) {
          spawnX = x * 32 + 16;
          spawnY = y * 32 + 16;
          break;
        }
      }
      if (spawnX > 0) break;
    }

    // Create player with selected weapon
    this.player = new Player(this, spawnX, spawnY, this.weaponType);
    
    // Add collision with walls
    this.wallBodies.forEach(wall => {
      this.physics.add.collider(this.player, wall);
    });

    // Setup camera
    this.cameras.main.setBounds(0, 0, 50 * 32, 50 * 32);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.5);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D') as any;
    this.restartKey = this.input.keyboard!.addKey('R');
    this.escapeKey = this.input.keyboard!.addKey('ESC');
    
    // Escape key for pause/unpause
    this.escapeKey.on('down', () => {
      if (this.player.isDead()) {
        return; // Don't pause if dead
      }
      
      if (this.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    });
    
    // Add DOM event listener for restart that works even when paused
    const handleRestart = (event: KeyboardEvent) => {
      if (event.key === 'r' || event.key === 'R') {
        // If player is dead (scene is paused), go back to weapon selection
        if (this.player.isDead() || this.scene.isPaused()) {
          this.scene.start('WeaponSelectionScene');
        }
      }
    };
    
    document.addEventListener('keydown', handleRestart);
    
    // Clean up listener when scene is destroyed
    this.events.on('destroy', () => {
      document.removeEventListener('keydown', handleRestart);
    });

    // Create UI
    this.gameUI = new GameUI(this, this.player);
    
    // Initialize score display
    this.gameUI.updateScore(this.score);

    // Spawn initial enemies
    this.spawnEnemies(5);

    // Setup enemy spawn timer
    this.enemySpawnTimer = this.time.addEvent({
      delay: 10000, // Spawn every 10 seconds
      callback: () => {
        this.spawnEnemies(2);
      },
      loop: true
    });

    // Setup attack input - Mouse click and Space key
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Get world position from camera
      const worldX = this.cameras.main.scrollX + pointer.x / this.cameras.main.zoom;
      const worldY = this.cameras.main.scrollY + pointer.y / this.cameras.main.zoom;
      
      // Set direction towards mouse position
      const dx = worldX - this.player.x;
      const dy = worldY - this.player.y;
      if (dx !== 0 || dy !== 0) {
        this.player.setDirection(dx, dy);
      }
      
      // Pass target position for ranged weapons
      this.player.attack(this.enemies, worldX, worldY);
    });

    // Also keep space key for attack (uses current direction)
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.player.attack(this.enemies);
    });

  }

  update() {
    // Player movement
    const speed = 150;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocityX = -speed;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocityX = speed;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocityY = -speed;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocityY = speed;
    }

    this.player.setVelocity(velocityX, velocityY);
    
    // Update player direction for sword positioning
    if (velocityX !== 0 || velocityY !== 0) {
      this.player.setDirection(velocityX, velocityY);
    }

    // Update player (updates sword position)
    this.player.update();

    // Update enemies
    this.enemies.forEach(enemy => {
      enemy.update(this.player);
    });

    // Remove dead enemies with particle effects
    this.enemies = this.enemies.filter(enemy => {
      if (enemy.isDead()) {
        this.score += 10;
        this.gameUI.updateScore(this.score);
        // Death particle effect
        this.createDeathEffect(enemy.x, enemy.y);
        enemy.destroy();
        return false;
      }
      return true;
    });

    // Check if player is dead
    if (this.player.isDead()) {
      if (!this.scene.isPaused()) {
        this.scene.pause();
        this.gameUI.showGameOver(this.score);
      }
    }
  }

  private pauseGame() {
    if (this.isPaused || this.player.isDead()) {
      return;
    }
    
    this.isPaused = true;
    this.scene.pause();
    this.gameUI.showPauseMenu(this.score);
  }

  private resumeGame() {
    if (!this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    this.gameUI.hidePauseMenu();
    this.scene.resume();
  }

  private spawnEnemies(count: number) {
    const dungeon = this.dungeonGenerator.getDungeon();
    const floorTiles: { x: number; y: number }[] = [];

    // Find all floor tiles
    dungeon.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          const worldX = x * 32 + 16;
          const worldY = y * 32 + 16;
          // Don't spawn too close to player
          const distance = Phaser.Math.Distance.Between(
            worldX, worldY,
            this.player.x, this.player.y
          );
          if (distance > 200) {
            floorTiles.push({ x: worldX, y: worldY });
          }
        }
      });
    });

    // Spawn enemies
    for (let i = 0; i < count && floorTiles.length > 0; i++) {
      const randomTile = Phaser.Utils.Array.GetRandom(floorTiles);
      const index = floorTiles.indexOf(randomTile);
      floorTiles.splice(index, 1);

      const enemy = new Enemy(this, randomTile.x, randomTile.y);
      // Add collision with walls
      this.wallBodies.forEach(wall => {
        this.physics.add.collider(enemy, wall);
      });
      this.physics.add.collider(enemy, this.player, () => {
        this.player.takeDamage(10);
        this.gameUI.updateHealth(this.player.getHealth());
      });
      this.enemies.push(enemy);
    }
  }

  private createDeathEffect(x: number, y: number) {
    // Create death particles
    const particles = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 150 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      tint: [0xff0000, 0x8b0000, 0x000000],
      blendMode: 'NORMAL',
      quantity: 20
    });
    
    // Fade out effect
    this.tweens.add({
      targets: particles,
      alpha: 0,
      duration: 500,
      onComplete: () => particles.destroy()
    });
  }
}

