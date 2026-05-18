import { EPermission } from '../../enum/EPermission.enum';

export interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  listPermission: EPermission[];
}
