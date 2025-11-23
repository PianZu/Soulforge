export class DungeonGenerator {
  private width: number;
  private height: number;
  private dungeon: number[][] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  generate(): number[][] {
    // Initialize with walls
    this.dungeon = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(0));

    // Generate rooms
    const rooms: Room[] = [];
    const numRooms = 10 + Math.floor(Math.random() * 10);

    for (let i = 0; i < numRooms; i++) {
      const roomWidth = 5 + Math.floor(Math.random() * 8);
      const roomHeight = 5 + Math.floor(Math.random() * 8);
      const x = 1 + Math.floor(Math.random() * (this.width - roomWidth - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - roomHeight - 2));

      const room = new Room(x, y, roomWidth, roomHeight);

      // Check if room overlaps with existing rooms
      let overlaps = false;
      for (const existingRoom of rooms) {
        if (
          room.x < existingRoom.x + existingRoom.width + 1 &&
          room.x + room.width + 1 > existingRoom.x &&
          room.y < existingRoom.y + existingRoom.height + 1 &&
          room.y + room.height + 1 > existingRoom.y
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push(room);
        this.carveRoom(room);
      }
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
      const prevRoom = rooms[i - 1];
      const currRoom = rooms[i];

      const prevCenter = prevRoom.getCenter();
      const currCenter = currRoom.getCenter();

      // Horizontal corridor
      if (Math.random() < 0.5) {
        this.carveHorizontalTunnel(prevCenter.x, currCenter.x, prevCenter.y);
        this.carveVerticalTunnel(prevCenter.y, currCenter.y, currCenter.x);
      } else {
        // Vertical corridor
        this.carveVerticalTunnel(prevCenter.y, currCenter.y, prevCenter.x);
        this.carveHorizontalTunnel(prevCenter.x, currCenter.x, currCenter.y);
      }
    }

    return this.dungeon;
  }

  private carveRoom(room: Room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.dungeon[y][x] = 1; // Floor
        }
      }
    }
  }

  private carveHorizontalTunnel(x1: number, x2: number, y: number) {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);

    for (let x = start; x <= end; x++) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.dungeon[y][x] = 1; // Floor
      }
    }
  }

  private carveVerticalTunnel(y1: number, y2: number, x: number) {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);

    for (let y = start; y <= end; y++) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.dungeon[y][x] = 1; // Floor
      }
    }
  }

  getDungeon(): number[][] {
    return this.dungeon;
  }
}

class Room {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  getCenter(): { x: number; y: number } {
    return {
      x: Math.floor(this.x + this.width / 2),
      y: Math.floor(this.y + this.height / 2)
    };
  }
}

