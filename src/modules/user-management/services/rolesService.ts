import api from '../../users/redux/instance';

export const rolesService = {
  listRoles: (
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

    return api.get(`/roles/?${query.toString()}`);
  },

  getRoles: () =>
    api.get('/roles'),

  getRoleById: (id: number) =>
    api.get(`/roles/${id}`),

  createRole: (payload: any) =>
    api.post('/roles/create', payload),

  updateRole: (id: number, payload: any) =>
    api.put(`/roles/${id}`, payload),

  deleteRole: (id: number) =>
    api.delete(`/roles/${id}`),

  getRolePermissions: (id: number) =>
    api.get(`/roles/${id}/permissions`),

  assignRolePermissions: (
    id: number,
    permission_ids: number[],
  ) =>
    api.post(`/roles/${id}/permissions`, {
      permission_ids,
    }),
};