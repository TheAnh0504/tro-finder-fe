// --- Enums ---
export enum EContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum EContractType {
  LEASE = 'LEASE',
  DEPOSIT = 'DEPOSIT',
  TEMP_RESIDENCE = 'TEMP_RESIDENCE',
  TEMP_ABSENCE = 'TEMP_ABSENCE',
}

export enum EPaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  OVERDUE = 'OVERDUE',
}

// --- DTOs ---
export interface RoomPaymentDTO {
  id: string;
  contractId: string;
  paymentYear: number;
  paymentMonth: number;
  amount: number;
  status: string; // EPaymentStatus
  notifiedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface ContractTenantDTO {
  id: string;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface ContractRoomDTO {
  id: string;
  houseSet: {
    id: string;
    name: string;
    address: string;
    province?: { name: string };
    commune?: { name: string };
  };
  name: string;
  describeRoom: string;
  area: number;
  priceRoom: number;
  priceElectricity: number;
  priceWater: number;
  priceGeneralCleaning: number;
  priceGeneralElectricity: number;
  priceInternet: number;
  priceWashingMachine: number;
  hasRent: boolean;
  listImage: string;
}

export interface ContractDTO {
  id: string;
  tenant: ContractTenantDTO;
  room: ContractRoomDTO;
  contractType: string; // EContractType
  beginTime: string;
  endTime: string;
  depositAmount: number;
  status: string; // EContractStatus
  notifyChannel: string;
  file: string;
  documentContent: string;
  ocrData: string;
  payment: RoomPaymentDTO[];
}
