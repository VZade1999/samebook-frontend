import api from '../../users/redux/instance';

export const permissionsService = {
  listPermissions: (
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search) {
      query.set('search', search);
    }

    return api.get(
      `/permissions/list?${query.toString()}`,
    );
  },

  getPermissions: () =>
    api.get('/permissions'),

  getPermissionById: (
    id: number,
  ) =>
    api.get(`/permissions/${id}`),

  createPermission: (
    payload: any,
  ) =>
    api.post(
      '/permissions/create',
      payload,
    ),

  updatePermission: (
    id: number,
    payload: any,
  ) =>
    api.put(
      `/permissions/${id}`,
      payload,
    ),

  deletePermission: (
    id: number,
  ) =>
    api.delete(
      `/permissions/${id}`,
    ),
};