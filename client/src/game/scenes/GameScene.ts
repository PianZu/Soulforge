import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DungeonGenerator } from '../utils/DungeonGenerator';
import { Enemy, type EnemyVariant } from '../entities/Enemy';
import { GameUI } from '../ui/GameUI';
import type { WeaponType } from './WeaponSelectionScene';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private dungeonGenerator!: DungeonGenerator;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private spawnX: number = 0;
  private spawnY: number = 0;
  private deathHandled: boolean = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private gameUI!: GameUI;
  private score: number = 0;
  private currentWave: number = 1;
  private enemiesInCurrentWave: number = 0;
  private killsThisWave: number = 0;
  private pendingWaveTimer?: Phaser.Time.TimerEvent;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private weaponType: WeaponType = 'sword';
  private isPaused: boolean = false;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private dodgeKey!: Phaser.Input.Keyboard.Key;
  private waveBanner?: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private restartKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { weaponType?: WeaponType }) {
    if (data && data.weaponType) {
      this.weaponType = data.weaponType;
    }
  }

  create() {
    this.gameOver = false;
    this.deathHandled = false;
    this.currentWave = 1;
    this.enemiesInCurrentWave = 0;
    this.killsThisWave = 0;

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

    // Tileset texture for collision (wall=0, floor=1) – used only for physics
    if (!this.textures.exists('dungeon-tiles')) {
      const g = this.add.graphics();
      g.fillStyle(0x2a2a2a);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x555555);
      g.fillRect(32, 0, 32, 32);
      g.generateTexture('dungeon-tiles', 64, 32);
      g.destroy();
    }

    const map = this.make.tilemap({
      data: dungeon,
      tileWidth: 32,
      tileHeight: 32
    });
    const tileset = map.addTilesetImage('dungeon-tiles')!;
    this.wallLayer = map.createLayer(0, tileset, 0, 0)!;
    this.wallLayer.setCollision(0, true); // only wall tiles (index 0) collide
    this.wallLayer.setVisible(false); // visuals drawn below

    // Physics world bounds = dungeon size (no leaving the map)
    this.physics.world.setBounds(0, 0, 50 * 32, 50 * 32);

    // Create graphics for dungeon visualization (visual only)
    const floorGraphics = this.add.graphics();
    const wallGraphics = this.add.graphics();

    dungeon.forEach((row, y) => {
      row.forEach((cell, x) => {
        const worldX = x * 32;
        const worldY = y * 32;

        if (cell === 0) {
          wallGraphics.fillStyle(0x2a2a2a);
          wallGraphics.fillRect(worldX, worldY, 32, 32);
          wallGraphics.fillStyle(0x3a3a3a);
          wallGraphics.fillRect(worldX, worldY, 32, 2);
          wallGraphics.fillRect(worldX, worldY, 2, 32);
        } else {
          floorGraphics.fillStyle(0x555555);
          floorGraphics.fillRect(worldX, worldY, 32, 32);
          floorGraphics.lineStyle(1, 0x444444, 0.3);
          floorGraphics.strokeRect(worldX, worldY, 32, 32);
        }
      });
    });

    // Find spawn position (first floor tile)
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        if (dungeon[y][x] === 1) {
          this.spawnX = x * 32 + 16;
          this.spawnY = y * 32 + 16;
          break;
        }
      }
      if (this.spawnX > 0) break;
    }

    // Create player with selected weapon
    this.player = new Player(this, this.spawnX, this.spawnY, this.weaponType);
    
    this.physics.add.collider(this.player, this.wallLayer);

    // Setup camera
    this.cameras.main.setBounds(0, 0, 50 * 32, 50 * 32);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.5);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.input.keyboard!.addKeys('W,S,A,D') as any;
    this.escapeKey = this.input.keyboard!.addKey('ESC');
    this.dodgeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Escape key for pause/unpause
    this.escapeKey.on('down', () => {
      if (this.gameOver || this.player.isDead()) return;
      if (this.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    });

    // Create UI
    this.gameUI = new GameUI(this, this.player, {
      onResume: () => this.resumeGame(),
      onRestart: () => {
        if (this.isPaused) {
          this.resumeGame();
        }
        this.scene.start('WeaponSelectionScene');
      }
    });
    
    // Initialize score and lives display
    this.gameUI.updateScore(this.score);
    this.gameUI.updateLives(this.player.getLives());

    this.setupEnemyProjectiles();
    this.startWave();

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
    // Game Over: nur R für Neustart abfragen, kein document-Listener (verhindert Freeze)
    if (this.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.start('WeaponSelectionScene');
      }
      return;
    }

    if (this.isPaused) {
      this.player.setVelocity(0, 0);
      return;
    }

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

    if (Phaser.Input.Keyboard.JustDown(this.dodgeKey)) {
      this.player.tryDodge(velocityX, velocityY);
    }

    // Update player direction for sword positioning
    if (velocityX !== 0 || velocityY !== 0) {
      this.player.setDirection(velocityX, velocityY);
    }

    if (!this.player.isDodging()) {
      this.player.setVelocity(velocityX, velocityY);
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
        this.handleEnemyKilled();
        // Death particle effect
        this.createDeathEffect(enemy.x, enemy.y);
        enemy.destroy();
        return false;
      }
      return true;
    });

    this.updateEnemyProjectiles();

    // Check if player is dead: lose a life, respawn or game over
    if (this.player.isDead()) {
      if (!this.deathHandled) {
        this.deathHandled = true;
        this.player.loseLife();
        this.gameUI.updateLives(this.player.getLives());
        if (this.player.getLives() > 0) {
          this.respawnPlayer();
          this.deathHandled = false;
        } else {
          this.gameOver = true;
          this.gameUI.showGameOver(this.score);
          // Szene nicht pausieren, damit update() weiterläuft und R erkannt wird
        }
      }
    }
  }

  private respawnPlayer() {
    this.player.setFullHealth();
    // An aktueller Stelle bleiben, nicht zur Startposition
    this.player.setVelocity(0, 0);
    this.player.setInvincible(true);
    this.gameUI.updateHealth(this.player.getHealth());
    this.player.setAlpha(0.6);
    this.time.delayedCall(1500, () => {
      this.player.setAlpha(1);
      this.player.setInvincible(false);
    });
  }

  private pauseGame() {
    if (this.isPaused || this.player.isDead()) {
      return;
    }
    
    this.isPaused = true;
    this.physics.world.pause();
    if (this.pendingWaveTimer) {
      this.pendingWaveTimer.paused = true;
    }
    this.gameUI.showPauseMenu(this.score);
  }

  private resumeGame() {
    if (!this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    this.gameUI.hidePauseMenu();
    this.physics.world.resume();
    if (this.pendingWaveTimer) {
      this.pendingWaveTimer.paused = false;
    }
  }

  private startWave() {
    this.gameUI.updateWave(this.currentWave);
    this.killsThisWave = 0;
    const composition = this.getWaveComposition();
    const enemiesSpawned = this.spawnEnemies(composition);
    this.enemiesInCurrentWave = enemiesSpawned;
    this.showWaveBanner(`Wave ${this.currentWave}`);

    if (enemiesSpawned === 0) {
      this.queueNextWave();
    }
  }

  private getWaveComposition() {
    const baseEnemies = 5;
    const increment = 3;
    const total = baseEnemies + (this.currentWave - 1) * increment;
    const rangedRatio = Phaser.Math.Clamp(0.1 + this.currentWave * 0.05, 0, 0.6);
    const ranged = this.currentWave >= 2 ? Math.max(1, Math.floor(total * rangedRatio)) : 0;

    return {
      total,
      ranged: Math.min(ranged, total - 1),
      melee: total - Math.min(ranged, total - 1)
    };
  }

  private queueNextWave() {
    if (this.pendingWaveTimer) {
      return;
    }

    this.showWaveBanner('Nächste Wave in 2s');
    this.pendingWaveTimer = this.time.delayedCall(2000, () => {
      this.pendingWaveTimer = undefined;
      this.currentWave += 1;
      this.startWave();
    });
  }

  private handleEnemyKilled() {
    if (this.enemiesInCurrentWave <= 0) {
      return;
    }

    this.killsThisWave += 1;
    if (this.killsThisWave >= this.enemiesInCurrentWave) {
      this.queueNextWave();
    }
  }

  private spawnEnemies(composition: { melee: number; ranged: number }): number {
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

    const spawnQueue: EnemyVariant[] = [];
    for (let i = 0; i < composition.melee; i++) {
      spawnQueue.push('grunt');
    }
    for (let i = 0; i < composition.ranged; i++) {
      spawnQueue.push('ranged');
    }
    Phaser.Utils.Array.Shuffle(spawnQueue);

    let spawned = 0;

    // Spawn enemies
    while (spawnQueue.length > 0 && floorTiles.length > 0) {
      const variant = spawnQueue.pop()!;
      const randomTile = Phaser.Utils.Array.GetRandom(floorTiles);
      const index = floorTiles.indexOf(randomTile);
      floorTiles.splice(index, 1);

      const enemy = new Enemy(this, randomTile.x, randomTile.y, {
        variant,
        projectileGroup: this.enemyProjectiles
      });
      this.physics.add.collider(enemy, this.wallLayer);
      this.physics.add.collider(enemy, this.player, () => {
        this.player.takeDamage(10);
        this.gameUI.updateHealth(this.player.getHealth());
      });
      this.enemies.push(enemy);
      spawned += 1;
    }

    return spawned;
  }

  private setupEnemyProjectiles() {
    if (!this.textures.exists('enemy-bullet')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffd166);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('enemy-bullet', 8, 8);
      graphics.destroy();
    }

    this.enemyProjectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 75,
      runChildUpdate: false
    });

    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      (_player, projectile) => this.handlePlayerHitByProjectile(projectile as Phaser.Physics.Arcade.Image)
    );

    this.physics.add.collider(this.enemyProjectiles, this.wallLayer, (projectile) => {
      (projectile as Phaser.GameObjects.GameObject).destroy();
    });
  }

  private handlePlayerHitByProjectile(projectile: Phaser.Physics.Arcade.Image) {
    if (!projectile.active) {
      return;
    }
    projectile.destroy();
    const damage = projectile.getData('damage') ?? 10;
    this.player.takeDamage(damage);
    this.gameUI.updateHealth(this.player.getHealth());
  }

  private updateEnemyProjectiles() {
    if (!this.enemyProjectiles) {
      return;
    }

    this.enemyProjectiles.children.each(child => {
      const projectile = child as Phaser.Physics.Arcade.Image;
      if (!projectile.active) {
        return true;
      }
      const spawnTime = projectile.getData('spawnTime') ?? 0;
      if (this.time.now - spawnTime > 4000) {
        projectile.destroy();
      }
      return true;
    });
  }

  private showWaveBanner(message: string) {
    if (!this.waveBanner) {
      this.waveBanner = this.add.text(
        this.cameras.main.width / 2,
        90,
        message,
        {
          fontSize: '28px',
          color: '#ffd700',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      );
      this.waveBanner.setOrigin(0.5, 0.5);
      this.waveBanner.setScrollFactor(0);
      this.waveBanner.setDepth(980);
    } else {
      this.waveBanner.setText(message);
      this.waveBanner.setAlpha(1);
    }

    this.tweens.add({
      targets: this.waveBanner,
      alpha: 0,
      duration: 400,
      delay: 1200,
    });
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

