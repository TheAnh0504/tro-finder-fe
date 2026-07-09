export interface InfoUser {
  role: string;
  name: string;
  email: string;
  phoneNumber: string;
  urlImage: string;
  isOcr: boolean; // Trạng thái xác minh OCR
  isRent: boolean; // Trạng thái cho thuê
  searchPreferences?: string;
}
