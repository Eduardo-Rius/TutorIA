export interface Room {
  roomId: string;
  name: string;
  minAgeMonths: number;
  maxAgeMonths: number;
}

export class RoomCatalog {
  private static rooms: Room[] = [
    {
      roomId: 'lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18
    }
  ];

  public static getRoom(roomId: string): Room | undefined {
    return this.rooms.find(r => r.roomId === roomId);
  }

  public static getAllRooms(): Room[] {
    return [...this.rooms];
  }
}
