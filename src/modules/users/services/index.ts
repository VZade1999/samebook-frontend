import api from '../redux/instance';

export const usersService = {
  listUsers: (
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

    return api.get(`/users/list?${query.toString()}`);
  },

  createUser: (payload: any) =>
    api.post('/users/create', payload),

  updateUser: (id: number, payload: any) =>
    api.put(`/users/${id}`, payload),

  deleteUser: (id: number) =>
    api.delete(`/users/${id}`),

  getUserById: (id: number) =>
    api.get(`/users/${id}`),

  getRoles: () =>
    api.get('/users/roles'),
};
