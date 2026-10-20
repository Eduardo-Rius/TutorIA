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
    },
    {
      roomId: 'room-lactantes-a',
      name: 'Lactantes A',
      minAgeMonths: 0,
      maxAgeMonths: 6
    },
    {
      roomId: 'room-lactantes-b',
      name: 'Lactantes B',
      minAgeMonths: 7,
      maxAgeMonths: 12
    }
  ];

  public static getRoom(roomId: string): Room | undefined {
    if (roomId === 'room-lactantes-c') {
      return {
        roomId: 'room-lactantes-c',
        name: 'Lactantes C',
        minAgeMonths: 13,
        maxAgeMonths: 18,
      };
    }
    return this.rooms.find(r => r.roomId === roomId);
  }

  public static getAllRooms(): Room[] {
    return [...this.rooms];
  }
}
