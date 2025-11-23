import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { WeaponType } from '../scenes/WeaponSelectionScene';
import { ParticleEffects } from '../effects/ParticleEffects';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private health: number = 100;
  private maxHealth: number = 100;
  private attackDamage: number = 25;
  private attackRange: number = 60;
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 500; // milliseconds
  private weaponType: WeaponType;
  private weaponVisual!: Phaser.GameObjects.Container | Phaser.GameObjects.Graphics;
  private isAttacking: boolean = false;
  private lastDirection: { x: number; y: number } = { x: 0, y: 1 }; // Default: down
  private arrows: Phaser.GameObjects.Arc[] = [];
  private magicProjectiles: Phaser.GameObjects.Arc[] = [];
  private particleEffects!: ParticleEffects;

  constructor(scene: Phaser.Scene, x: number, y: number, weaponType: WeaponType = 'sword') {
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
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    body.setCollideWorldBounds(true);

    this.weaponType = weaponType;
    this.particleEffects = new ParticleEffects(scene);
    this.particleEffects.createParticleTexture();
    this.setupWeapon();
  }

  private setupWeapon() {
    // Set weapon properties based on type
    switch (this.weaponType) {
      case 'sword':
        this.attackDamage = 30;
        this.attackRange = 60;
        this.attackCooldownTime = 400;
        this.createSword();
        break;
      case 'bow':
        this.attackDamage = 25;
        this.attackRange = 300;
        this.attackCooldownTime = 300; // Schnellere Feuerrate für Bogen
        this.createBow();
        break;
      case 'magic':
        this.attackDamage = 40;
        this.attackRange = 200;
        this.attackCooldownTime = 1000; // Langsamere Feuerrate für Magie (wegen Flächenschaden)
        this.createMagicStaff();
        break;
    }
  }

  private createSword() {
    const swordLength = 24;
    const bladeWidth = 5;
    
    const swordBlade = this.scene.add.rectangle(0, -swordLength / 2, bladeWidth, swordLength, 0xcccccc);
    const swordHilt = this.scene.add.rectangle(0, swordLength / 2 - 2, 3, 4, 0x8b4513);
    
    this.weaponVisual = this.scene.add.container(0, 0, [swordBlade, swordHilt]);
    this.weaponVisual.setDepth(1);
    this.updateWeaponPosition();
  }

  private createBow() {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0x8b4513);
    graphics.beginPath();
    graphics.arc(0, 0, 12, 0, Math.PI);
    graphics.strokePath();
    
    this.weaponVisual = graphics;
    this.weaponVisual.setDepth(1);
    this.updateWeaponPosition();
  }

  private createMagicStaff() {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x9b59b6);
    graphics.fillRect(-2, -8, 4, 16);
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(0, -10, 6);
    
    this.weaponVisual = graphics;
    this.weaponVisual.setDepth(1);
    this.updateWeaponPosition();
  }

  private updateWeaponPosition() {
    if (!this.weaponVisual) return;

    const offset = 14;
    const angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    const weaponX = this.x + Math.cos(angle) * offset;
    const weaponY = this.y + Math.sin(angle) * offset;

    this.weaponVisual.x = weaponX;
    this.weaponVisual.y = weaponY;
    
    if (this.weaponType === 'sword') {
      this.weaponVisual.rotation = angle;
    } else if (this.weaponType === 'bow') {
      this.weaponVisual.rotation = angle + Math.PI / 2;
    } else {
      this.weaponVisual.rotation = angle;
    }
  }

  setDirection(velocityX: number, velocityY: number) {
    if (velocityX !== 0 || velocityY !== 0) {
      this.lastDirection = { x: velocityX, y: velocityY };
      this.updateWeaponPosition();
    }
  }

  update() {
    // Update weapon position to follow player
    this.updateWeaponPosition();
    
    // Update projectiles
    this.updateProjectiles();
  }

  private updateProjectiles() {
    // Clean up destroyed arrows
    this.arrows = this.arrows.filter(arrow => {
      if (arrow.active) {
        return true;
      }
      arrow.destroy();
      return false;
    });

    // Clean up destroyed magic projectiles
    this.magicProjectiles = this.magicProjectiles.filter(proj => {
      if (proj.active) {
        return true;
      }
      proj.destroy();
      return false;
    });
  }

  destroy() {
    // Clean up weapon when player is destroyed
    if (this.weaponVisual) {
      this.weaponVisual.destroy();
    }
    this.arrows.forEach(arrow => arrow.destroy());
    this.magicProjectiles.forEach(proj => proj.destroy());
    if (this.particleEffects) {
      this.particleEffects.destroy();
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

  attack(enemies: Enemy[], targetX?: number, targetY?: number) {
    const now = Date.now();
    if (now - this.attackCooldown < this.attackCooldownTime) {
      return; // Still on cooldown
    }

    this.attackCooldown = now;
    this.isAttacking = true;

    switch (this.weaponType) {
      case 'sword':
        this.attackWithSword(enemies);
        break;
      case 'bow':
        this.attackWithBow(enemies, targetX, targetY);
        break;
      case 'magic':
        this.attackWithMagic(enemies, targetX, targetY);
        break;
    }
  }

  private attackWithSword(enemies: Enemy[]) {
    const angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    const attackStartAngle = angle - Math.PI / 2;
    const attackEndAngle = angle + Math.PI / 2;

    // Sword swing animation
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 200,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        if (progress !== null) {
          const currentAngle = attackStartAngle + (attackEndAngle - attackStartAngle) * progress;
          this.lastDirection = { x: Math.cos(currentAngle), y: Math.sin(currentAngle) };
          this.updateWeaponPosition();
        }
      },
      onComplete: () => {
        this.isAttacking = false;
        this.updateWeaponPosition();
      }
    });

    const checkEnemies = () => {
      enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (distance <= this.attackRange) {
          enemy.takeDamage(1000);
          // Particle effect on hit
          this.particleEffects.hit(enemy.x, enemy.y);
          // Sword swing particles
          const hitAngle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
          this.particleEffects.swordSwing(enemy.x, enemy.y, hitAngle);
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

    this.scene.time.delayedCall(100, checkEnemies);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true
    });
  }

  private attackWithBow(enemies: Enemy[], targetX?: number, targetY?: number) {
    // Bogen schießt immer zur Mausposition, wenn verfügbar
    let angle: number;
    if (targetX !== undefined && targetY !== undefined) {
      angle = Math.atan2(targetY - this.y, targetX - this.x);
    } else {
      // Fallback auf Bewegungsrichtung
      angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    }

    // Update direction for bow
    this.lastDirection = { x: Math.cos(angle), y: Math.sin(angle) };
    this.updateWeaponPosition();

    // Create arrow
    const arrow = this.scene.add.circle(this.x, this.y, 4, 0x8b4513);
    arrow.setDepth(2);
    this.scene.physics.add.existing(arrow);
    const arrowBody = arrow.body as Phaser.Physics.Arcade.Body;
    arrowBody.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
    this.arrows.push(arrow);

    // Arrow collision with enemies
    const checkArrowCollision = () => {
      if (!arrow.active) return;
      
      enemies.forEach(enemy => {
        if (!enemy.active) return;
        
        const distance = Phaser.Math.Distance.Between(
          arrow.x, arrow.y,
          enemy.x, enemy.y
        );
        
        if (distance < 15) {
          enemy.takeDamage(1000);
          // Hit particle effect
          this.particleEffects.hit(enemy.x, enemy.y);
          arrow.destroy();
          arrow.setActive(false);
          return;
        }
      });
    };

    const arrowUpdate = this.scene.time.addEvent({
      delay: 16,
      callback: checkArrowCollision,
      repeat: -1
    });

    // Remove arrow after travel distance
    this.scene.time.delayedCall(this.attackRange / 400 * 1000, () => {
      arrowUpdate.destroy();
      if (arrow.active) {
        arrow.destroy();
        arrow.setActive(false);
      }
    });

    this.isAttacking = false;
  }

  private attackWithMagic(enemies: Enemy[], targetX?: number, targetY?: number) {
    // Magie schießt immer zur Mausposition, wenn verfügbar
    let angle: number;
    let impactX: number;
    let impactY: number;
    
    if (targetX !== undefined && targetY !== undefined) {
      angle = Math.atan2(targetY - this.y, targetX - this.x);
      // Berechne Einschlagpunkt basierend auf Reichweite
      const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const travelDistance = Math.min(distance, this.attackRange);
      impactX = this.x + Math.cos(angle) * travelDistance;
      impactY = this.y + Math.sin(angle) * travelDistance;
    } else {
      // Fallback auf Bewegungsrichtung
      angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
      impactX = this.x + Math.cos(angle) * this.attackRange;
      impactY = this.y + Math.sin(angle) * this.attackRange;
    }

    // Update direction for magic staff
    this.lastDirection = { x: Math.cos(angle), y: Math.sin(angle) };
    this.updateWeaponPosition();

    // Create magic projectile with glow
    const projectile = this.scene.add.circle(this.x, this.y, 8, 0x9b59b6);
    projectile.setDepth(2);
    
    // Add glow effect using shader-like approach
    const glow = this.scene.add.circle(this.x, this.y, 12, 0x9b59b6, 0.5);
    glow.setDepth(1);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Particle trail
    this.particleEffects.magicGlow(this.x, this.y);
    
    this.scene.physics.add.existing(projectile);
    const projBody = projectile.body as Phaser.Physics.Arcade.Body;
    projBody.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    this.magicProjectiles.push(projectile);

    // Glow effect with glow following
    this.scene.tweens.add({
      targets: projectile,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      yoyo: true,
      repeat: -1
    });
    
    // Update glow position
    const updateGlow = () => {
      if (projectile.active) {
        glow.x = projectile.x;
        glow.y = projectile.y;
        this.scene.time.delayedCall(16, updateGlow);
      } else {
        glow.destroy();
      }
    };
    updateGlow();

    // Magic projectile collision with enemies and walls
    const checkMagicCollision = () => {
      if (!projectile.active) return;
      
      // Check if projectile reached target or hit something
      const distanceToTarget = Phaser.Math.Distance.Between(
        projectile.x, projectile.y,
        impactX, impactY
      );
      
      // Check collision with enemies
      let hitEnemy = false;
      enemies.forEach(enemy => {
        if (!enemy.active) return;
        
        const distance = Phaser.Math.Distance.Between(
          projectile.x, projectile.y,
          enemy.x, enemy.y
        );
        
        if (distance < 20) {
          hitEnemy = true;
        }
      });
      
      // Explode if hit enemy or reached target
      if (hitEnemy || distanceToTarget < 10) {
        const explosionX = projectile.x;
        const explosionY = projectile.y;
        const explosionRadius = 60; // Flächenschaden-Radius
        
        // Flächenschaden: Alle Feinde im Radius
        enemies.forEach(enemy => {
          if (!enemy.active) return;
          
          const distance = Phaser.Math.Distance.Between(
            explosionX, explosionY,
            enemy.x, enemy.y
          );
          
          if (distance <= explosionRadius) {
            enemy.takeDamage(1000);
            // Hit particle effect
            this.particleEffects.hit(enemy.x, enemy.y);
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
        
        // Explosion particle effect
        this.particleEffects.explode(explosionX, explosionY, explosionRadius);
        
        // Explosion visual effect
        const explosion = this.scene.add.circle(explosionX, explosionY, explosionRadius, 0xff00ff, 0.3);
        explosion.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: explosion,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 400,
          onComplete: () => explosion.destroy()
        });
        
        // Inner explosion circle
        const innerExplosion = this.scene.add.circle(explosionX, explosionY, 20, 0xffffff, 0.8);
        innerExplosion.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: innerExplosion,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => innerExplosion.destroy()
        });
        
        projectile.destroy();
        projectile.setActive(false);
        return;
      }
    };

    const magicUpdate = this.scene.time.addEvent({
      delay: 16,
      callback: checkMagicCollision,
      repeat: -1
    });

    // Remove projectile after travel distance or when it reaches target
    const travelTime = Phaser.Math.Distance.Between(this.x, this.y, impactX, impactY) / 300 * 1000;
    this.scene.time.delayedCall(travelTime + 100, () => {
      magicUpdate.destroy();
      if (projectile.active) {
        // Explode at target location if still active
        const explosionRadius = 60;
        enemies.forEach(enemy => {
          if (!enemy.active) return;
          
          const distance = Phaser.Math.Distance.Between(
            impactX, impactY,
            enemy.x, enemy.y
          );
          
          if (distance <= explosionRadius) {
            enemy.takeDamage(1000);
            this.particleEffects.hit(enemy.x, enemy.y);
          }
        });
        
        // Explosion particle effect
        this.particleEffects.explode(impactX, impactY, explosionRadius);
        
        // Explosion effect
        const explosion = this.scene.add.circle(impactX, impactY, explosionRadius, 0xff00ff, 0.3);
        explosion.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: explosion,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 400,
          onComplete: () => explosion.destroy()
        });
        
        projectile.destroy();
        projectile.setActive(false);
      }
    });

    this.isAttacking = false;
  }
}

