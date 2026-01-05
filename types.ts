
export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  rates: string;
  totalSpaces: number;
  availableSpaces: number;
  mapUrl?: string;
  lastUpdated: Date;
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
