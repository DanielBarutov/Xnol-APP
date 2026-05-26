import { api } from '../client'
import type { CategoryResponse, CreateCategoryRequest } from '../types'

export const categoriesApi = {
  list: () => api.get<CategoryResponse[]>('/api/v1/categories').then(r => r.data),
  create: (data: CreateCategoryRequest) => api.post<CategoryResponse>('/api/v1/categories', data).then(r => r.data),
}
