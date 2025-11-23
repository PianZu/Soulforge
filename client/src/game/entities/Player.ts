import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private health: number = 100;
  private maxHealth: number = 100;
  private attackDamage: number = 25;
  private attackRange: number = 60;
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 500; // milliseconds
  private sword!: Phaser.GameObjects.Container;
  private swordBlade!: Phaser.GameObjects.Rectangle;
  private swordHilt!: Phaser.GameObjects.Rectangle;
  private isAttacking: boolean = false;
  private lastDirection: { x: number; y: number } = { x: 0, y: 1 }; // Default: down

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create texture if it doesn't exist
    if (!scene.textures.exists('player')) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0x4a9eff); // Blue color
      graphics.fillRect(0, 0, 24, 24);
      graphics.generateTexture('player', 24, 24);
      graphics.destroy();
    }
    
    super(scene, x, y, 'player');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Set physics body size
    this.body!.setSize(20, 20);
    this.body!.setCollideWorldBounds(true);

    // Create sword
    this.createSword();
  }

  private createSword() {
    // Create sword as container with rectangles
    const swordLength = 24;
    const bladeWidth = 5;
    
    // Blade
    this.swordBlade = this.scene.add.rectangle(0, -swordLength / 2, bladeWidth, swordLength, 0xcccccc);
    
    // Hilt
    this.swordHilt = this.scene.add.rectangle(0, swordLength / 2 - 2, 3, 4, 0x8b4513);
    
    // Create container
    this.sword = this.scene.add.container(0, 0, [this.swordBlade, this.swordHilt]);
    this.sword.setDepth(1); // Above player
    
    this.updateSwordPosition();
  }

  private updateSwordPosition() {
    if (!this.sword) return;

    const offset = 14; // Distance from player center

    // Calculate sword position based on last direction
    const angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    const swordX = this.x + Math.cos(angle) * offset;
    const swordY = this.y + Math.sin(angle) * offset;

    // Set position and rotation
    this.sword.x = swordX;
    this.sword.y = swordY;
    this.sword.rotation = angle;
    
    // Update sword color based on attack state
    if (this.isAttacking) {
      this.swordBlade.setFillStyle(0xffff00); // Yellow during attack
    } else {
      this.swordBlade.setFillStyle(0xcccccc); // Silver
    }
  }

  setDirection(velocityX: number, velocityY: number) {
    if (velocityX !== 0 || velocityY !== 0) {
      this.lastDirection = { x: velocityX, y: velocityY };
      this.updateSwordPosition();
    }
  }

  update() {
    // Update sword position to follow player
    this.updateSwordPosition();
  }

  destroy() {
    // Clean up sword when player is destroyed
    if (this.sword) {
      this.sword.destroy();
    }
    super.destroy();
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  attack(enemies: Enemy[]) {
    const now = Date.now();
    if (now - this.attackCooldown < this.attackCooldownTime) {
      return; // Still on cooldown
    }

    this.attackCooldown = now;
    this.isAttacking = true;
    this.updateSwordPosition();

    // Calculate attack angle based on direction
    const angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    const attackStartAngle = angle - Math.PI / 2; // 90 degrees swing for better coverage
    const attackEndAngle = angle + Math.PI / 2;

    // Sword swing animation
    const swingTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 200,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const currentAngle = attackStartAngle + (attackEndAngle - attackStartAngle) * progress;
        this.lastDirection = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };
        this.updateSwordPosition();
      },
      onComplete: () => {
        this.isAttacking = false;
        this.updateSwordPosition();
      }
    });

    // Find enemies in range during swing - kill all enemies in range
    const checkEnemies = () => {
      enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(
          this.x, this.y,
          enemy.x, enemy.y
        );

        // Kill all enemies within attack range (no angle check for easier gameplay)
        if (distance <= this.attackRange) {
          // Deal massive damage to kill enemies instantly
          enemy.takeDamage(1000);
          
          // Visual feedback
          this.scene.tweens.add({
            targets: enemy,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 1
          });
        }
      });
    };

    // Check enemies at the middle of the swing
    this.scene.time.delayedCall(100, checkEnemies);

    // Visual feedback for player
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true
    });
  }
}

