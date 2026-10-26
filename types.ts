
export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  rates: string;
  totalSpaces: number;
  availableSpaces: number;
  mapUrl?: string;
  lastUpdated: Date;
  dataTime?: Date | null; // 北市府資料本身的時間（UPDATETIME）
  isFull: boolean;
  isPinned?: boolean;
  occupancyHistory: { time: string; occupied: number }[];
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  rates: string;
  mapUrl: string;
  capacity: number;
  isPinned?: boolean;
}

export enum LoadingState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
