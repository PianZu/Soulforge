import Phaser from 'phaser';
import { Player } from './Player';

export type EnemyVariant = 'grunt' | 'ranged';

type EnemyOptions = {
  variant?: EnemyVariant;
  projectileGroup?: Phaser.Physics.Arcade.Group;
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private variant: EnemyVariant;
  private projectileGroup?: Phaser.Physics.Arcade.Group;
  private health: number;
  private speed: number;
  private attackDamage: number;
  private attackCooldown: number = 0;
  private attackCooldownTime: number;
  private preferredDistance: number;
  private rangedDamage: number;
  private lastShot: number = 0;
  private shotCooldown: number;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyOptions = {}) {
    const variant = options.variant ?? 'grunt';
    const texture = variant === 'ranged' ? 'enemy-ranged' : 'enemy';

    if (!scene.textures.exists('enemy')) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0xff4444);
      graphics.fillRect(0, 0, 20, 20);
      graphics.generateTexture('enemy', 20, 20);
      graphics.destroy();
    }

    if (!scene.textures.exists('enemy-ranged')) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0x9b59b6);
      graphics.fillRect(0, 0, 22, 22);
      graphics.lineStyle(2, 0xffffff, 0.9);
      graphics.strokeCircle(11, 11, 10);
      graphics.generateTexture('enemy-ranged', 22, 22);
      graphics.destroy();
    }

    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body!.setSize(18, 18);

    this.variant = variant;
    this.projectileGroup = options.projectileGroup;

    if (this.variant === 'ranged') {
      this.health = 35;
      this.speed = 70;
      this.attackDamage = 5;
      this.attackCooldownTime = 800;
      this.preferredDistance = 220;
      this.rangedDamage = 12;
      this.shotCooldown = 1500;
    } else {
      this.health = 30;
      this.speed = 80;
      this.attackDamage = 10;
      this.attackCooldownTime = 1000;
      this.preferredDistance = 0;
      this.rangedDamage = 0;
      this.shotCooldown = 0;
    }
  }

  update(player: Player) {
    if (this.isDead()) {
      return;
    }

    if (this.variant === 'ranged') {
      this.updateRangedBehavior(player);
    } else {
      this.updateMeleeBehavior(player);
    }
  }

  private updateMeleeBehavior(player: Player) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (distance > 5) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    } else {
      this.setVelocity(0, 0);
      const now = this.scene.time.now;
      if (now - this.attackCooldown >= this.attackCooldownTime) {
        this.attackCooldown = now;
        player.takeDamage(this.attackDamage);
      }
    }
  }

  private updateRangedBehavior(player: Player) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    let moveAngle = angle;

    if (distance < this.preferredDistance - 60) {
      moveAngle = angle + Math.PI; // retreat
    } else if (distance <= this.preferredDistance + 80) {
      const perpendicular = angle + Math.PI / 2;
      moveAngle = Math.random() > 0.5 ? perpendicular : perpendicular + Math.PI;
    }

    this.setVelocity(Math.cos(moveAngle) * this.speed, Math.sin(moveAngle) * this.speed);
    this.tryShoot(player);
  }

  private tryShoot(player: Player) {
    if (!this.projectileGroup) {
      return;
    }

    const now = this.scene.time.now;
    if (now - this.lastShot < this.shotCooldown) {
      return;
    }

    this.lastShot = now;

    const projectile = this.projectileGroup.get(
      this.x,
      this.y,
      'enemy-bullet'
    ) as Phaser.Physics.Arcade.Image | null;

    if (!projectile) {
      return;
    }

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.setPosition(this.x, this.y);
    projectile.setDepth(2);
    projectile.setData('damage', this.rangedDamage);
    projectile.setData('spawnTime', now);

    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setCircle(4);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.scene.physics.velocityFromRotation(angle, 240, body.velocity);
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
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

