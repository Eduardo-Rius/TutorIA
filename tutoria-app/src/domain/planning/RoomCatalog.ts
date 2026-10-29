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
    },
    {
      roomId: 'room-maternal-a',
      name: 'Maternal A',
      minAgeMonths: 19,
      maxAgeMonths: 24
    },
    {
      roomId: 'room-maternal-b1',
      name: 'Maternal B1',
      minAgeMonths: 25,
      maxAgeMonths: 30
    },
    {
      roomId: 'room-maternal-b2',
      name: 'Maternal B2',
      minAgeMonths: 31,
      maxAgeMonths: 36
    },
    {
      roomId: 'room-maternal-c1',
      name: 'Maternal C1',
      minAgeMonths: 37,
      maxAgeMonths: 42
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
    if (roomId === 'room-maternal-a' || roomId === 'maternal-a') {
      return {
        roomId: 'room-maternal-a',
        name: 'Maternal A',
        minAgeMonths: 19,
        maxAgeMonths: 24,
      };
    }
    if (roomId === 'room-maternal-b1' || roomId === 'maternal-b1') {
      return {
        roomId: 'room-maternal-b1',
        name: 'Maternal B1',
        minAgeMonths: 25,
        maxAgeMonths: 30,
      };
    }
    if (roomId === 'room-maternal-b2' || roomId === 'maternal-b2') {
      return {
        roomId: 'room-maternal-b2',
        name: 'Maternal B2',
        minAgeMonths: 31,
        maxAgeMonths: 36,
      };
    }
    if (roomId === 'room-maternal-c1' || roomId === 'maternal-c1') {
      return {
        roomId: 'room-maternal-c1',
        name: 'Maternal C1',
        minAgeMonths: 37,
        maxAgeMonths: 42,
      };
    }
    return this.rooms.find(r => r.roomId === roomId);
  }

  public static getAllRooms(): Room[] {
    return [...this.rooms];
  }
}
