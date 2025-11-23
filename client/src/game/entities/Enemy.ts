import Phaser from 'phaser';
import { Player } from './Player';
import { ParticleEffects } from '../effects/ParticleEffects';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private health: number = 30;
  private maxHealth: number = 30;
  private speed: number = 80;
  private attackDamage: number = 10;
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 1000; // milliseconds
  private player!: Player;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create texture if it doesn't exist
    if (!scene.textures.exists('enemy')) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0xff4444); // Red color
      graphics.fillRect(0, 0, 20, 20);
      graphics.generateTexture('enemy', 20, 20);
      graphics.destroy();
    }
    
    super(scene, x, y, 'enemy');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Set physics body size
    this.body!.setSize(18, 18);
  }

  update(player: Player) {
    this.player = player;

    if (this.isDead()) {
      return;
    }

    // Move towards player
    const distance = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.x, player.y
    );

    if (distance > 5) {
      const angle = Phaser.Math.Angle.Between(
        this.x, this.y,
        player.x, player.y
      );

      this.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
    } else {
      this.setVelocity(0, 0);
      
      // Attack player if close enough
      const now = Date.now();
      if (now - this.attackCooldown >= this.attackCooldownTime) {
        this.attackCooldown = now;
        player.takeDamage(this.attackDamage);
      }
    }
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    
    // Visual feedback - flash white
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
  }

  getHealth(): number {
    return this.health;
  }

  isDead(): boolean {
    return this.health <= 0;
  }
}

