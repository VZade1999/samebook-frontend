import { StorageService } from "@/storage";

export const useAccess = () => {
  const storageService : any = new StorageService();
  const permissions: string[]  = storageService
    .getItem(StorageService.STORAGE_KEYS.PERMISSIONS)
    .split(",");
  const can = (permission: string) => {
    console.log("Checking permission:", permission, "Available permissions:", permissions);
    return permissions?.includes(permission);
  };

  const canAny = (permissionList: string[]) => {
    console.log("Checking any of permissions:", permissionList, "Available permissions:", permissions);
    return permissionList.some((permission) =>
      permissions.includes(permission)
    );
  };

  const canAll = (permissionList: string[]) => {
    console.log("Checking all permissions:", permissionList, "Available permissions:", permissions);
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
