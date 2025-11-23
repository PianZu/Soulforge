import Phaser from 'phaser';

// Define WeaponType locally to avoid runtime import issues
export type WeaponType = 'sword' | 'bow' | 'magic';

export class WeaponSelectionScene extends Phaser.Scene {
  private selectedWeapon: WeaponType | null = null;

  constructor() {
    super({ key: 'WeaponSelectionScene' });
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Title
    const title = this.add.text(centerX, 100, 'Wähle deine Waffe', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    // Weapon options
    const weapons = [
      { type: 'sword' as WeaponType, name: 'Schwert', description: 'Nahkampf, schneller Angriff', color: 0xcccccc },
      { type: 'bow' as WeaponType, name: 'Bogen', description: 'Fernkampf, präzise Schüsse', color: 0x8b4513 },
      { type: 'magic' as WeaponType, name: 'Magie', description: 'Zauber, großer Schaden', color: 0x9b59b6 }
    ];

    const buttonWidth = 300;
    const buttonHeight = 150;
    const spacing = 50;
    const startX = centerX - (weapons.length * (buttonWidth + spacing)) / 2 + buttonWidth / 2;

    weapons.forEach((weapon, index) => {
      const x = startX + index * (buttonWidth + spacing);
      const y = centerY;

      // Button background
      const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, weapon.color, 0.7);
      button.setStrokeStyle(3, 0xffffff, 1);
      button.setInteractive({ useHandCursor: true });

      // Weapon name
      const nameText = this.add.text(x, y - 40, weapon.name, {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      });
      nameText.setOrigin(0.5);

      // Description
      const descText = this.add.text(x, y + 20, weapon.description, {
        fontSize: '18px',
        color: '#cccccc',
        fontFamily: 'Arial',
        align: 'center'
      });
      descText.setOrigin(0.5);

      // Visual representation
      let visual: Phaser.GameObjects.Graphics | null = null;
      if (weapon.type === 'sword') {
        // Draw sword
        const graphics = this.add.graphics();
        graphics.fillStyle(0xcccccc);
        graphics.fillRect(x - 20, y - 60, 5, 30);
        graphics.fillStyle(0x8b4513);
        graphics.fillRect(x - 18, y - 30, 3, 8);
        visual = graphics;
      } else if (weapon.type === 'bow') {
        // Draw bow
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x8b4513);
        graphics.beginPath();
        graphics.arc(x, y - 50, 15, 0, Math.PI);
        graphics.strokePath();
        visual = graphics;
      } else {
        // Draw magic orb
        const graphics = this.add.graphics();
        graphics.fillStyle(0x9b59b6);
        graphics.fillCircle(x, y - 50, 12);
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(x, y - 50, 6);
        visual = graphics;
      }

      // Hover effects
      button.on('pointerover', () => {
        button.setFillStyle(weapon.color, 1);
        button.setScale(1.1);
        nameText.setScale(1.1);
        descText.setScale(1.1);
        if (visual) {
          visual.setScale(1.1);
        }
      });

      button.on('pointerout', () => {
        button.setFillStyle(weapon.color, 0.7);
        button.setScale(1);
        nameText.setScale(1);
        descText.setScale(1);
        if (visual) {
          visual.setScale(1);
        }
      });

      // Click handler
      button.on('pointerdown', () => {
        this.selectedWeapon = weapon.type;
        this.startGame();
      });
    });

    // Instructions
    const instructionText = this.add.text(centerX, this.cameras.main.height - 50, 'Klicke auf eine Waffe, um zu beginnen', {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'Arial'
    });
    instructionText.setOrigin(0.5);
  }

  private startGame() {
    if (this.selectedWeapon) {
      // Pass selected weapon to GameScene
      this.scene.start('GameScene', { weaponType: this.selectedWeapon });
    }
  }
}

