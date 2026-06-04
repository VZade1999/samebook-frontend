import { StorageService } from "@/storage";

export const useAccess = () => {
  const storageService : any = new StorageService();
  const permissions: string[]  = storageService
    .getItem(StorageService.STORAGE_KEYS.PERMISSIONS)
    .split(",");
  const can = (permission: string) => {
    return permissions?.includes(permission);
  };

  const canAny = (permissionList: string[]) => {
    return permissionList.some((permission) =>
      permissions.includes(permission)
    );
  };

  const canAll = (permissionList: string[]) => {
    return permissionList.every((permission) =>
      permissions.includes(permission)
    );
  };

  return {
    can,
    canAny,
    canAll,
  };
};
