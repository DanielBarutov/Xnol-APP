export type Currency = 'RUB' | 'USD' | 'EUR'
export type TransactionType = 'income' | 'expense'
export type StatPeriod = 'this_month' | 'prev_month' | 'this_year' | 'day'
export interface CustomRange { date_from: string; date_to: string }

// Auth
export interface TokenResponse { access_token: string; refresh_token: string }
export interface UserResponse { id: string; email: string; full_name: string; primary_currency: Currency; is_active: boolean }
export interface RegisterRequest { email: string; password: string; full_name: string; primary_currency: Currency }
export interface LoginRequest { email: string; password: string }

// Categories
export interface CategoryResponse { id: string; user_id: string | null; parent_id: string | null; name: string; type: string; icon: string; color: string; is_system: boolean; children: CategoryResponse[] }
export interface CreateCategoryRequest { name: string; type: string; icon: string; color: string; parent_id?: string }
export interface UpdateCategoryRequest { name?: string; icon?: string; color?: string }

// Accounts
export interface AccountResponse { id: string; user_id: string; name: string; bank_name: string; balance: string; currency: Currency; created_at: string; is_deleted?: boolean }
export interface CreateAccountRequest { id?: string; name: string; bank_name: string; currency: Currency; balance: string }

// Deposits
export interface DepositResponse { id: string; user_id: string; name: string; bank_name: string; amount: string; interest_rate: string; interest_type: 'simple' | 'compound'; open_date: string; close_date: string; currency: Currency; auto_renew: boolean; early_closure_rate: string | null; balance: string; status: string; created_at: string }
export interface CreateDepositRequest { name: string; bank_name: string; amount: string; interest_rate: string; interest_type: 'simple' | 'compound'; open_date: string; close_date: string; currency: Currency; auto_renew: boolean; early_closure_rate?: string }
export interface UpdateDepositRequest { name?: string; bank_name?: string; amount?: string; interest_rate?: string; interest_type?: 'simple' | 'compound'; open_date?: string; close_date?: string; auto_renew?: boolean; balance?: string }

// Transactions
export interface TransactionResponse { id: string; user_id: string; account_id: string; category_id: string; type: TransactionType; amount: string; date: string; description: string | null; created_at: string }
export interface CreateTransactionRequest { account_id: string; category_id: string; type: TransactionType; amount: string; date: string; description?: string }

// Transfers
export type SourceDestType = 'savings_account' | 'deposit' | 'external'
export interface TransferResponse { id: string; user_id: string; source_type: SourceDestType; source_id: string | null; source_label: string | null; dest_type: SourceDestType; dest_id: string | null; dest_label: string | null; amount: string; currency: Currency; date: string; description: string | null; created_at: string }
export interface CreateTransferRequest { source_type: SourceDestType; source_id?: string; source_label?: string; dest_type: SourceDestType; dest_id?: string; dest_label?: string; amount: string; currency: Currency; date: string; description?: string }

// Stats
export interface CategoryStatResponse { category_id: string; category_name: string; amount: string }
export interface CategoryStatsResponse { date_from: string; date_to: string; total_income: string; total_expense: string; net: string; income_by_category: CategoryStatResponse[]; expense_by_category: CategoryStatResponse[] }
export interface TimelinePeriodResponse { period: string; income: string; expense: string; net: string }
export interface TimelineResponse { date_from: string; date_to: string; granularity: 'month' | 'day'; periods: TimelinePeriodResponse[] }
export interface AccountStatResponse { account_id: string; account_name: string; income: string; expense: string; net: string }
export interface AccountStatsResponse { date_from: string; date_to: string; accounts: AccountStatResponse[] }

// Theme
export interface ThemeResponse { theme_mode: string; theme_color: string }
export interface ThemePatchRequest { theme_mode?: string; theme_color?: string }
