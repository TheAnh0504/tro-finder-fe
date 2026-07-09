// --- Enums ---
export enum EContractStatus {
  DRAFT = 'DRAFT',
  PROPOSED_BY_TENANT = 'PROPOSED_BY_TENANT',
  PROPOSED_BY_HOST = 'PROPOSED_BY_HOST',
  COUNTERPARTY_CONFIRMED = 'COUNTERPARTY_CONFIRMED',
  TENANT_SIGNED = 'TENANT_SIGNED',
  HOST_SIGNED = 'HOST_SIGNED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
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
  electricityUnits?: number | null;
  waterUnits?: number | null;
  occupantCount?: number | null;
  rentAmount?: number | null;
  electricityAmount?: number | null;
  waterAmount?: number | null;
  internetAmount?: number | null;
  washingMachineAmount?: number | null;
  generalCleaningAmount?: number | null;
  generalElectricityAmount?: number | null;
  filledBy?: string | null;
  filledByRole?: string | null;
}

export interface PaymentBreakdownInput {
  electricityUnits: number;
  waterUnits: number;
  occupantCount: number;
}

export interface PaymentBreakdownResult {
  rentAmount: number;
  electricityAmount: number;
  waterAmount: number;
  internetAmount: number;
  washingMachineAmount: number;
  generalCleaningAmount: number;
  generalElectricityAmount: number;
  totalAmount: number;
  waterPerPerson: boolean;
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
    owner?: {
      id: string;
      username: string;
      name: string;
      email: string;
      phoneNumber: string;
      paymentQrImage?: string;
      paymentQrImageShow?: string;
    };
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
  createdByRole: string;
  terms: string;
  confirmedByTenant: boolean;
  confirmedByHost: boolean;
  tenantSignedAt: string | null;
  hostSignedAt: string | null;
  unsignedPdfFile: string | null;
  signedPdfFile: string | null;
  tenantSignatureMeta: string | null;
  hostSignatureMeta: string | null;
  notifyChannel: string;
  file: string;
  documentContent: string;
  ocrData: string;
  payment: RoomPaymentDTO[];
}
