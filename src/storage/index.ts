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

  setLocalItem = (key:any, value:any) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  };

  getLocalItem = (key:any) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };

  static STORAGE_KEYS = {
    TOKEN: "token",
    PERMISSIONS: "permissions",
    COMPANY_DETAILS: "company_details",
    USER_DETAILS: "user_details"
  };
}
