import Phaser from 'phaser';

export class ParticleEffects {
  private scene: Phaser.Scene;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private magicGlowEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private deathEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private swordSwingEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createEmitters();
  }

  private createEmitters() {
    // Explosion particles (for magic)
    this.explosionEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      tint: [0xff00ff, 0x9b59b6, 0xffffff],
      blendMode: 'ADD',
      emitting: false
    });

    // Hit particles (for sword and bow)
    this.hitEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 30, max: 100 },
      scale: { start: 0.3, end: 0 },
      lifespan: 300,
      tint: [0xffff00, 0xff4444, 0xffffff],
      blendMode: 'ADD',
      emitting: false
    });

    // Magic glow particles
    this.magicGlowEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.2, end: 0 },
      lifespan: 400,
      tint: [0x9b59b6, 0xffffff],
      blendMode: 'ADD',
      emitting: false
    });

    // Death particles
    this.deathEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 40, max: 150 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      tint: [0xff0000, 0x8b0000, 0x000000],
      blendMode: 'NORMAL',
      emitting: false
    });

    // Sword swing particles
    this.swordSwingEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 20, max: 80 },
      scale: { start: 0.2, end: 0 },
      lifespan: 200,
      tint: [0xcccccc, 0xffffff, 0xffff00],
      blendMode: 'ADD',
      emitting: false
    });
  }

  createParticleTexture() {
    if (!this.scene.textures.exists('particle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(0, 0, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }
  }

  explode(x: number, y: number, radius: number = 60) {
    this.explosionEmitter.setPosition(x, y);
    this.explosionEmitter.explode(30);
    
    // Create expanding circle effect
    const circle = this.scene.add.circle(x, y, 5, 0xff00ff, 0.8);
    circle.setDepth(3);
    this.scene.tweens.add({
      targets: circle,
      radius: radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy()
    });
  }

  hit(x: number, y: number) {
    this.hitEmitter.setPosition(x, y);
    this.hitEmitter.explode(15);
  }

  magicGlow(x: number, y: number) {
    this.magicGlowEmitter.setPosition(x, y);
    this.magicGlowEmitter.start();
    
    this.scene.time.delayedCall(400, () => {
      this.magicGlowEmitter.stop();
    });
  }

  enemyDeath(x: number, y: number) {
    this.deathEmitter.setPosition(x, y);
    this.deathEmitter.explode(20);
  }

  swordSwing(x: number, y: number, angle: number) {
    this.swordSwingEmitter.setPosition(x, y);
    this.swordSwingEmitter.setAngle({ min: angle - 45, max: angle + 45 });
    this.swordSwingEmitter.explode(10);
  }

  destroy() {
    this.explosionEmitter.destroy();
    this.hitEmitter.destroy();
    this.magicGlowEmitter.destroy();
    this.deathEmitter.destroy();
    this.swordSwingEmitter.destroy();
  }
}

