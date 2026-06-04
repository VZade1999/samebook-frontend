export class StorageService {
  setItem = (key:any, value:any) => {
    sessionStorage.setItem(key, value);
  };

  removeItem = (key:any) => {
    sessionStorage.removeItem(key);
  };

  removeAllItems = () => {
    sessionStorage.clear();
  };

  getItem = (key:any) => {
    return sessionStorage.getItem(key);
  };

  static STORAGE_KEYS = {
    TOKEN: "token",
    PERMISSIONS: "permissions",
    COMPANY_DETAILS: "company_details"
  };
}
