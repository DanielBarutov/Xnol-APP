import { api } from '../client'
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../types'

export const categoriesApi = {
  list: () => api.get<CategoryResponse[]>('/api/v1/categories').then(r => r.data),
  create: (data: CreateCategoryRequest) => api.post<CategoryResponse>('/api/v1/categories', data).then(r => r.data),
  update: (id: string, data: UpdateCategoryRequest) => api.put<CategoryResponse>(`/api/v1/categories/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/categories/${id}`),
}
